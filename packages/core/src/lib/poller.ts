import { Logger } from './types';

/**
 * Configuration options for the polling mechanism
 */
export interface PollerConfig {
  /**
   * Time to wait between polling cycles (in milliseconds)
   * @default 1000
   */
  pollIntervalMs?: number;

  /**
   * Name for the logger
   */
  loggerName?: string;

  /**
   * Optional error handler for polling errors
   */
  onError?: (error: Error) => void;

  /**
   * Optional logger instance
   */
  logger?: Logger;
}

export class Poller {
  private logger?: Logger;

  /**
   * Polling interval in milliseconds
   */
  private pollIntervalMs: number;

  /**
   * Flag indicating if polling is currently active
   */
  private isPolling = false;

  /**
   * Reference to the scheduled polling timeout
   */
  private pollingTimeout: NodeJS.Timeout | null = null;

  /**
   * Guard to prevent concurrent poll cycles
   */
  private pulling = false;

  /**
   * The callback function to execute on each poll cycle
   */
  private pollCallback: () => Promise<void>;

  /**
   * Optional error handler for polling errors
   */
  private onError?: (error: Error) => void;

  constructor(pollCallback: () => Promise<void>, config?: PollerConfig) {
    this.logger = config?.logger;

    this.pollCallback = pollCallback;

    this.pollIntervalMs = config?.pollIntervalMs ?? 1000;

    this.onError = config?.onError;
  }

  /**
   * Starts the polling mechanism
   */
  start(): void {
    if (this.isPolling) {
      this.logger?.warn('Polling is already started');
      return;
    }

    this.isPolling = true;
    this.schedulePoll();
  }

  /**
   * Stops the polling mechanism
   */
  stop(): void {
    if (!this.isPolling) {
      this.logger?.warn('Polling is not running');
      return;
    }

    this.isPolling = false;

    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }

    this.logger?.log('Stopped polling');
  }

  /**
   * Schedules the next polling cycle with configured delay
   */
  private schedulePoll(): void {
    if (!this.isPolling) {
      return;
    }

    this.pollingTimeout = setTimeout(() => {
      this.executePollCycle()
        .catch((error) => {
          this.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          );
        })
        .finally(() => {
          this.schedulePoll();
        });
    }, this.pollIntervalMs);
  }

  /**
   * Executes a single polling cycle with guard against concurrent polls
   */
  private async executePollCycle(): Promise<void> {
    if (this.pulling) {
      this.logger?.warn('Unexpected poll cycle: already pulling');
      return;
    }

    this.pulling = true;
    try {
      await this.pollCallback();
    } finally {
      this.pulling = false;
    }
  }

  /**
   * Checks if polling is currently active
   */
  get isActive(): boolean {
    return this.isPolling;
  }
}
