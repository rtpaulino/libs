/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import {
  Property,
  StringProperty,
  ArrayProperty,
  PassthroughProperty,
} from './property.js';
import { Entity } from './entity.js';

describe('EntityUtils', () => {
  describe('toJSON', () => {
    describe('simple entities', () => {
      it('should serialize only @Property decorated properties', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) age!: number;
          undecorated!: string;

          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', age: 30 });
        user.undecorated = 'should not appear';

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          age: 30,
        });
        expect(json).not.toHaveProperty('undecorated');
      });

      it('should exclude undefined values', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) age?: number;
          @Property({ type: () => Object }) email?: string;

          constructor(data: { name: string; age?: number; email?: string }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John' });
        // age and email are undefined

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
        });
        expect(json).not.toHaveProperty('age');
        expect(json).not.toHaveProperty('email');
      });

      it('should include null values', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) age!: number | null;
          @Property({ type: () => Object }) email!: string | null;

          constructor(data: {
            name: string;
            age: number | null;
            email: string | null;
          }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', age: null, email: null });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          age: null,
          email: null,
        });
      });

      it('should serialize primitives correctly', () => {
        @Entity()
        class Data {
          @Property({ type: () => Object }) str!: string;
          @Property({ type: () => Object }) num!: number;
          @Property({ type: () => Object }) bool!: boolean;
          @Property({ type: () => Object }) zero!: number;
          @Property({ type: () => Object }) empty!: string;

          constructor(data: {
            str: string;
            num: number;
            bool: boolean;
            zero: number;
            empty: string;
          }) {
            Object.assign(this, data);
          }
        }

        const data = new Data({
          str: 'test',
          num: 42,
          bool: true,
          zero: 0,
          empty: '',
        });

        const json = EntityUtils.toJSON(data);

        expect(json).toEqual({
          str: 'test',
          num: 42,
          bool: true,
          zero: 0,
          empty: '',
        });
      });
    });

    describe('inheritance', () => {
      it('should serialize properties from parent and child classes', () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Object }) id!: number;
          @Property({ type: () => Object }) createdAt!: Date;

          constructor(data: { id: number; createdAt: Date }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User extends BaseEntity {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) email!: string;

          constructor(data: {
            id: number;
            createdAt: Date;
            name: string;
            email: string;
          }) {
            super(data);
            Object.assign(this, data);
          }
        }

        const user = new User({
          id: 1,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          name: 'John',
          email: 'john@example.com',
        });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          id: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          name: 'John',
          email: 'john@example.com',
        });
      });

      it('should handle multi-level inheritance', () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Object }) id!: number;

          constructor(data: { id: number }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class TimestampedEntity extends BaseEntity {
          @Property({ type: () => Object }) createdAt!: Date;

          constructor(data: { id: number; createdAt: Date }) {
            super(data);
            Object.assign(this, data);
          }
        }

        @Entity()
        class User extends TimestampedEntity {
          @Property({ type: () => Object }) name!: string;

          constructor(data: { id: number; createdAt: Date; name: string }) {
            super(data);
            Object.assign(this, data);
          }
        }

        const user = new User({
          id: 1,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          name: 'John',
        });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          id: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          name: 'John',
        });
      });
    });

    describe('Date serialization', () => {
      it('should serialize Date to ISO string', () => {
        @Entity()
        class Event {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) date!: Date;

          constructor(data: { name: string; date: Date }) {
            Object.assign(this, data);
          }
        }

        const event = new Event({
          name: 'Meeting',
          date: new Date('2024-06-15T14:30:00.000Z'),
        });

        const json = EntityUtils.toJSON(event);

        expect(json).toEqual({
          name: 'Meeting',
          date: '2024-06-15T14:30:00.000Z',
        });
      });

      it('should handle null Date', () => {
        @Entity()
        class Event {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) date!: Date | null;

          constructor(data: { name: string; date: Date | null }) {
            Object.assign(this, data);
          }
        }

        const event = new Event({ name: 'Meeting', date: null });

        const json = EntityUtils.toJSON(event);

        expect(json).toEqual({
          name: 'Meeting',
          date: null,
        });
      });
    });

    describe('bigint serialization', () => {
      it('should serialize bigint to string', () => {
        @Entity()
        class Data {
          @Property({ type: () => Object }) id!: bigint;
          @Property({ type: () => Object }) largeNumber!: bigint;

          constructor(data: { id: bigint; largeNumber: bigint }) {
            Object.assign(this, data);
          }
        }

        const data = new Data({
          id: BigInt(123),
          largeNumber: BigInt('9007199254740991999'),
        });

        const json = EntityUtils.toJSON(data);

        expect(json).toEqual({
          id: '123',
          largeNumber: '9007199254740991999',
        });
      });

      it('should handle null bigint', () => {
        @Entity()
        class Data {
          @Property({ type: () => Object }) id!: bigint | null;

          constructor(data: { id: bigint | null }) {
            Object.assign(this, data);
          }
        }

        const data = new Data({ id: null });

        const json = EntityUtils.toJSON(data);

        expect(json).toEqual({
          id: null,
        });
      });
    });

    describe('nested entities', () => {
      it('should recursively serialize nested entities', () => {
        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
          @Property({ type: () => Object }) city!: string;
          @Property({ type: () => Object }) zipCode!: string;

          constructor(data: { street: string; city: string; zipCode: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const address = new Address({
          street: '789 Pine',
          city: 'LA',
          zipCode: '90001',
        });
        address.street = '123 Main St';
        address.city = 'Boston';
        address.zipCode = '02101';

        const user = new User({ name: 'John', address });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'Boston',
            zipCode: '02101',
          },
        });
      });

      it('should handle null nested entities', () => {
        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;

          constructor(data: { street: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address | null;

          constructor(data: { name: string; address: Address | null }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', address: null });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          address: null,
        });
      });

      it('should handle deeply nested entities', () => {
        @Entity()
        class Country {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) code!: string;

          constructor(data: { name: string; code: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
          @Property({ type: () => Object }) country!: Country;

          constructor(data: { street: string; country: Country }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const country = new Country({ name: 'USA', code: 'US' });
        const address = new Address({ street: '123 Main St', country });
        const user = new User({ name: 'John', address });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          address: {
            street: '123 Main St',
            country: {
              name: 'USA',
              code: 'US',
            },
          },
        });
      });
    });

    describe('array serialization', () => {
      it('should serialize arrays of primitives', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) tags!: string[];
          @Property({ type: () => Object }) scores!: number[];

          constructor(data: {
            name: string;
            tags: string[];
            scores: number[];
          }) {
            Object.assign(this, data);
          }
        }

        const user = new User({
          name: 'John',
          tags: ['developer', 'typescript', 'node'],
          scores: [95, 87, 92],
        });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          tags: ['developer', 'typescript', 'node'],
          scores: [95, 87, 92],
        });
      });

      it('should serialize arrays of entities', () => {
        @Entity()
        class Phone {
          @Property({ type: () => Object }) type!: string;
          @Property({ type: () => Object }) number!: string;

          constructor(data: { type: string; number: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) phones!: Phone[];

          constructor(data: { name: string; phones: Phone[] }) {
            Object.assign(this, data);
          }
        }

        const phone1 = new Phone({ type: 'mobile', number: '555-0001' });
        const phone2 = new Phone({ type: 'work', number: '555-0002' });
        const user = new User({ name: 'John', phones: [phone1, phone2] });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          phones: [
            { type: 'mobile', number: '555-0001' },
            { type: 'work', number: '555-0002' },
          ],
        });
      });

      it('should serialize arrays containing mixed types including entities', () => {
        @Entity()
        class Tag {
          @Property({ type: () => Object }) name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class Post {
          @Property({ type: () => Object }) title!: string;
          @Property({ type: () => Object }) tags!: (Tag | string)[];

          constructor(data: { title: string; tags: (Tag | string)[] }) {
            Object.assign(this, data);
          }
        }

        const tag = new Tag({ name: 'important' });
        const post = new Post({
          title: 'My Post',
          tags: [tag, 'typescript', 'coding'],
        });

        const json = EntityUtils.toJSON(post);

        expect(json).toEqual({
          title: 'My Post',
          tags: [{ name: 'important' }, 'typescript', 'coding'],
        });
      });

      it('should handle empty arrays', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) tags!: string[];

          constructor(data: { name: string; tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', tags: [] });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          tags: [],
        });
      });

      it('should serialize arrays of Dates', () => {
        @Entity()
        class Event {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) dates!: Date[];

          constructor(data: { name: string; dates: Date[] }) {
            Object.assign(this, data);
          }
        }

        const event = new Event({
          name: 'Conference',
          dates: [
            new Date('2024-01-01T00:00:00.000Z'),
            new Date('2024-01-02T00:00:00.000Z'),
          ],
        });

        const json = EntityUtils.toJSON(event);

        expect(json).toEqual({
          name: 'Conference',
          dates: ['2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z'],
        });
      });

      it('should serialize arrays of bigints', () => {
        @Entity()
        class Data {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) ids!: bigint[];

          constructor(data: { name: string; ids: bigint[] }) {
            Object.assign(this, data);
          }
        }

        const data = new Data({
          name: 'test',
          ids: [BigInt(1), BigInt(2), BigInt(999999999999)],
        });

        const json = EntityUtils.toJSON(data);

        expect(json).toEqual({
          name: 'test',
          ids: ['1', '2', '999999999999'],
        });
      });

      it('should handle nested arrays', () => {
        @Entity()
        class Matrix {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) data!: number[][];

          constructor(data: { name: string; data: number[][] }) {
            Object.assign(this, data);
          }
        }

        const matrix = new Matrix({
          name: 'test-matrix',
          data: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        });

        const json = EntityUtils.toJSON(matrix);

        expect(json).toEqual({
          name: 'test-matrix',
          data: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        });
      });
    });

    describe('custom serialize/deserialize', () => {
      it('should use custom serialize function when provided', () => {
        class CustomObject {
          constructor(
            public value: string,
            public secret: string,
          ) {}
        }

        @Entity()
        class User {
          @StringProperty() name!: string;
          @Property({
            type: () => CustomObject,
            serialize: (obj: CustomObject) => ({
              customValue: obj.value.toUpperCase(),
            }),
            deserialize: (json: any) =>
              new CustomObject(json.customValue.toLowerCase(), ''),
          })
          data!: CustomObject;

          constructor(data: { name: string; data: CustomObject }) {
            Object.assign(this, data);
          }
        }

        const user = new User({
          name: 'John',
          data: new CustomObject('hello', 'password'),
        });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          data: { customValue: 'HELLO' },
        });
      });

      it('should use custom deserialize function for symmetric round-trip', async () => {
        class CustomObject {
          constructor(
            public value: string,
            public secret: string,
          ) {}
        }

        @Entity()
        class User {
          @StringProperty() name!: string;
          @Property({
            type: () => CustomObject,
            serialize: (obj: CustomObject) => ({
              customValue: obj.value.toUpperCase(),
            }),
            deserialize: (json: any) =>
              new CustomObject(json.customValue.toLowerCase(), ''),
          })
          data!: CustomObject;

          constructor(data: { name: string; data: CustomObject }) {
            Object.assign(this, data);
          }
        }

        const original = new User({
          name: 'John',
          data: new CustomObject('hello', 'password'),
        });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(User, json);

        expect(parsed.name).toBe('John');
        expect(parsed.data).toBeInstanceOf(CustomObject);
        expect(parsed.data.value).toBe('hello');
      });

      it('should handle custom serialize/deserialize in arrays', async () => {
        class CustomObject {
          constructor(public value: string) {}
        }

        @Entity()
        class Container {
          @ArrayProperty(() => CustomObject, {
            serialize: (obj: CustomObject) => ({
              transformed: obj.value.toUpperCase(),
            }),
            deserialize: (json: any) => new CustomObject(json.transformed),
          } as any)
          items!: CustomObject[];

          constructor(data: { items: CustomObject[] }) {
            Object.assign(this, data);
          }
        }

        const container = new Container({
          items: [new CustomObject('hello'), new CustomObject('world')],
        });

        const json = EntityUtils.toJSON(container);

        expect(json).toEqual({
          items: [{ transformed: 'HELLO' }, { transformed: 'WORLD' }],
        });

        const parsed = await EntityUtils.parse(Container, json);
        expect(parsed.items).toHaveLength(2);
        expect(parsed.items[0]).toBeInstanceOf(CustomObject);
        expect(parsed.items[0].value).toBe('HELLO');
      });

      it('should throw error when only serialize is defined', () => {
        expect(() => {
          @Entity()
          class User {
            @Property({
              type: () => String,
              serialize: (val: string) => val.toUpperCase(),
            } as any)
            name!: string;
          }
          new User();
        }).toThrow(/must define both serialize and deserialize/);
      });

      it('should throw error when only deserialize is defined', () => {
        expect(() => {
          @Entity()
          class User {
            @Property({
              type: () => String,
              deserialize: (val: any) => val.toLowerCase(),
            } as any)
            name!: string;
          }
          new User();
        }).toThrow(/must define both serialize and deserialize/);
      });

      it('should not use serialize/deserialize when passthrough is true', async () => {
        @Entity()
        class User {
          @Property({
            type: () => String,
            passthrough: true,
          })
          metadata!: Record<string, unknown>;

          constructor(data: { metadata: Record<string, unknown> }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ metadata: { nested: { data: 'value' } } });

        const json = EntityUtils.toJSON(user);
        expect(json.metadata).toEqual({ nested: { data: 'value' } });

        const parsed = await EntityUtils.parse(User, json);
        expect(parsed.metadata).toEqual({ nested: { data: 'value' } });
      });

      it('should throw error when passthrough is combined with serialize', () => {
        expect(() => {
          @Entity()
          class User {
            @Property({
              type: () => String,
              passthrough: true,
              serialize: (val: any) => val,
              deserialize: (val: any) => val,
            } as any)
            data!: any;
          }
          new User();
        }).toThrow(
          /passthrough: true and custom serialize\/deserialize functions/,
        );
      });

      it('should throw error when passthrough is combined with deserialize', () => {
        expect(() => {
          @Entity()
          class User {
            @Property({
              type: () => String,
              passthrough: true,
              serialize: (val: any) => val,
              deserialize: (val: any) => val,
            } as any)
            data!: any;
          }
          new User();
        }).toThrow(
          /passthrough: true and custom serialize\/deserialize functions/,
        );
      });

      it('should handle complex transformations with nested data', async () => {
        class Point {
          constructor(
            public x: number,
            public y: number,
          ) {}
        }

        @Entity()
        class Shape {
          @StringProperty() name!: string;
          @Property({
            type: () => Point,
            serialize: (point: Point) => `${point.x},${point.y}`,
            deserialize: (str: any) => {
              const [x, y] = str.split(',').map(Number);
              return new Point(x, y);
            },
          })
          position!: Point;
          constructor(data: { name: string; position: Point }) {
            Object.assign(this, data);
          }
        }

        const shape = new Shape({
          name: 'circle',
          position: new Point(10, 20),
        });

        const json = EntityUtils.toJSON(shape);
        expect(json).toEqual({
          name: 'circle',
          position: '10,20',
        });

        const parsed = await EntityUtils.parse(Shape, json);
        expect(parsed.position).toBeInstanceOf(Point);
        expect(parsed.position.x).toBe(10);
        expect(parsed.position.y).toBe(20);
      });

      it('should maintain serialization order with serialize callbacks', () => {
        class Wrapper {
          constructor(public value: string) {}
        }

        @Entity()
        class Data {
          @Property({
            type: () => Wrapper,
            serialize: (w: Wrapper) => ({ wrapped: w.value }),
            deserialize: (json: any) => new Wrapper(json.wrapped),
          })
          first!: Wrapper;

          @StringProperty() middle!: string;

          @Property({
            type: () => Wrapper,
            serialize: (w: Wrapper) => ({ wrapped: w.value }),
            deserialize: (json: any) => new Wrapper(json.wrapped),
          })
          last!: Wrapper;
        }

        const data = new Data();
        data.first = new Wrapper('a');
        data.middle = 'b';
        data.last = new Wrapper('c');

        const json = EntityUtils.toJSON(data);
        const keys = Object.keys(json);
        expect(keys).toEqual(['first', 'middle', 'last']);
      });
    });

    describe('complex scenarios', () => {
      it('should handle entity with all types combined', () => {
        @Entity()
        class Tag {
          @Property({ type: () => Object }) name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
          @Property({ type: () => Object }) city!: string;

          constructor(data: { street: string; city: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) id!: bigint;
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) age!: number;
          @Property({ type: () => Object }) active!: boolean;
          @Property({ type: () => Object }) email!: string | null;
          @Property({ type: () => Object }) phone?: string;
          @Property({ type: () => Object }) createdAt!: Date;
          @Property({ type: () => Object }) address!: Address;
          @Property({ type: () => Object }) tags!: Tag[];
          @Property({ type: () => Object }) scores!: number[];
          undecorated!: string;

          constructor(data: {
            id: bigint;
            name: string;
            age: number;
            active: boolean;
            email: string | null;
            phone?: string;
            createdAt: Date;
            address: Address;
            tags: Tag[];
            scores: number[];
          }) {
            Object.assign(this, data);
          }
        }

        const tag1 = new Tag({ name: 'developer' });
        const tag2 = new Tag({ name: 'typescript' });
        const address = new Address({ street: '123 Main St', city: 'Boston' });

        const user = new User({
          id: BigInt(12345),
          name: 'John',
          age: 30,
          active: true,
          email: null,
          createdAt: new Date('2024-01-01T12:00:00.000Z'),
          address,
          tags: [tag1, tag2],
          scores: [95, 87, 92],
        });
        user.undecorated = 'should not appear';

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          id: '12345',
          name: 'John',
          age: 30,
          active: true,
          email: null,
          createdAt: '2024-01-01T12:00:00.000Z',
          address: {
            street: '123 Main St',
            city: 'Boston',
          },
          tags: [{ name: 'developer' }, { name: 'typescript' }],
          scores: [95, 87, 92],
        });
        expect(json).not.toHaveProperty('phone');
        expect(json).not.toHaveProperty('undecorated');
      });
    });

    describe('edge cases', () => {
      it('should handle entity with no properties set', () => {
        @Entity()
        class Empty {
          @Property({ type: () => Object }) name?: string;
          @Property({ type: () => Object }) age?: number;

          constructor(data: { name?: string; age?: number } = {}) {
            Object.assign(this, data);
          }
        }

        const empty = new Empty();

        const json = EntityUtils.toJSON(empty);

        expect(json).toEqual({});
      });

      it('should handle entity with only null properties', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string | null;
          @Property({ type: () => Object }) email!: string | null;

          constructor(data: { name: string | null; email: string | null }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: null, email: null });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: null,
          email: null,
        });
      });

      it('should handle plain objects as property values', () => {
        @Entity()
        class Config {
          @Property({ type: () => String })
          name!: string;

          @PassthroughProperty()
          settings!: Record<string, unknown>;

          constructor(data: {
            name: string;
            settings: Record<string, unknown>;
          }) {
            Object.assign(this, data);
          }
        }

        const config = new Config({
          name: 'app-config',
          settings: {
            theme: 'dark',
            fontSize: 14,
            features: { beta: true },
          },
        });

        const json = EntityUtils.toJSON(config);

        expect(json).toEqual({
          name: 'app-config',
          settings: {
            theme: 'dark',
            fontSize: 14,
            features: { beta: true },
          },
        });
      });

      it('should throw error for plain objects without passthrough', () => {
        @Entity()
        class Config {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Object })
          settings!: Record<string, unknown>;

          constructor(data: {
            name: string;
            settings: Record<string, unknown>;
          }) {
            Object.assign(this, data);
          }
        }

        const config = new Config({
          name: 'app-config',
          settings: { theme: 'dark' },
        });

        expect(() => EntityUtils.toJSON(config)).toThrow(
          "Cannot serialize value of type 'object'",
        );
      });
    });
  });
});
