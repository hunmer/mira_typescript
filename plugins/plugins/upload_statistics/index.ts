import { ServerPluginManager, MiraWebsocketServer, ServerPlugin } from 'mira-app-server';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraHttpServer } from 'mira-app-server/dist/server';

// 定义路由接口
interface PluginRouteDefinition {
    name: string;
    group: string;
    path: string;
    component: string;
    meta: {
        roles?: string[];
        icon?: string;
        title: string;
        order?: number;
    };
    builder?: () => string;
}

class UploadStatistics extends ServerPlugin {
    private readonly server: MiraWebsocketServer;
    private httpServer: MiraHttpServer;
    private dbService: ILibraryServerData;

    constructor({ pluginManager, server, dbService }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData }) {
        super('upload_statistics', pluginManager, dbService);
        this.server = server;
        this.dbService = dbService;
        const backend = pluginManager.server.backend;
        const httpServer = backend.getHttpServer();
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

        // 注册前端路由
        this.initializeRoutes();

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
                console.log({ result })
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

        const obj = httpServer.backend.libraries!.getLibrary(dbService.getLibraryId());
        if (obj) {
            obj.eventManager.on('file::created', this.onAfterUploaded.bind(this));
        }
    }

    /**
     * 初始化前端路由
     */
    private initializeRoutes() {
        // 上传统计主页面
        const statisticsRoute: PluginRouteDefinition = {
            name: 'UploadStatistics',
            group: "数据统计",
            path: '/statistics/upload',
            component: 'upload_statistics/upload_stats.js',
            meta: {
                roles: ['super', 'admin', 'user'], // 所有用户都可以查看
                icon: 'lucide--trending-up',
                title: '上传统计',
                order: 1
            },
            builder: () => {
                return this.generateStatisticsPage();
            }
        };

        // 详细数据页面
        const detailRoute: PluginRouteDefinition = {
            name: 'UploadDetails',
            group: "数据统计",
            path: '/statistics/upload/details',
            component: 'upload_statistics/upload_details.js',
            meta: {
                roles: ['super', 'admin'],
                icon: 'lucide--file-text',
                title: '上传详情',
                order: 2
            },
            builder: () => {
                return this.generateDetailsPage();
            }
        };

        this.registerRoutes([statisticsRoute, detailRoute]);
        console.log(`✅ Upload Statistics Plugin routes registered: ${this.getRoutes().length} routes`);
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

    /**
     * 生成统计页面 HTML
     */
    private generateStatisticsPage(): string {
        return `
            <div class="upload-statistics-page">
                <div class="page-header">
                    <h1>📊 素材上传统计</h1>
                    <p class="subtitle">查看素材库的上传趋势和统计数据</p>
                </div>

                <div class="stats-grid">
                    <!-- 统计卡片 -->
                    <div class="stat-card">
                        <div class="stat-icon">📁</div>
                        <div class="stat-content">
                            <h3>今日上传</h3>
                            <div class="stat-value" id="todayUploads">-</div>
                            <div class="stat-change positive">+12% 较昨日</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <h3>本周上传</h3>
                            <div class="stat-value" id="weekUploads">-</div>
                            <div class="stat-change positive">+8% 较上周</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">💾</div>
                        <div class="stat-content">
                            <h3>总计文件</h3>
                            <div class="stat-value" id="totalFiles">-</div>
                            <div class="stat-change neutral">累计总数</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3>平均日上传</h3>
                            <div class="stat-value" id="avgDailyUploads">-</div>
                            <div class="stat-change neutral">过去30天</div>
                        </div>
                    </div>
                </div>

                <!-- 图表区域 -->
                <div class="charts-section">
                    <div class="chart-container">
                        <h3>📈 每日上传趋势 (过去7天)</h3>
                        <div class="chart-placeholder" id="dailyChart">
                            <div class="chart-bars">
                                <div class="chart-bar" style="height: 60%"><span>Mon</span></div>
                                <div class="chart-bar" style="height: 80%"><span>Tue</span></div>
                                <div class="chart-bar" style="height: 45%"><span>Wed</span></div>
                                <div class="chart-bar" style="height: 90%"><span>Thu</span></div>
                                <div class="chart-bar" style="height: 70%"><span>Fri</span></div>
                                <div class="chart-bar" style="height: 30%"><span>Sat</span></div>
                                <div class="chart-bar" style="height: 55%"><span>Sun</span></div>
                            </div>
                        </div>
                    </div>

                    <div class="chart-container">
                        <h3>🗂️ 文件类型分布</h3>
                        <div class="file-types">
                            <div class="file-type-item">
                                <div class="type-indicator" style="background: #3b82f6;"></div>
                                <span>图片 (65%)</span>
                            </div>
                            <div class="file-type-item">
                                <div class="type-indicator" style="background: #10b981;"></div>
                                <span>视频 (20%)</span>
                            </div>
                            <div class="file-type-item">
                                <div class="type-indicator" style="background: #f59e0b;"></div>
                                <span>音频 (10%)</span>
                            </div>
                            <div class="file-type-item">
                                <div class="type-indicator" style="background: #8b5cf6;"></div>
                                <span>文档 (5%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="actions-section">
                    <button class="btn btn-primary" onclick="refreshData()">🔄 刷新数据</button>
                    <button class="btn btn-secondary" onclick="exportData()">📤 导出报告</button>
                    <button class="btn btn-secondary" onclick="viewDetails()">📋 查看详情</button>
                </div>

                ${this.generateStatisticsPageStyles()}

                <script>
                    ${this.generateStatisticsPageScript()}
                </script>
            </div>
        `;
    }

    /**
     * 生成详情页面 HTML
     */
    private generateDetailsPage(): string {
        return `
            <div class="upload-details-page">
                <div class="page-header">
                    <h1>📋 上传详情</h1>
                    <p class="subtitle">查看详细的上传记录和文件信息</p>
                </div>

                <div class="filters-section">
                    <div class="filter-group">
                        <label>日期范围:</label>
                        <select id="dateRange">
                            <option value="today">今天</option>
                            <option value="week">本周</option>
                            <option value="month" selected>本月</option>
                            <option value="custom">自定义</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>文件类型:</label>
                        <select id="fileType">
                            <option value="all">全部</option>
                            <option value="image">图片</option>
                            <option value="video">视频</option>
                            <option value="audio">音频</option>
                            <option value="document">文档</option>
                        </select>
                    </div>

                    <button class="btn btn-primary" onclick="applyFilters()">🔍 筛选</button>
                </div>

                <div class="details-table">
                    <table>
                        <thead>
                            <tr>
                                <th>时间</th>
                                <th>文件名</th>
                                <th>类型</th>
                                <th>大小</th>
                                <th>上传者</th>
                                <th>状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="detailsTableBody">
                            <!-- 表格内容将通过 JavaScript 动态生成 -->
                        </tbody>
                    </table>
                </div>

                <div class="pagination">
                    <button class="btn btn-secondary" onclick="prevPage()">⬅️ 上一页</button>
                    <span class="page-info">第 1 页 / 共 10 页</span>
                    <button class="btn btn-secondary" onclick="nextPage()">下一页 ➡️</button>
                </div>

                ${this.generateDetailsPageStyles()}

                <script>
                    ${this.generateDetailsPageScript()}
                </script>
            </div>
        `;
    }

    /**
     * 生成统计页面样式
     */
    private generateStatisticsPageStyles(): string {
        return `
            <style>
                .upload-statistics-page {
                    padding: 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .page-header {
                    margin-bottom: 32px;
                    text-align: center;
                }

                .page-header h1 {
                    color: #1f2937;
                    margin: 0 0 8px 0;
                    font-size: 2rem;
                }

                .subtitle {
                    color: #6b7280;
                    margin: 0;
                    font-size: 1.1rem;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 32px;
                }

                .stat-card {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .stat-icon {
                    font-size: 2.5rem;
                    opacity: 0.8;
                }

                .stat-content h3 {
                    margin: 0 0 8px 0;
                    color: #6b7280;
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 4px;
                }

                .stat-change {
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .stat-change.positive { color: #10b981; }
                .stat-change.negative { color: #ef4444; }
                .stat-change.neutral { color: #6b7280; }

                .charts-section {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 24px;
                    margin-bottom: 32px;
                }

                .chart-container {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                }

                .chart-container h3 {
                    margin: 0 0 20px 0;
                    color: #1f2937;
                    font-size: 1.1rem;
                }

                .chart-bars {
                    display: flex;
                    align-items: end;
                    justify-content: space-between;
                    height: 200px;
                    gap: 8px;
                }

                .chart-bar {
                    flex: 1;
                    background: linear-gradient(to top, #3b82f6, #60a5fa);
                    border-radius: 4px 4px 0 0;
                    min-height: 20px;
                    position: relative;
                    display: flex;
                    align-items: end;
                    justify-content: center;
                }

                .chart-bar span {
                    position: absolute;
                    bottom: -20px;
                    font-size: 0.8rem;
                    color: #6b7280;
                }

                .file-types {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .file-type-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .type-indicator {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                }

                .actions-section {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }

                .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }

                .btn-primary {
                    background: #3b82f6;
                    color: white;
                }

                .btn-primary:hover {
                    background: #2563eb;
                }

                .btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }

                .btn-secondary:hover {
                    background: #e5e7eb;
                }

                @media (max-width: 768px) {
                    .charts-section {
                        grid-template-columns: 1fr;
                    }

                    .actions-section {
                        flex-direction: column;
                    }
                }
            </style>
        `;
    }

    /**
     * 生成统计页面脚本
     */
    private generateStatisticsPageScript(): string {
        return `
            // 模拟数据加载
            async function loadStatistics() {
                try {
                    // TODO: 实际调用后端API获取数据
                    const response = await fetch('/api/upload-statistics');
                    const data = await response.json();
                    
                    // 暂时使用模拟数据
                    setTimeout(() => {
                        document.getElementById('todayUploads').textContent = '156';
                        document.getElementById('weekUploads').textContent = '1,234';
                        document.getElementById('totalFiles').textContent = '45,678';
                        document.getElementById('avgDailyUploads').textContent = '89';
                    }, 500);
                } catch (error) {
                    console.error('Failed to load statistics:', error);
                }
            }

            function refreshData() {
                // 显示加载状态
                const values = ['todayUploads', 'weekUploads', 'totalFiles', 'avgDailyUploads'];
                values.forEach(id => {
                    document.getElementById(id).textContent = '-';
                });
                
                // 重新加载数据
                loadStatistics();
            }

            function exportData() {
                alert('📄 导出功能开发中...');
            }

            function viewDetails() {
                // 跳转到详情页面
                window.location.hash = '#/mira/statistics/upload/details';
            }

            // 页面加载时初始化数据
            loadStatistics();
        `;
    }

    /**
     * 生成详情页面样式
     */
    private generateDetailsPageStyles(): string {
        return `
            <style>
                .upload-details-page {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .page-header {
                    margin-bottom: 32px;
                    text-align: center;
                }

                .page-header h1 {
                    color: #1f2937;
                    margin: 0 0 8px 0;
                    font-size: 2rem;
                }

                .subtitle {
                    color: #6b7280;
                    margin: 0;
                    font-size: 1.1rem;
                }

                .filters-section {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                    margin-bottom: 24px;
                    display: flex;
                    align-items: end;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .filter-group label {
                    font-weight: 500;
                    color: #374151;
                    font-size: 0.9rem;
                }

                .filter-group select {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    min-width: 120px;
                }

                .details-table {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e7eb;
                    overflow: hidden;
                    margin-bottom: 24px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                thead {
                    background: #f9fafb;
                }

                th, td {
                    padding: 12px 16px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                }

                th {
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.9rem;
                }

                td {
                    color: #6b7280;
                    font-size: 0.9rem;
                }

                .status-success {
                    color: #10b981;
                    font-weight: 500;
                }

                .status-processing {
                    color: #f59e0b;
                    font-weight: 500;
                }

                .status-failed {
                    color: #ef4444;
                    font-weight: 500;
                }

                .pagination {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 16px;
                }

                .page-info {
                    color: #6b7280;
                    font-size: 0.9rem;
                }

                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }

                .btn-primary {
                    background: #3b82f6;
                    color: white;
                }

                .btn-primary:hover {
                    background: #2563eb;
                }

                .btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }

                .btn-secondary:hover {
                    background: #e5e7eb;
                }

                .btn-small {
                    padding: 4px 8px;
                    font-size: 0.8rem;
                }

                @media (max-width: 768px) {
                    .filters-section {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    
                    .details-table {
                        overflow-x: auto;
                    }
                }
            </style>
        `;
    }

    /**
     * 生成详情页面脚本
     */
    private generateDetailsPageScript(): string {
        return `
            // 模拟数据
            const sampleData = [
                {
                    time: '2024-01-15 14:30',
                    filename: 'product_image_001.jpg',
                    type: '图片',
                    size: '2.3 MB',
                    uploader: '张三',
                    status: 'success'
                },
                {
                    time: '2024-01-15 14:25',
                    filename: 'demo_video.mp4',
                    type: '视频',
                    size: '45.7 MB',
                    uploader: '李四',
                    status: 'processing'
                },
                {
                    time: '2024-01-15 14:20',
                    filename: 'report.pdf',
                    type: '文档',
                    size: '1.2 MB',
                    uploader: '王五',
                    status: 'success'
                },
                {
                    time: '2024-01-15 14:15',
                    filename: 'background_music.mp3',
                    type: '音频',
                    size: '8.9 MB',
                    uploader: '赵六',
                    status: 'failed'
                }
            ];

            function loadDetailsData() {
                const tbody = document.getElementById('detailsTableBody');
                tbody.innerHTML = '';

                sampleData.forEach(item => {
                    const row = tbody.insertRow();
                    row.innerHTML = \`
                        <td>\${item.time}</td>
                        <td>\${item.filename}</td>
                        <td>\${item.type}</td>
                        <td>\${item.size}</td>
                        <td>\${item.uploader}</td>
                        <td class="status-\${item.status}">
                            \${item.status === 'success' ? '✅ 成功' : 
                              item.status === 'processing' ? '⏳ 处理中' : 
                              '❌ 失败'}
                        </td>
                        <td>
                            <button class="btn btn-secondary btn-small" onclick="viewFile('\${item.filename}')">查看</button>
                        </td>
                    \`;
                });
            }

            function applyFilters() {
                // 这里应该根据筛选条件重新加载数据
                console.log('应用筛选条件');
                loadDetailsData();
            }

            function viewFile(filename) {
                alert(\`查看文件: \${filename}\`);
            }

            function prevPage() {
                console.log('上一页');
            }

            function nextPage() {
                console.log('下一页');
            }

            // 页面加载时初始化数据
            loadDetailsData();
        `;
    }
}


export function init(inst: any): UploadStatistics {
    return new UploadStatistics(inst);
}
