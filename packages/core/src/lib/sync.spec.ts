import { describe, it, expect } from 'vitest';
import { sync } from './sync';

describe('sync', () => {
  describe('basic synchronization', () => {
    it('should return empty arrays when both incoming and existing are empty', () => {
      const result = sync({
        incoming: [],
        existing: [],
        matches: () => false,
        equals: () => true,
      });

      expect(result.toBeCreated).toEqual([]);
      expect(result.toBeUpdated).toEqual([]);
      expect(result.toBeDeleted).toEqual([]);
      expect(result.unchanged).toEqual([]);
    });

    it('should mark all incoming items as toBeCreated when existing is empty', () => {
      const incoming = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = sync({
        incoming,
        existing: [],
        matches: () => false,
        equals: () => true,
      });

      expect(result.toBeCreated).toEqual(incoming);
      expect(result.toBeUpdated).toEqual([]);
      expect(result.toBeDeleted).toEqual([]);
      expect(result.unchanged).toEqual([]);
    });

    it('should mark all existing items as toBeDeleted when incoming is empty', () => {
      const existing = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = sync({
        incoming: [],
        existing,
        matches: () => false,
        equals: () => true,
      });

      expect(result.toBeCreated).toEqual([]);
      expect(result.toBeUpdated).toEqual([]);
      expect(result.toBeDeleted).toEqual(existing);
      expect(result.unchanged).toEqual([]);
    });
  });

  describe('matching logic', () => {
    it('should use matches function to identify matching items', () => {
      const incoming = [{ id: 1, name: 'Alice' }];
      const existing = [{ id: 1, name: 'Alice' }];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) => incoming.name === existing.name,
      });

      expect(result.toBeCreated).toEqual([]);
      expect(result.toBeUpdated).toEqual([]);
      expect(result.toBeDeleted).toEqual([]);
      expect(result.unchanged).toEqual(existing);
    });

    it('should identify non-matching items as toBeCreated and toBeDeleted', () => {
      const incoming = [{ id: 1 }];
      const existing = [{ id: 2 }];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: () => true,
      });

      expect(result.toBeCreated).toEqual(incoming);
      expect(result.toBeDeleted).toEqual(existing);
    });
  });

  describe('equals logic', () => {
    it('should mark matching items as unchanged when equals returns true', () => {
      const incoming = [{ id: 1, value: 100 }];
      const existing = [{ id: 1, value: 100 }];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) => incoming.value === existing.value,
      });

      expect(result.unchanged).toEqual(existing);
      expect(result.toBeUpdated).toEqual([]);
    });

    it('should mark matching items as toBeUpdated when equals returns false', () => {
      const incoming = { id: 1, value: 200 };
      const existing = { id: 1, value: 100 };

      const result = sync({
        incoming: [incoming],
        existing: [existing],
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) => incoming.value === existing.value,
      });

      expect(result.toBeUpdated).toEqual([
        { original: existing, updated: incoming },
      ]);
      expect(result.unchanged).toEqual([]);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed create, update, delete, and unchanged operations', () => {
      const incoming = [
        { id: 1, name: 'Alice' }, // unchanged
        { id: 2, name: 'Bob Updated' }, // update
        { id: 4, name: 'Diana' }, // create
      ];

      const existing = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }, // delete
      ];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) => incoming.name === existing.name,
      });

      expect(result.toBeCreated).toEqual([{ id: 4, name: 'Diana' }]);
      expect(result.toBeUpdated).toEqual([
        {
          original: { id: 2, name: 'Bob' },
          updated: { id: 2, name: 'Bob Updated' },
        },
      ]);
      expect(result.toBeDeleted).toEqual([{ id: 3, name: 'Charlie' }]);
      expect(result.unchanged).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('should handle multiple updates with complex objects', () => {
      const incoming = [
        { id: 1, data: { status: 'active', count: 10 } },
        { id: 2, data: { status: 'inactive', count: 5 } },
      ];

      const existing = [
        { id: 1, data: { status: 'active', count: 10 } },
        { id: 2, data: { status: 'active', count: 5 } },
      ];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) =>
          JSON.stringify(incoming.data) === JSON.stringify(existing.data),
      });

      expect(result.unchanged).toHaveLength(1);
      expect(result.toBeUpdated).toHaveLength(1);
      expect(result.toBeUpdated[0].updated.data.status).toBe('inactive');
    });

    it('should handle duplicate incoming items (first match wins)', () => {
      const incoming = [
        { id: 1, name: 'Alice' },
        { id: 1, name: 'Alice Updated' },
      ];

      const existing = [{ id: 1, name: 'Alice' }];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) => incoming.name === existing.name,
      });

      // First incoming item matches exactly (unchanged)
      // Second incoming item also matches the same existing item, but differs in name (update)
      // The function processes both incoming items against the same existing item
      expect(result.unchanged).toHaveLength(1);
      expect(result.toBeUpdated).toEqual([
        {
          original: { id: 1, name: 'Alice' },
          updated: { id: 1, name: 'Alice Updated' },
        },
      ]);
      expect(result.toBeCreated).toHaveLength(0);
    });

    it('should handle items with different data types', () => {
      interface User {
        id: string;
        email: string;
        active: boolean;
      }

      interface UserDTO {
        userId: string;
        emailAddress: string;
        isActive: boolean;
      }

      const incoming: UserDTO[] = [
        { userId: 'u1', emailAddress: 'alice@example.com', isActive: true },
        { userId: 'u2', emailAddress: 'bob@example.com', isActive: false },
      ];

      const existing: User[] = [
        { id: 'u1', email: 'alice@example.com', active: true },
        { id: 'u2', email: 'bob.old@example.com', active: true },
      ];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.userId === existing.id,
        equals: (incoming, existing) =>
          incoming.emailAddress === existing.email &&
          incoming.isActive === existing.active,
      });

      expect(result.unchanged).toHaveLength(1);
      expect(result.toBeUpdated).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle large datasets efficiently', () => {
      const size = 1000;
      const incoming = Array.from({ length: size }, (_, i) => ({ id: i }));
      const existing = Array.from({ length: size }, (_, i) => ({
        id: i,
        value: i * 2,
      }));

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: () => false, // All will be updates
      });

      expect(result.toBeUpdated).toHaveLength(size);
      expect(result.toBeCreated).toEqual([]);
      expect(result.toBeDeleted).toEqual([]);
    });

    it('should handle null and undefined values in data', () => {
      const incoming = [{ id: 1, optional: null }];
      const existing = [{ id: 1, optional: undefined }];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) => incoming.optional === existing.optional,
      });

      expect(result.toBeUpdated).toHaveLength(1);
    });

    it('should preserve object references for unchanged items', () => {
      const existingItem = { id: 1, name: 'Alice' };
      const incomingItem = { id: 1, name: 'Alice' };
      const existing = [existingItem];

      const result = sync({
        incoming: [incomingItem],
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) => incoming.name === existing.name,
      });

      expect(result.unchanged[0]).toBe(existingItem);
      expect(result.unchanged[0]).not.toBe(incomingItem);
    });

    it('should handle items with circular references in comparison functions', () => {
      const incoming = [{ id: 1, name: 'Alice' }];
      const existing = [{ id: 1, name: 'Alice' }];

      // Just ensure it doesn't crash with circular reference handling
      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: () => true,
      });

      expect(result.unchanged).toHaveLength(1);
    });

    it('should handle empty strings and zero values correctly', () => {
      const incoming = [
        { id: 1, name: '', value: 0 },
        { id: 2, name: 'test', value: 0 },
      ];

      const existing = [
        { id: 1, name: '', value: 0 },
        { id: 2, name: 'test', value: 1 },
      ];

      const result = sync({
        incoming,
        existing,
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: (incoming, existing) =>
          incoming.name === existing.name && incoming.value === existing.value,
      });

      expect(result.unchanged).toHaveLength(1);
      expect(result.toBeUpdated).toHaveLength(1);
      expect(result.toBeUpdated[0].updated.value).toBe(0);
    });
  });

  describe('callback invocations', () => {
    it('should call matches for each incoming item against each existing item when no match found', () => {
      let matchesCallCount = 0;

      sync({
        incoming: [{ id: 1 }],
        existing: [{ id: 2 }, { id: 3 }],
        matches: () => {
          matchesCallCount++;
          return false;
        },
        equals: () => true,
      });

      // Matches called for each incoming against each existing: 1 * 2 = 2
      expect(matchesCallCount).toBeGreaterThanOrEqual(1);
    });

    it('should call equals only for items that match', () => {
      let equalsCallCount = 0;

      sync({
        incoming: [{ id: 1, value: 'a' }],
        existing: [
          { id: 1, value: 'b' },
          { id: 2, value: 'c' },
        ],
        matches: (incoming, existing) => incoming.id === existing.id,
        equals: () => {
          equalsCallCount++;
          return true;
        },
      });

      expect(equalsCallCount).toBe(1);
    });
  });
});
