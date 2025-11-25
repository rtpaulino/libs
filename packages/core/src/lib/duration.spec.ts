import { Duration } from './duration.js';

describe('Duration', () => {
  describe('of', () => {
    it('must properly convert parts into millis', () => {
      const duration = Duration.of({ minutes: 2, seconds: 10 });
      expect(duration.inMillis).toBe(130000);
    });
  });

  describe('parts', () => {
    it('must properly convert milliseconds into parts', () => {
      const duration = Duration.millis(130000);
      expect(duration.parts).toEqual({
        seconds: 10,
        minutes: 2,
        days: 0,
        hours: 0,
        millis: 0,
      });
    });
  });

  describe('toString', () => {
    it('should properly convert into a human-readable text', () => {
      const duration = Duration.of({ minutes: 2, seconds: 10 });
      expect(duration.toString()).toBe('2 minutes and 10 seconds');
    });
  });
});
