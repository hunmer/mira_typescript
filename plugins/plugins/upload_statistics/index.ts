import { ServerPluginManager, MiraWebsocketServer, ServerPlugin } from 'mira-app-core';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraHttpServer } from 'mira-server/dist/server';
class UploadStatistics extends ServerPlugin {
    private readonly server: MiraWebsocketServer;
    private httpServer: MiraHttpServer;
    private dbService: ILibraryServerData;

    constructor({ pluginManager, server, dbService, httpServer }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer }) {
        super('upload_statistics', pluginManager, dbService);
        this.server = server;
        this.dbService = dbService;
        this.httpServer = httpServer;
        this.loadConfig({
            timerEnabled: false,
            reportTime: '20:00', // 每天定时报告
            reportLoop: -1, // 定时报告, -1则关闭
            reportDaysRange: 7, // 7天以内的数据
            maxDisplayUsers: 10, // 只显示前十
            reportApis: [
                {
                    method: 'POST',
                    url: 'YOUR_HOOK_URL', // 替换为实际的钉钉机器人Webhook地址
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: {
                        'msgtype': 'markdown',
                        'markdown': {},
                        openConversationId: 'YOUR_CONVERSATION_ID', // 替换为实际的会话ID
                        robotCode: 'YOUR_ROBOT_CODE' // 替换为实际的机器人Code
                    },
                }
            ],
        });

        // 如果启用了定时报告，设置定时器
        if (this.configs.timerEnabled) {
            let countdown = this.configs.reportLoop
            setInterval(() => {
                if (countdown != -1) {
                    if (--countdown == 0) {
                        this.generateAndSendReport()
                        countdown = this.configs.reportLoop
                    }
                }
                if (this.configs.reportTime != '') {
                    const now = new Date();
                    const [reportHour, reportMinute] = this.configs.reportTime.split(':').map(Number);
                    const reportDate = new Date();
                    reportDate.setHours(reportHour, reportMinute, 0, 0);

                    if (now == reportDate) {
                        return this.generateAndSendReport();
                    }
                }
            }, 1000)
        }
        console.log('upload_statistics plugin initialized');

        // 注册所需的字段
        pluginManager.registerFields([
            { action: 'create', type: 'file', field: 'username' },
        ]);

        const libraryId = dbService.getLibraryId();
        httpServer.httpRouter.registerRounter(libraryId, '/upload_statistics/send', 'get', async (req, res) => {
            this.generateAndSendReport()
            res.status(200).json({ message: 'Report sent successfully' });
        });

        // 获取所有统计接口
        httpServer.httpRouter.registerRounter(libraryId, '/upload_statistics/list', 'get', async (req, res) => {
            const { username, startDate, endDate } = req.query;
            console.log({ username, startDate, endDate });
            const filters: Record<string, any> = {};

            if (username) {
                filters.custom_fields = { uploader: username as string };
            }

            if (startDate && endDate) {
                filters.dateRange = {
                    start: new Date(startDate as string),
                    end: new Date(endDate as string)
                };
            }

            try {
                const { result } = await this.dbService.getFiles({ filters });
                res.status(200).json(result.map(file => ({
                    id: file.id,
                    name: file.name,
                    uploader: file.custom_fields?.uploader,
                    created_at: new Date(file.created_at).toISOString(),
                    size: file.size
                })));
            } catch (error) {
                res.status(500).json({ error: 'Failed to get upload statistics' });
            }
        });

        // 绑定文件创建事件

        const obj = httpServer.backend.libraries.get(dbService.getLibraryId());
        if (obj) {
            obj.eventManager.on('file::created', this.onAfterUploaded.bind(this));
        }
    }

    /**
     * 生成排行榜文本
     */
    private async generateRankingText(): Promise<string> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - this.configs.reportDaysRange);

        const { result } = await this.dbService.getFiles({
            filters: {
                dateRange: { start: startDate, end: endDate },
                custom_fields: { uploader: '!= null' }
            }
        });
        // 统计每个用户的上传数量
        const userStats: Record<string, number> = {};
        result.forEach(file => {
            const customFields = file.custom_fields ? JSON.parse(file.custom_fields) : {};
            const uploader = customFields.uploader || '未知用户';
            userStats[uploader] = (userStats[uploader] || 0) + 1;
        });

        // 排序并截取前N名
        const sortedUsers = Object.entries(userStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.configs.maxDisplayUsers);

        // 生成排行榜文本
        let rankingText = `## ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]} 素材上传排行榜\n\n`;
        sortedUsers.forEach(([user, count], index) => {
            rankingText += `### ${index + 1}. **${user}** - ${count}个  \n`;
        });
        return rankingText;
    }

    /**
     * 生成并发送报告
     */
    private async generateAndSendReport(): Promise<void> {
        try {
            const rankingText = await this.generateRankingText();
            // 遍历所有报告API并发送
            for (const api of this.configs.reportApis) {
                try {
                    const response = await this.httpServer.request({
                        method: api.method,
                        url: api.url,
                        headers: api.headers,
                        data: {
                            ...api.body,
                            markdown: JSON.stringify({ title: api.body.markdown.title, text: api.body.markdown.text.replace('{text}', rankingText) })
                        }
                    });
                } catch (error) {
                    console.error(`Failed to send report to ${api.path}:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
        }
    }

    // 用户上传事件处理函数
    private async onAfterUploaded(event: any): Promise<boolean> {
        const { message, ws, result } = event.args;
        const { libraryId, clientId, fields } = message;
        const { username } = fields;
        const newData = Object.assign(result, {
            custom_fields: JSON.stringify(Object.assign(result.custom_fields ? JSON.parse(result.custom_fields) : {}, { uploader: username }))
        });
        this.dbService.updateFile(result.id, newData);
        return true;
    }
}


export function init(inst: any): UploadStatistics {
    return new UploadStatistics(inst);
}
