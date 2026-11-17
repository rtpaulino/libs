import { Logger } from './types.js';
import { waitUntil } from './time.js';
import { Duration } from './duration.js';

export type TaskPoolConfig<T> = {
  /** Number of execution slots. Fixed at construction when queueing is enabled. */
  size: number;
  /** Maximum number of waiting tasks. Defaults to 0. */
  queueCapacity?: number;
  handler: (data: T) => Promise<void>;
  onError?: (error: Error, data: T) => void;
  onSuccess?: (data: T) => void;
  onStatusChange?: (data: { active: number; idle: number }) => void;
  heartbeat?: {
    enabled: boolean;
    interval: Duration;
    onHeartbeat: (data: T) => Promise<void>;
  };
  logger?: Logger;
};

export class TaskPoolFullError extends Error {
  constructor(
    readonly poolSize: number,
    readonly activeTasks: number,
    readonly queueCapacity = 0,
  ) {
    super(
      `Task pool is full. Pool size: ${poolSize}, Active tasks: ${activeTasks}` +
        (queueCapacity > 0 ? `, Queue capacity: ${queueCapacity}` : ''),
    );
    this.name = 'TaskPoolFullError';
  }
}

export class TaskPoolBlockedError extends Error {
  constructor() {
    super('Task pool is blocked and not accepting new tasks');
    this.name = 'TaskPoolBlockedError';
  }
}

export class TaskPool<T> {
  private logger?: Logger;

  private activeTasks = 0;

  private blocked = false;

  private readonly queue: { data: T }[] = [];

  private readonly queueCapacity: number;

  private readonly fixedSize?: number;

  constructor(readonly config: TaskPoolConfig<T>) {
    if (config.size <= 0) {
      throw new Error('Task pool size must be greater than 0');
    }
    this.queueCapacity = config.queueCapacity ?? 0;
    if (!Number.isInteger(this.queueCapacity) || this.queueCapacity < 0) {
      throw new Error(
        'Task pool queue capacity must be a non-negative integer',
      );
    }
    if (this.queueCapacity > 0) {
      this.fixedSize = config.size;
    }
    this.logger = config.logger;
  }

  private get size(): number {
    return this.fixedSize ?? this.config.size;
  }

  /**
   * Submit a task for immediate execution or FIFO queueing.
   * @param data The task data to process
   * @throws {TaskPoolBlockedError} When the pool is blocked
   * @throws {TaskPoolFullError} When all execution slots and queue places are occupied
   */
  execute(data: T): void {
    if (this.blocked) {
      throw new TaskPoolBlockedError();
    }

    if (this.activeTasks >= this.size) {
      if (this.pending >= this.queueCapacity) {
        throw new TaskPoolFullError(
          this.size,
          this.activeTasks,
          this.queueCapacity,
        );
      }
      this.queue.push({ data });
      return;
    }

    this.startTask(data);
  }

  private startTask(data: T): void {
    this.activeTasks++;
    void this.runTask(data)
      .finally(() => {
        this.activeTasks--;
        const next = this.queue.shift();
        if (next) {
          this.startTask(next.data);
        } else {
          this.notifyStatusChange();
        }
      })
      .catch((error) => {
        this.logger?.error('Task pool callback failed', error);
      });
  }

  private async runTask(data: T): Promise<void> {
    this.notifyStatusChange();
    const heartbeat = this.startHeartbeat(data);
    try {
      await this.config.handler(data);
      this.config.onSuccess?.(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError?.(err, data);
    } finally {
      if (heartbeat !== undefined) {
        clearInterval(heartbeat);
      }
    }
  }

  get active() {
    return this.activeTasks;
  }

  get idle() {
    return this.size - this.activeTasks;
  }

  /** Number of accepted tasks waiting for an execution slot. */
  get pending(): number {
    return this.queue.length;
  }

  /** Whether an execution slot is free. Queue space and blocking are independent. */
  get hasCapacity(): boolean {
    return this.idle > 0;
  }

  private notifyStatusChange(): void {
    try {
      this.config.onStatusChange?.({
        active: this.active,
        idle: this.idle,
      });
    } catch (error) {
      this.logger?.error('Task pool status callback failed', error);
    }
  }

  private startHeartbeat(data: T): NodeJS.Timeout | undefined {
    if (!this.config.heartbeat?.enabled) {
      return;
    }
    return setInterval(() => {
      this.config.heartbeat?.onHeartbeat(data).catch((error) => {
        this.logger?.warn(
          `Heartbeat callback failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }, this.config.heartbeat.interval.inMillis);
  }

  /**
   * Block the task pool from accepting new tasks
   * Running and queued tasks will continue to execute
   */
  block(): void {
    this.blocked = true;
  }

  /**
   * Unblock the task pool to accept new tasks
   */
  unblock(): void {
    this.blocked = false;
  }

  /**
   * Check if the task pool is blocked
   */
  get isBlocked(): boolean {
    return this.blocked;
  }

  /**
   * Wait until all running and queued tasks are completed
   * @param timeout Maximum time to wait (default: one minute)
   * @returns A promise that resolves when all tasks are complete or timeout is reached
   */
  async waitUntilIdle(timeout = Duration.minutes(1)): Promise<void> {
    const isIdle = () => this.active === 0 && this.pending === 0;
    await waitUntil(isIdle, {
      timeout,
      interval: Duration.millis(500),
      throwOnTimeout: false,
    });

    if (!isIdle()) {
      const queued =
        this.pending > 0 ? ` and ${this.pending} queued tasks` : '';
      this.logger?.warn(
        `TaskPool.waitUntilIdle() timeout reached after ${timeout.toString()} with ${this.active} active tasks${queued} remaining`,
      );
    }
  }
}
