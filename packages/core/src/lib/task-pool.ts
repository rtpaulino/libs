import { Logger } from './types';
import { waitUntil } from './time';
import { ok } from 'assert';
import { Duration } from './duration';

export type TaskPoolConfig<T> = {
  size: number;
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
  ) {
    super(
      `Task pool is full. Pool size: ${poolSize}, Active tasks: ${activeTasks}`,
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

  private heartbeatIntervals = new Map<T, NodeJS.Timeout>();

  constructor(readonly config: TaskPoolConfig<T>) {
    if (config.size <= 0) {
      throw new Error('Task pool size must be greater than 0');
    }
    this.logger = config.logger;
  }

  /**
   * Submit a task to the task pool for processing
   * @param data The task data to process
   * @throws {TaskPoolBlockedError} When the pool is blocked
   * @throws {TaskPoolFullError} When all task slots are busy
   */
  execute(data: T): void {
    if (this.blocked) {
      throw new TaskPoolBlockedError();
    }

    if (this.activeTasks >= this.config.size) {
      throw new TaskPoolFullError(this.config.size, this.activeTasks);
    }

    this.activeTasks++;
    this.notifyStatusChange();

    if (this.config.heartbeat?.enabled) {
      this.startHeartbeat(data);
    }

    // Execute the task asynchronously without awaiting
    void this.config
      .handler(data)
      .then(() => {
        this.config.onSuccess?.(data);
      })
      .catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.config.onError?.(err, data);
      })
      .finally(() => {
        this.stopHeartbeat(data);
        this.activeTasks--;
        this.notifyStatusChange();
      });
  }

  get active() {
    return this.activeTasks;
  }

  get idle() {
    return this.config.size - this.activeTasks;
  }

  get hasCapacity(): boolean {
    return this.idle > 0;
  }

  private notifyStatusChange(): void {
    this.config.onStatusChange?.({
      active: this.active,
      idle: this.idle,
    });
  }

  private startHeartbeat(data: T): void {
    ok(
      this.config.heartbeat,
      'Heartbeat config must be defined to start heartbeat',
    );

    const interval = setInterval(() => {
      this.config.heartbeat?.onHeartbeat(data).catch((error) => {
        this.logger?.warn(
          `Heartbeat callback failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }, this.config.heartbeat.interval.inMillis);

    this.heartbeatIntervals.set(data, interval);
  }

  private stopHeartbeat(data: T): void {
    const interval = this.heartbeatIntervals.get(data);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(data);
    }
  }

  /**
   * Block the task pool from accepting new tasks
   * Existing tasks will continue to execute
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
   * Wait until all active tasks are completed
   * @param timeout Maximum time to wait (default: one minute)
   * @returns A promise that resolves when all tasks are complete or timeout is reached
   */
  async waitUntilIdle(timeout = Duration.minutes(1)): Promise<void> {
    await waitUntil(() => this.activeTasks === 0, {
      timeout,
      interval: Duration.millis(500),
      throwOnTimeout: false,
    });

    if (this.activeTasks > 0) {
      this.logger?.warn(
        `TaskPool.waitUntilIdle() timeout reached after ${timeout.toString()} with ${this.activeTasks} active tasks remaining`,
      );
    }
  }
}
