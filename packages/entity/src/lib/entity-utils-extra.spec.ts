/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { isEqual } from 'lodash-es';
import { EntityUtils } from './entity-utils.js';
import {
  StringProperty,
  NumberProperty,
  BooleanProperty,
  DateProperty,
  BigIntProperty,
  EntityProperty,
  ArrayProperty,
  PassthroughProperty,
} from './property.js';
import { Entity } from './entity.js';

describe('EntityUtils', () => {
  describe('toJSON and parse round-trip', () => {
    it('should handle complex entity with multiple property types through serialization and deserialization', async () => {
      // Define nested entities
      @Entity()
      class Address {
        @StringProperty()
        street!: string;

        @StringProperty()
        city!: string;

        @NumberProperty()
        zipCode!: number;
        constructor(data: { street: string; city: string; zipCode: number }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class Phone {
        @StringProperty()
        type!: string;

        @StringProperty()
        number!: string;
        constructor(data: { type: string; number: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class User {
        @StringProperty()
        name!: string;

        @NumberProperty()
        age!: number;

        @BooleanProperty()
        active!: boolean;

        @DateProperty()
        createdAt!: Date;

        @BigIntProperty()
        balance!: bigint;

        @EntityProperty(() => Address)
        address!: Address;

        @ArrayProperty(() => Phone)
        phones!: Phone[];

        @ArrayProperty(() => String)
        tags!: string[];

        @ArrayProperty(() => Number)
        scores!: number[];

        @StringProperty({ optional: true })
        nickname?: string;

        @ArrayProperty(() => String, { sparse: true })
        sparseList!: (string | null)[];

        @PassthroughProperty()
        metadata!: Record<string, unknown>;
        constructor(data: {
          name: string;
          age: number;
          active: boolean;
          createdAt: Date;
          balance: bigint;
          address: Address;
          phones: Phone[];
          tags: string[];
          scores: number[];
          nickname?: string;
          sparseList: (string | null)[];
          metadata: Record<string, unknown>;
        }) {
          Object.assign(this, data);
        }
      }

      // Create a complex entity
      const address = new Address({
        street: '123 Main St',
        city: 'Boston',
        zipCode: 12345,
      });

      const phone1 = new Phone({ type: 'mobile', number: '555-0001' });

      const phone2 = new Phone({ type: 'home', number: '555-0002' });

      const originalUser = new User({
        name: 'John Doe',
        age: 30,
        active: true,
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        balance: BigInt('999999999999999999'),
        address: address,
        phones: [phone1, phone2],
        tags: ['developer', 'typescript', 'nodejs'],
        scores: [95, 87, 92],
        sparseList: ['first', null, 'third'],
        metadata: { custom: 'data', nested: { value: 42 } },
      });

      // Serialize to JSON
      const json = EntityUtils.toJSON(originalUser);

      // Deserialize back to entity
      const parsedUser = await EntityUtils.parse(User, json);

      // Use lodash isEqual to compare the entire structure
      expect(isEqual(originalUser, parsedUser)).toBe(true);

      // Additional instanceof checks
      expect(parsedUser).toBeInstanceOf(User);
      expect(parsedUser.address).toBeInstanceOf(Address);
      expect(parsedUser.phones[0]).toBeInstanceOf(Phone);
      expect(parsedUser.phones[1]).toBeInstanceOf(Phone);
      expect(parsedUser.createdAt).toBeInstanceOf(Date);

      // Verify primitive types
      expect(typeof parsedUser.name).toBe('string');
      expect(typeof parsedUser.age).toBe('number');
      expect(typeof parsedUser.active).toBe('boolean');
      expect(typeof parsedUser.balance).toBe('bigint');

      // Verify arrays
      expect(Array.isArray(parsedUser.phones)).toBe(true);
      expect(Array.isArray(parsedUser.tags)).toBe(true);
      expect(Array.isArray(parsedUser.scores)).toBe(true);
      expect(Array.isArray(parsedUser.sparseList)).toBe(true);

      // Verify optional property
      expect(parsedUser.nickname).toBeUndefined();

      // Verify specific values
      expect(parsedUser.name).toBe('John Doe');
      expect(parsedUser.age).toBe(30);
      expect(parsedUser.active).toBe(true);
      expect(parsedUser.balance).toBe(BigInt('999999999999999999'));
      expect(parsedUser.address.street).toBe('123 Main St');
      expect(parsedUser.address.city).toBe('Boston');
      expect(parsedUser.address.zipCode).toBe(12345);
      expect(parsedUser.phones).toHaveLength(2);
      expect(parsedUser.phones[0].type).toBe('mobile');
      expect(parsedUser.phones[0].number).toBe('555-0001');
      expect(parsedUser.phones[1].type).toBe('home');
      expect(parsedUser.phones[1].number).toBe('555-0002');
      expect(parsedUser.tags).toEqual(['developer', 'typescript', 'nodejs']);
      expect(parsedUser.scores).toEqual([95, 87, 92]);
      expect(parsedUser.sparseList).toEqual(['first', null, 'third']);
      expect(parsedUser.metadata).toEqual({
        custom: 'data',
        nested: { value: 42 },
      });
      expect(parsedUser.createdAt.toISOString()).toBe(
        '2024-01-15T10:30:00.000Z',
      );
    });
  });
});
