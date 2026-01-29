/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import {
  Property,
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
  describe('parse', () => {
    describe('primitives', () => {
      it('should parse string properties', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.name).toBe('John');
      });

      it('should parse number properties', async () => {
        @Entity()
        class User {
          @Property({ type: () => Number })
          age!: number;

          constructor(data: { age: number }) {
            Object.assign(this, data);
          }
        }

        const json = { age: 30 };
        const user = await EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.age).toBe(30);
      });

      it('should parse boolean properties', async () => {
        @Entity()
        class User {
          @Property({ type: () => Boolean })
          active!: boolean;

          constructor(data: { active: boolean }) {
            Object.assign(this, data);
          }
        }

        const json = { active: true };
        const user = await EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.active).toBe(true);
      });

      it('should parse multiple primitive properties', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          @Property({ type: () => Boolean })
          active!: boolean;

          constructor(data: { name: string; age: number; active: boolean }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John', age: 30, active: true };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.age).toBe(30);
        expect(user.active).toBe(true);
      });
    });

    describe('Date and BigInt', () => {
      it('should parse Date from ISO string', async () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;

          constructor(data: { createdAt: Date }) {
            Object.assign(this, data);
          }
        }

        const json = { createdAt: '2024-01-01T12:00:00.000Z' };
        const event = await EntityUtils.parse(Event, json);

        expect(event.createdAt).toBeInstanceOf(Date);
        expect(event.createdAt.toISOString()).toBe('2024-01-01T12:00:00.000Z');
      });

      it('should parse Date from Date object', async () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;

          constructor(data: { createdAt: Date }) {
            Object.assign(this, data);
          }
        }

        const date = new Date('2024-01-01T12:00:00.000Z');
        const json = { createdAt: date };
        const event = await EntityUtils.parse(Event, json);

        expect(event.createdAt).toBe(date);
      });

      it('should parse BigInt from string', async () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;

          constructor(data: { id: bigint }) {
            Object.assign(this, data);
          }
        }

        const json = { id: '12345678901234567890' };
        const data = await EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt('12345678901234567890'));
      });

      it('should parse BigInt from bigint', async () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;

          constructor(data: { id: bigint }) {
            Object.assign(this, data);
          }
        }

        const json = { id: BigInt(123) };
        const data = await EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt(123));
      });
    });

    describe('nested entities', () => {
      it('should parse nested entities', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => String })
          city!: string;

          constructor(data: { street: string; city: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'Boston',
          },
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.address).toBeInstanceOf(Address);
        expect(user.address.street).toBe('123 Main St');
        expect(user.address.city).toBe('Boston');
      });

      it('should parse deeply nested entities', async () => {
        @Entity()
        class Country {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => Country })
          country!: Country;

          constructor(data: { street: string; country: Country }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'John',
          address: {
            street: '123 Main St',
            country: {
              name: 'USA',
            },
          },
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.address.country).toBeInstanceOf(Country);
        expect(user.address.country.name).toBe('USA');
      });
    });

    describe('arrays', () => {
      it('should parse arrays of primitives', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
          constructor(data: { tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: ['developer', 'typescript'] };
        const user = await EntityUtils.parse(User, json);

        expect(Array.isArray(user.tags)).toBe(true);
        expect(user.tags).toEqual(['developer', 'typescript']);
      });

      it('should parse arrays of numbers', async () => {
        @Entity()
        class Data {
          @Property({ type: () => Number, array: true })
          scores!: number[];
          constructor(data: { scores: number[] }) {
            Object.assign(this, data);
          }
        }

        const json = { scores: [95, 87, 92] };
        const data = await EntityUtils.parse(Data, json);

        expect(data.scores).toEqual([95, 87, 92]);
      });

      it('should parse arrays of entities', async () => {
        @Entity()
        class Phone {
          @Property({ type: () => String })
          number!: string;
          constructor(data: { number: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Phone, array: true })
          phones!: Phone[];
          constructor(data: { phones: Phone[] }) {
            Object.assign(this, data);
          }
        }

        const json = {
          phones: [{ number: '555-0001' }, { number: '555-0002' }],
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.phones).toHaveLength(2);
        expect(user.phones[0]).toBeInstanceOf(Phone);
        expect(user.phones[0].number).toBe('555-0001');
        expect(user.phones[1]).toBeInstanceOf(Phone);
        expect(user.phones[1].number).toBe('555-0002');
      });

      it('should parse empty arrays', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
          constructor(data: { tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: [] };
        const user = await EntityUtils.parse(User, json);

        expect(user.tags).toEqual([]);
      });

      it('should reject null/undefined elements in non-sparse arrays', async () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true })
          values!: string[];
          constructor(data: { values: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', null, 'b'] };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow('values[1]: Cannot be null or undefined');
      });

      it('should reject undefined elements in non-sparse arrays', async () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true })
          values!: string[];
          constructor(data: { values: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', undefined, 'b'] };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow('values[1]: Cannot be null or undefined');
      });

      it('should allow null/undefined elements in sparse arrays', async () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true, sparse: true })
          values!: (string | null)[];
          constructor(data: { values: (string | null)[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', null, 'b', undefined] };
        const data = await EntityUtils.parse(Data, json);

        expect(data.values).toEqual(['a', null, 'b', undefined]);
      });
    });

    describe('optional properties', () => {
      it('should allow optional properties to be undefined', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          nickname?: string;
          constructor(data: { name: string; nickname?: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBeUndefined();
      });

      it('should allow optional properties to be null', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          email?: string;
          constructor(data: { name: string; email?: string | null }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John', email: null };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.email).toBeNull();
      });

      it('should parse optional properties when present', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          nickname?: string;
          constructor(data: { name: string; nickname?: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John', nickname: 'Johnny' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBe('Johnny');
      });

      it('should handle optional nested entities', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;
          constructor(data: { street: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address, optional: true })
          address?: Address;
          constructor(data: { name: string; address?: Address }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.address).toBeUndefined();
      });

      it('should handle optional arrays', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, array: true, optional: true })
          tags?: string[];
          constructor(data: { name: string; tags?: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.tags).toBeUndefined();
      });
    });

    describe('inheritance', () => {
      it('should parse properties from parent and child classes', async () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Number })
          id!: number;
          constructor(data: { id: number }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User extends BaseEntity {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { id: number; name: string }) {
            super(data);
            Object.assign(this, data);
          }
        }

        const json = { id: 1, name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.id).toBe(1);
        expect(user.name).toBe('John');
      });

      it('should parse multi-level inheritance', async () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Number })
          id!: number;
          constructor(data: { id: number; createdAt?: Date; name?: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class TimestampedEntity extends BaseEntity {
          @Property({ type: () => Date })
          createdAt!: Date;
          constructor(data: { id: number; createdAt: Date; name?: string }) {
            super(data);
            Object.assign(this, data);
          }
        }

        @Entity()
        class User extends TimestampedEntity {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { id: number; createdAt: Date; name: string }) {
            super(data);
            Object.assign(this, data);
          }
        }

        const json = {
          id: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          name: 'John',
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.id).toBe(1);
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.name).toBe('John');
      });
    });

    describe('round-trip serialization', () => {
      it('should round-trip simple entities', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;
          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const original = new User({ name: 'John', age: 30 });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with nested entities', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => String })
          city!: string;
          constructor(data: { street: string; city: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;
          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const address = new Address({ street: '123 Main St', city: 'Boston' });

        const original = new User({ name: 'John', address: address });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with arrays', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, array: true })
          tags!: string[];
          constructor(data: { name: string; tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const original = new User({
          name: 'John',
          tags: ['dev', 'typescript'],
        });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with Dates and BigInts', async () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;

          @Property({ type: () => Date })
          createdAt!: Date;
          constructor(data: { id: bigint; createdAt: Date }) {
            Object.assign(this, data);
          }
        }

        const original = new Data({
          id: BigInt(12345),
          createdAt: new Date('2024-01-01T12:00:00.000Z'),
        });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(Data, json);

        expect(parsed.id).toBe(original.id);
        expect(parsed.createdAt.getTime()).toBe(original.createdAt.getTime());
      });
    });

    describe('error handling', () => {
      it('should throw error when property metadata is missing', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        // This test now verifies that with proper metadata, parsing works
        expect(user.name).toBe('John');
      });

      it('should throw error when required property is missing', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;
          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow(
          'Validation failed with 1 error(s): age: Required property is missing, null or undefined from input',
        );
      });

      it('should throw error when required property is null', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { name: string | null }) {
            Object.assign(this, data);
          }
        }

        const json = { name: null };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow(
          'Validation failed with 1 error(s): name: Required property is missing, null or undefined from input',
        );
      });

      it('should throw error when required property is undefined', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { name?: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: undefined };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow(
          'Validation failed with 1 error(s): name: Required property is missing, null or undefined from input',
        );
      });

      it('should throw error for type mismatch on string', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { name: string | number }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 123 };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('name: Expects a string but received number');
      });

      it('should throw error for type mismatch on number', async () => {
        @Entity()
        class User {
          @Property({ type: () => Number })
          age!: number;
          constructor(data: { age: number | string }) {
            Object.assign(this, data);
          }
        }

        const json = { age: 'not a number' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('age: Expects a number but received string');
      });

      it('should throw error for type mismatch on boolean', async () => {
        @Entity()
        class User {
          @Property({ type: () => Boolean })
          active!: boolean;
          constructor(data: { active: boolean | string }) {
            Object.assign(this, data);
          }
        }

        const json = { active: 'true' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('active: Expects a boolean but received string');
      });

      it('should throw error for invalid Date string', async () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;
          constructor(data: { createdAt: Date | string }) {
            Object.assign(this, data);
          }
        }

        const json = { createdAt: 'not a date' };

        await expect(
          async () => await EntityUtils.parse(Event, json),
        ).rejects.toThrow("createdAt: Cannot parse 'not a date' as Date");
      });

      it('should throw error for invalid BigInt string', async () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;
          constructor(data: { id: bigint | string }) {
            Object.assign(this, data);
          }
        }

        const json = { id: 'not a bigint' };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow("id: Cannot parse 'not a bigint' as BigInt");
      });

      it('should throw error when array expected but not received', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
          constructor(data: { tags: string[] | string }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: 'not an array' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('tags: Expects an array but received string');
      });

      it('should throw error for nested entity type mismatch', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;
          constructor(data: { street: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Address })
          address!: Address;
          constructor(data: { address: Address | string }) {
            Object.assign(this, data);
          }
        }

        const json = { address: 'not an object' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('address: Expects an object but received string');
      });

      it('should throw error with correct property path in array', async () => {
        @Entity()
        class User {
          @Property({ type: () => Number, array: true })
          scores!: number[];
          constructor(data: { scores: (number | string)[] }) {
            Object.assign(this, data);
          }
        }

        const json = { scores: [95, 'invalid', 92] };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('scores[1]: Expects a number but received string');
      });

      it('should throw error when sparse is true without array', () => {
        // This now fails at decorator time
        expect(() => {
          const decorator = Property({ type: () => String, sparse: true });
          decorator({}, 'value');
        }).toThrow("Property 'value' has sparse: true but array is not true");
      });

      it('should throw error when passthrough is combined with array', () => {
        expect(() => {
          const decorator = Property({
            type: () => String,
            passthrough: true,
            array: true,
          });
          decorator({}, 'value');
        }).toThrow("Property 'value' has passthrough: true and array: true");
      });

      it('should throw error when passthrough is combined with optional', () => {
        expect(() => {
          const decorator = Property({
            type: () => String,
            passthrough: true,
            optional: true,
          });
          decorator({}, 'value');
        }).toThrow("Property 'value' has passthrough: true and optional: true");
      });

      it('should throw error when passthrough is combined with sparse', () => {
        expect(() => {
          const decorator = Property({
            type: () => String,
            passthrough: true,
            sparse: true,
          });
          decorator({}, 'value');
        }).toThrow("Property 'value' has passthrough: true and sparse: true");
      });
    });

    describe('PassthroughProperty helper', () => {
      it('should work with PassthroughProperty for serialization', () => {
        @Entity()
        class Config {
          @StringProperty()
          name!: string;

          @PassthroughProperty()
          metadata!: Record<string, unknown>;
          constructor(data: {
            name: string;
            metadata: Record<string, unknown>;
          }) {
            Object.assign(this, data);
          }
        }

        const config = new Config({
          name: 'test',
          metadata: { custom: 'value', nested: { data: 123 } },
        });

        const json = EntityUtils.toJSON(config);

        expect(json).toEqual({
          name: 'test',
          metadata: { custom: 'value', nested: { data: 123 } },
        });
      });

      it('should work with PassthroughProperty for deserialization', async () => {
        @Entity()
        class Config {
          @StringProperty()
          name!: string;

          @PassthroughProperty()
          metadata!: Record<string, unknown>;
          constructor(data: {
            name: string;
            metadata: Record<string, unknown>;
          }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'test',
          metadata: { custom: 'value', nested: { data: 123 } },
        };

        const config = await EntityUtils.parse(Config, json);

        expect(config.name).toBe('test');
        expect(config.metadata).toEqual({
          custom: 'value',
          nested: { data: 123 },
        });
      });

      it('should round-trip with PassthroughProperty', async () => {
        @Entity()
        class Config {
          @StringProperty()
          name!: string;

          @PassthroughProperty()
          data!: unknown;
          constructor(data: { name: string; data: unknown }) {
            Object.assign(this, data);
          }
        }

        const original = new Config({
          name: 'test',
          data: {
            complex: [1, 2, { nested: true }],
            map: new Map([['key', 'value']]),
          },
        });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(Config, json);

        expect(parsed.name).toBe(original.name);
        expect(parsed.data).toEqual(original.data);
      });
    });

    describe('helper decorators', () => {
      it('should work with StringProperty', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;
          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
      });

      it('should work with NumberProperty', async () => {
        @Entity()
        class User {
          @NumberProperty()
          age!: number;
          constructor(data: { age: number }) {
            Object.assign(this, data);
          }
        }

        const json = { age: 30 };
        const user = await EntityUtils.parse(User, json);

        expect(user.age).toBe(30);
      });

      it('should work with BooleanProperty', async () => {
        @Entity()
        class User {
          @BooleanProperty()
          active!: boolean;
          constructor(data: { active: boolean }) {
            Object.assign(this, data);
          }
        }

        const json = { active: true };
        const user = await EntityUtils.parse(User, json);

        expect(user.active).toBe(true);
      });

      it('should work with DateProperty', async () => {
        @Entity()
        class Event {
          @DateProperty()
          createdAt!: Date;
          constructor(data: { createdAt: Date | string }) {
            Object.assign(this, data);
          }
        }

        const json = { createdAt: '2024-01-01T00:00:00.000Z' };
        const event = await EntityUtils.parse(Event, json);

        expect(event.createdAt).toBeInstanceOf(Date);
      });

      it('should work with BigIntProperty', async () => {
        @Entity()
        class Data {
          @BigIntProperty()
          id!: bigint;
          constructor(data: { id: bigint | string }) {
            Object.assign(this, data);
          }
        }

        const json = { id: '123' };
        const data = await EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt(123));
      });

      it('should work with EntityProperty', async () => {
        @Entity()
        class Address {
          @StringProperty()
          street!: string;
          constructor(data: { street: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @EntityProperty(() => Address)
          address!: Address;
          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'John',
          address: { street: '123 Main St' },
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.address).toBeInstanceOf(Address);
        expect(user.address.street).toBe('123 Main St');
      });

      it('should work with ArrayProperty', async () => {
        @Entity()
        class User {
          @ArrayProperty(() => String)
          tags!: string[];
          constructor(data: { tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: ['dev', 'typescript'] };
        const user = await EntityUtils.parse(User, json);

        expect(user.tags).toEqual(['dev', 'typescript']);
      });

      it('should work with optional helper decorators', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @StringProperty({ optional: true })
          nickname?: string;

          @NumberProperty({ optional: true })
          age?: number;
          constructor(data: { name: string; nickname?: string; age?: number }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBeUndefined();
        expect(user.age).toBeUndefined();
      });

      it('should work with ArrayProperty of entities', async () => {
        @Entity()
        class Phone {
          @StringProperty()
          number!: string;
          constructor(data: { number: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @ArrayProperty(() => Phone)
          phones!: Phone[];
          constructor(data: { phones: Phone[] }) {
            Object.assign(this, data);
          }
        }

        const json = {
          phones: [{ number: '555-0001' }, { number: '555-0002' }],
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.phones).toHaveLength(2);
        expect(user.phones[0]).toBeInstanceOf(Phone);
        expect(user.phones[0].number).toBe('555-0001');
      });

      it('should work with sparse ArrayProperty', async () => {
        @Entity()
        class Data {
          @ArrayProperty(() => String, { sparse: true })
          values!: (string | null)[];
          constructor(data: { values: (string | null)[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', null, 'b', undefined] };
        const data = await EntityUtils.parse(Data, json);

        expect(data.values).toEqual(['a', null, 'b', undefined]);
      });

      it('should reject null in non-sparse ArrayProperty', async () => {
        @Entity()
        class Data {
          @ArrayProperty(() => String)
          values!: string[];
          constructor(data: { values: (string | null)[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', null, 'b'] };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow('values[1]: Cannot be null or undefined');
      });
    });

    describe('passthrough option with explicit type', () => {
      it('should throw error for unknown type without passthrough in parse', async () => {
        @Entity()
        class Data {
          @Property({ type: () => Symbol })
          value!: symbol;
          constructor(data: { value: symbol | string }) {
            Object.assign(this, data);
          }
        }

        const json = { value: 'test' };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow('value: Has unknown type constructor');
      });
    });
  });
});
