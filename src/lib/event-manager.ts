/**
 * 事件参数基类
 */
export class EventArgs {
  /** 事件名称 */
  eventName: string;

  /** 事件发生时间 */
  readonly whenOccurred: Date;

  /**
   * 创建一个事件参数实例
   * @param eventName 事件名称，默认为空字符串
   */
  constructor(eventName: string = '') {
    this.eventName = eventName;
    this.whenOccurred = new Date();
  }
}

/**
 * 事件订阅句柄，用于标识和管理订阅
 */
export class EventSubscription<T extends EventArgs = EventArgs> {
  private readonly _id: string;
  private _isActive: boolean = true;

  /**
   * @param _id 订阅ID
   * @param eventName 事件名称
   * @param handler 事件处理函数
   */
  private readonly _eventName: string;
  private readonly _handler: (args: T) => void;

  constructor(
    eventName: string,
    handler: (args: T) => void
  ) {
    this._id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this._eventName = eventName;
    this._handler = handler;
  }

  get id(): string {
    return this._id;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get eventName(): string {
    return this._eventName;
  }

  getHandler(): (args: T) => void {
    return this._handler;
  }

  /** 取消订阅 */
  cancel(): void {
    this._isActive = false;
  }
}

import { EventEmitter } from 'events';

/**
 * 事件管理器单例类
 * 继承自Node.js EventEmitter以获得更好的性能和标准API
 */
export class EventManager extends EventEmitter {
  private static _instance: EventManager;

  /** 获取EventManager单例实例 */
  public static get instance(): EventManager {
    if (!EventManager._instance) {
      EventManager._instance = new EventManager();
    }
    return EventManager._instance;
  }

  constructor() {
    super();
    this.setMaxListeners(100); // 提高默认监听器限制
    this._initializeEventHandlers();
  }

  /**
   * 注册一个事件处理器
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @returns 订阅句柄
   */
  public subscribe<T extends EventArgs = EventArgs>(
    eventName: string,
    handler: (args: T) => void
  ): this {
    this.on(eventName, handler);
    return this;
  }

  /**
   * 注册一个一次性事件处理器
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @returns 订阅句柄
   */
  public subscribeOnce<T extends EventArgs = EventArgs>(
    eventName: string,
    handler: (args: T) => void
  ): this {
    this.once(eventName, handler);
    return this;
  }

  /**
   * 取消订阅
   * @param eventName 事件名称
   * @param handler 要取消的事件处理函数
   * @returns 是否成功取消订阅
   */
  public unsubscribe<T extends EventArgs = EventArgs>(
    eventName: string,
    handler: (args: T) => void
  ): void {
     this.off(eventName, handler);
  }

  /**
   * 广播事件
   * @param eventName 事件名称
   * @param args 事件参数
   */
  public broadcast<T extends EventArgs = EventArgs>(eventName: string, args: T): void {
    if (!args.eventName) {
      args.eventName = eventName;
    }
    this.emit(eventName, args);
  }

  /**
   * 清理所有订阅
   */
  public dispose(): void {
    this.removeAllListeners();
  }

  /** 初始化事件处理器 */
  private _initializeEventHandlers(): void {
    // 初始化基本事件处理
  }
}