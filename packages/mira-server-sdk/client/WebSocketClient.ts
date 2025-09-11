import { EventEmitter } from 'events';
import { WebSocketOptions, WebSocketMessage, WebSocketEventCallback } from '../types';

// 使用require导入ws，因为模块导出可能有问题
const WebSocket = require('ws');

// 定义WebSocket类型
interface WSInstance {
    on(event: 'open', listener: () => void): void;
    on(event: 'message', listener: (data: any) => void): void;
    on(event: 'close', listener: (code: number, reason: Buffer) => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
    send(data: string): void;
    close(): void;
    readyState: number;
}

const WS_OPEN = 1; // WebSocket.OPEN

/**
 * Mira WebSocket Client
 * 提供WebSocket连接功能，支持事件监听和消息发送
 * 
 * @example
 * ```typescript
 * const client = new MiraClient('http://localhost:8081');
 * const wsClient = client.websocket(8082, {
 *   clientId: 'my-client',
 *   libraryId: 'my-library'
 * });
 * 
 * wsClient.bind('dialog', (data) => {
 *   console.log('Received dialog event:', data);
 * });
 * 
 * await wsClient.start();
 * ```
 */
export class WebSocketClient extends EventEmitter {
    private ws?: WSInstance;
    private url: string;
    private options: WebSocketOptions;
    private isConnected: boolean = false;
    private reconnectCount: number = 0;
    private eventCallbacks: Map<string, WebSocketEventCallback[]> = new Map();
    private dataCallback?: (data: any) => void;
    private reconnectTimer?: NodeJS.Timeout;

    constructor(port: number, options: WebSocketOptions = {}) {
        super();

        const defaultOptions: WebSocketOptions = {
            reconnect: true,
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            ...options
        };

        this.options = defaultOptions;

        // 构建WebSocket URL
        const params = new URLSearchParams();
        if (this.options.clientId) {
            params.append('clientId', this.options.clientId);
        }
        if (this.options.libraryId) {
            params.append('libraryId', this.options.libraryId);
        }

        this.url = `ws://localhost:${port}?${params.toString()}`;
    }

    /**
     * 启动WebSocket连接
     */
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url, {
                    headers: this.options.headers
                }) as WSInstance;

                if (!this.ws) {
                    reject(new Error('Failed to create WebSocket instance'));
                    return;
                }

                this.ws.on('open', () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.reconnectCount = 0;
                    this.emit('connected');
                    resolve();
                });

                this.ws!.on('message', (data: any) => {
                    this.handleMessage(data);
                });

                this.ws!.on('close', (code: number, reason: Buffer) => {
                    console.log(`WebSocket disconnected: ${code} - ${reason.toString()}`);
                    this.isConnected = false;
                    this.emit('disconnected', { code, reason: reason.toString() });

                    if (this.options.reconnect && this.reconnectCount < (this.options.maxReconnectAttempts || 10)) {
                        this.scheduleReconnect();
                    }
                });

                this.ws!.on('error', (error: Error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 关闭WebSocket连接
     */
    stop(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        if (this.ws) {
            this.options.reconnect = false; // 禁用重连
            this.ws.close();
            this.ws = undefined;
        }
        this.isConnected = false;
    }

    /**
     * 绑定事件监听器
     * @param eventName 事件名称
     * @param callback 回调函数
     */
    bind(eventName: string, callback: WebSocketEventCallback): void {
        if (!this.eventCallbacks.has(eventName)) {
            this.eventCallbacks.set(eventName, []);
        }
        this.eventCallbacks.get(eventName)!.push(callback);
    }

    /**
     * 取消事件监听器
     * @param eventName 事件名称
     * @param callback 要取消的回调函数，如果不提供则取消所有该事件的监听器
     */
    unbind(eventName: string, callback?: WebSocketEventCallback): void {
        if (!this.eventCallbacks.has(eventName)) {
            return;
        }

        const callbacks = this.eventCallbacks.get(eventName)!;

        if (callback) {
            // 移除特定的回调函数
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        } else {
            // 移除所有回调函数
            this.eventCallbacks.set(eventName, []);
        }
    }

    /**
     * 监听服务器的所有返回消息
     * @param callback 数据回调函数，接收服务器返回的原始数据
     * @example
     * ```typescript
     * wsClient.onData((data) => {
     *   console.log('服务器返回数据:', data);
     * });
     * ```
     */
    onData(callback: (data: any) => void): void {
        this.dataCallback = callback;
    }

    /**
     * 发送消息到服务器
     * @param message 要发送的消息
     */
    send(message: WebSocketMessage): void {
        if (!this.isConnected || !this.ws) {
            throw new Error('WebSocket is not connected');
        }

        const messageStr = JSON.stringify(message);
        this.ws.send(messageStr);
    }

    /**
     * 发送插件消息
     * @param action 操作类型
     * @param data 数据
     * @param requestId 请求ID
     */
    sendPluginMessage(action: string, data: Record<string, any>, requestId?: string): void {
        const message: WebSocketMessage = {
            eventName: 'plugin',
            action,
            requestId: requestId || this.generateRequestId(),
            libraryId: this.options.libraryId,
            payload: {
                type: 'plugin',
                data
            },
            data
        };

        this.send(message);
    }

    /**
     * 检查连接状态
     */
    isConnectedStatus(): boolean {
        return this.isConnected && this.ws?.readyState === WS_OPEN;
    }

    /**
     * 处理接收到的消息
     */
    private handleMessage(data: any): void {
        try {
            const message = JSON.parse(data.toString()) as WebSocketMessage;

            // 首先调用数据回调，如果设置了的话
            if (this.dataCallback) {
                try {
                    this.dataCallback(message);
                } catch (error) {
                    console.error('Error in data callback:', error);
                }
            }

            // 触发对应事件的所有监听器
            if (message.eventName && this.eventCallbacks.has(message.eventName)) {
                const callbacks = this.eventCallbacks.get(message.eventName)!;
                callbacks.forEach(callback => {
                    try {
                        callback(message.data || message);
                    } catch (error) {
                        console.error(`Error in event callback for ${message.eventName}:`, error);
                    }
                });
            }

            // 发送到通用消息监听器
            this.emit('message', message);

        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            this.emit('error', new Error('Failed to parse message'));
        }
    }

    /**
     * 安排重连
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectCount++;
        console.log(`Attempting to reconnect (${this.reconnectCount}/${this.options.maxReconnectAttempts})...`);

        this.reconnectTimer = setTimeout(() => {
            this.start().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, this.options.reconnectInterval);
    }

    /**
     * 生成请求ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
