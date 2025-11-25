import { join, plural } from './lang.js';

export type DurationParts = {
  millis: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
};

const MillisOf = {
  Second: 1000,
  Minute: 60 * 1000,
  Hour: 60 * 60 * 1000,
  Day: 24 * 60 * 60 * 1000,
};

export class Duration {
  protected constructor(private readonly durationInMillis: number) {}

  /**
   * @param value number of milliseconds
   */
  static millis(value: number): Duration {
    return new Duration(value);
  }

  /**
   * @param value number of seconds
   */
  static seconds(value: number): Duration {
    return new Duration(value * MillisOf.Second);
  }

  /**
   * @param value number of minutes
   */
  static minutes(value: number): Duration {
    return new Duration(value * MillisOf.Minute);
  }

  /**
   * @param value number of hours
   */
  static hours(value: number): Duration {
    return new Duration(value * MillisOf.Hour);
  }

  /**
   * @param value number of days
   */
  static days(value: number): Duration {
    return new Duration(value * MillisOf.Day);
  }

  /**
   * @returns a duration after combining all given values
   */
  static sum(...values: Duration[]): Duration {
    return new Duration(
      values.reduce((acc, duration) => acc + duration.durationInMillis, 0),
    );
  }

  /**
   * Allow creation of Duration with multiple parts
   */
  static of(value: Partial<DurationParts>): Duration {
    return Duration.sum(
      ...[
        Duration.millis(value.millis ?? 0),
        Duration.seconds(value.seconds ?? 0),
        Duration.minutes(value.minutes ?? 0),
        Duration.hours(value.hours ?? 0),
        Duration.days(value.days ?? 0),
      ],
    );
  }

  /**
   * @returns value in milliseconds
   */
  valueOf() {
    return this.inMillis;
  }

  plus(other: Duration) {
    return new Duration(this.durationInMillis + other.durationInMillis);
  }

  minus(other: Duration) {
    return new Duration(this.durationInMillis - other.durationInMillis);
  }

  times(factor: number) {
    return new Duration(this.durationInMillis * factor);
  }

  lessThan(other: Duration) {
    return this.durationInMillis < other.durationInMillis;
  }

  lessThanOrEqualTo(other: Duration) {
    return this.durationInMillis <= other.durationInMillis;
  }

  moreThan(other: Duration) {
    return this.durationInMillis > other.durationInMillis;
  }

  moreThanOrEqualTo(other: Duration) {
    return this.durationInMillis >= other.durationInMillis;
  }

  equals(other: Duration) {
    return this.durationInMillis === other.durationInMillis;
  }

  /**
   * Duration represented in milliseconds
   */
  get inMillis() {
    return this.durationInMillis;
  }

  /**
   * Duration represented in seconds
   * <b>Warning:</b> might truncate duration
   */
  get inSeconds() {
    return Math.trunc(this.durationInMillis / MillisOf.Second);
  }

  /**
   * Duration represented in minutes
   * <b>Warning:</b> might truncate duration
   */
  get inMinutes() {
    return Math.trunc(this.durationInMillis / MillisOf.Minute);
  }

  /**
   * Duration represented in hours
   * <b>Warning:</b> might truncate duration
   */
  get inHours() {
    return Math.trunc(this.durationInMillis / MillisOf.Hour);
  }

  /**
   * Duration represented in days
   * <b>Warning:</b> might truncate duration
   */
  get inDays() {
    return Math.trunc(this.durationInMillis / MillisOf.Day);
  }

  /**
   * Decompose duration into parts
   */
  get parts(): DurationParts {
    let millis = this.durationInMillis;
    const days = Math.trunc(millis / MillisOf.Day);
    millis = millis % MillisOf.Day;
    const hours = Math.trunc(millis / MillisOf.Hour);
    millis = millis % MillisOf.Hour;
    const minutes = Math.trunc(millis / MillisOf.Minute);
    millis = millis % MillisOf.Minute;
    const seconds = Math.trunc(millis / MillisOf.Second);
    millis = millis % MillisOf.Second;

    return {
      days,
      hours,
      minutes,
      seconds,
      millis,
    };
  }

  /**
   * Duration printed in English
   */
  toString() {
    const parts = this.parts;
    const isNegative = Object.values(parts).some((value) => value < 0);

    const resultParts = [];

    if (parts.days !== 0) {
      resultParts.push(`${Math.trunc(parts.days)} day${plural(parts.days)}`);
    }
    if (parts.hours !== 0) {
      resultParts.push(`${Math.trunc(parts.hours)} hour${plural(parts.hours)}`);
    }

    if (parts.minutes !== 0) {
      resultParts.push(
        `${Math.trunc(parts.minutes)} minute${plural(parts.minutes)}`,
      );
    }

    if (parts.seconds !== 0) {
      resultParts.push(
        `${Math.trunc(parts.seconds)} second${plural(parts.seconds)}`,
      );
    }

    if (parts.millis !== 0) {
      resultParts.push(
        `${Math.trunc(parts.millis)} millisecond${plural(parts.millis)}`,
      );
    }

    return `${isNegative ? '-' : ''}${join(resultParts)}`;
  }
}
