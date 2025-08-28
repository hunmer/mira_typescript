import { ServerPlugin, PluginRouteDefinition } from "../ServerPlugin";
import { ServerPluginManager } from "../ServerPluginManager";
import { ILibraryServerData } from "mira-storage-sqlite";

/**
 * 示例表单插件
 * 展示如何定义后台路由和组件
 */
export class ExampleFormPlugin extends ServerPlugin {
    constructor(pluginManager: ServerPluginManager, dbServer: ILibraryServerData) {
        super('example-form-plugin', pluginManager, dbServer);

        // 在构造函数中注册路由
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // 定义插件路由
        const formRoute: PluginRouteDefinition = {
            name: 'MiraPluginForm',
            group: "Mira插件",
            path: '/mira/plugin-form',
            component: 'form/form_1.js', // vue编译后的模板文件路径
            meta: {
                roles: ['super', 'admin'], // 需要权限
                icon: 'lucide:form-input',
                title: '自定义表单插件',
                order: 1
            },
            builder: () => {
                // 返回一个简单的表单组件 HTML
                return `
                    <div class="plugin-form-container">
                        <h2>自定义表单插件</h2>
                        <form class="plugin-form">
                            <div class="form-group">
                                <label for="name">名称:</label>
                                <input type="text" id="name" name="name" placeholder="请输入名称" />
                            </div>
                            <div class="form-group">
                                <label for="description">描述:</label>
                                <textarea id="description" name="description" placeholder="请输入描述"></textarea>
                            </div>
                            <div class="form-group">
                                <button type="submit" class="submit-btn">提交</button>
                                <button type="reset" class="reset-btn">重置</button>
                            </div>
                        </form>
                        <style>
                            .plugin-form-container {
                                padding: 20px;
                                max-width: 600px;
                                margin: 0 auto;
                            }
                            .form-group {
                                margin-bottom: 15px;
                            }
                            .form-group label {
                                display: block;
                                margin-bottom: 5px;
                                font-weight: bold;
                            }
                            .form-group input, .form-group textarea {
                                width: 100%;
                                padding: 8px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                font-size: 14px;
                            }
                            .form-group textarea {
                                height: 100px;
                                resize: vertical;
                            }
                            .submit-btn, .reset-btn {
                                padding: 10px 20px;
                                margin-right: 10px;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 14px;
                            }
                            .submit-btn {
                                background-color: #007bff;
                                color: white;
                            }
                            .reset-btn {
                                background-color: #6c757d;
                                color: white;
                            }
                            .submit-btn:hover {
                                background-color: #0056b3;
                            }
                            .reset-btn:hover {
                                background-color: #545b62;
                            }
                        </style>
                    </div>
                `;
            }
        };

        // 注册路由
        this.registerRoute(formRoute);

        // 也可以注册多个路由
        const dashboardRoute: PluginRouteDefinition = {
            name: 'MiraPluginDashboard',
            group: "Mira插件",
            path: '/mira/plugin-dashboard',
            component: 'dashboard/dashboard_1.js',
            meta: {
                roles: ['super', 'admin'],
                icon: 'lucide:bar-chart-3',
                title: '插件仪表板',
                order: 2
            },
            builder: () => {
                return `
                    <div class="plugin-dashboard">
                        <h2>插件仪表板</h2>
                        <div class="dashboard-grid">
                            <div class="dashboard-card">
                                <h3>总用户数</h3>
                                <div class="metric">1,234</div>
                            </div>
                            <div class="dashboard-card">
                                <h3>活跃用户</h3>
                                <div class="metric">567</div>
                            </div>
                            <div class="dashboard-card">
                                <h3>今日访问</h3>
                                <div class="metric">890</div>
                            </div>
                            <div class="dashboard-card">
                                <h3>系统状态</h3>
                                <div class="metric status-good">正常</div>
                            </div>
                        </div>
                        <style>
                            .plugin-dashboard {
                                padding: 20px;
                            }
                            .dashboard-grid {
                                display: grid;
                                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                                gap: 20px;
                                margin-top: 20px;
                            }
                            .dashboard-card {
                                background: #f8f9fa;
                                padding: 20px;
                                border-radius: 8px;
                                border: 1px solid #e9ecef;
                                text-align: center;
                            }
                            .dashboard-card h3 {
                                margin: 0 0 10px 0;
                                color: #495057;
                                font-size: 14px;
                            }
                            .metric {
                                font-size: 24px;
                                font-weight: bold;
                                color: #007bff;
                            }
                            .status-good {
                                color: #28a745;
                            }
                        </style>
                    </div>
                `;
            }
        };

        this.registerRoute(dashboardRoute);

        console.log(`✅ Example Form Plugin routes registered: ${this.getRoutes().length} routes`);
    }
}
