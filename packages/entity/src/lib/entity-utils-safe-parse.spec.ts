/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import { Property } from './property.js';
import { Entity, EntityValidator } from './entity.js';
import { Problem } from './problem.js';

describe('EntityUtils', () => {
  describe('safeParse', () => {
    describe('basic success cases', () => {
      it('should return success with data when parsing valid input', async () => {
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

        const json = { name: 'John', age: 30 };
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeInstanceOf(User);
          expect(result.data.name).toBe('John');
          expect(result.data.age).toBe(30);
          expect(result.problems).toEqual([]);
        }
      });

      it('should return success with empty problems array in strict mode', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const result = await EntityUtils.safeParse(User, json, {
          strict: true,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.problems).toEqual([]);
        }
      });
    });

    describe('validation problems in non-strict mode', () => {
      it('should return success with soft validation problems when strict is false', async () => {
        @Entity()
        class User {
          @Property({
            type: () => String,
            validators: [
              ({ value }) => {
                if (typeof value === 'string' && value.length < 3) {
                  return [
                    new Problem({
                      property: '',
                      message: 'Name must be at least 3 characters',
                    }),
                  ];
                }
                return [];
              },
            ],
          })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'Jo' };
        const result = await EntityUtils.safeParse(User, json, {
          strict: false,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeInstanceOf(User);
          expect(result.data.name).toBe('Jo');
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('name');
          expect(result.problems[0].message).toBe(
            'Name must be at least 3 characters',
          );
        }
      });

      it('should return success with empty problems when no validation issues in non-strict mode', async () => {
        @Entity()
        class User {
          @Property({
            type: () => String,
            validators: [
              ({ value }) => {
                if (typeof value === 'string' && value.length < 3) {
                  return [
                    new Problem({
                      property: '',
                      message: 'Name must be at least 3 characters',
                    }),
                  ];
                }
                return [];
              },
            ],
          })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const result = await EntityUtils.safeParse(User, json, {
          strict: false,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeInstanceOf(User);
          expect(result.problems).toEqual([]);
        }
      });
    });

    describe('validation problems in strict mode', () => {
      it('should return failure when validation fails in strict mode', async () => {
        @Entity()
        class User {
          @Property({
            type: () => String,
            validators: [
              ({ value }) => {
                if (typeof value === 'string' && value.length < 3) {
                  return [
                    new Problem({
                      property: '',
                      message: 'Name must be at least 3 characters',
                    }),
                  ];
                }
                return [];
              },
            ],
          })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'Jo' };
        const result = await EntityUtils.safeParse(User, json, {
          strict: true,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('name');
          expect(result.problems[0].message).toBe(
            'Name must be at least 3 characters',
          );
        }
      });
    });

    describe('hard validation errors', () => {
      it('should return failure for missing required property', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name?: string }) {
            Object.assign(this, data);
          }
        }

        const json = {};
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('name');
          expect(result.problems[0].message).toBe(
            'Required property is missing from input',
          );
        }
      });

      it('should return failure for null value on required property', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string | null }) {
            Object.assign(this, data);
          }
        }

        const json = { name: null };
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('name');
          expect(result.problems[0].message).toBe(
            'Cannot be null or undefined',
          );
        }
      });

      it('should return failure for type mismatch', async () => {
        @Entity()
        class User {
          @Property({ type: () => Number })
          age!: number;

          constructor(data: { age: number }) {
            Object.assign(this, data);
          }
        }

        const json = { age: 'not a number' };
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('age');
          expect(result.problems[0].message).toContain('number');
        }
      });

      it('should return failure for invalid input type', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safeParse(User, null);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems.length).toBeGreaterThan(0);
        }
      });
    });

    describe('nested entities', () => {
      it('should return success with nested entity data', async () => {
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

          @Property({ type: () => Address })
          address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'John',
          address: { street: '123 Main St' },
        };
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('John');
          expect(result.data.address).toBeInstanceOf(Address);
          expect(result.data.address.street).toBe('123 Main St');
          expect(result.problems).toEqual([]);
        }
      });

      it('should return failure with nested entity validation errors', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          constructor(data: { street?: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;

          constructor(data: { name: string; address?: Address }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'John',
          address: {},
        };
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('address.street');
        }
      });

      it('should return success with soft problems in nested entity when not strict', async () => {
        @Entity()
        class Address {
          @Property({
            type: () => String,
            validators: [
              ({ value }) => {
                if (typeof value === 'string' && value.length < 5) {
                  return [
                    new Problem({
                      property: '',
                      message: 'Street must be at least 5 characters',
                    }),
                  ];
                }
                return [];
              },
            ],
          })
          street!: string;

          constructor(data: { street: string }) {
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
          address: { street: 'Main' },
        };
        const result = await EntityUtils.safeParse(User, json, {
          strict: false,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('John');
          expect(result.data.address.street).toBe('Main');
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('address.street');
          expect(result.problems[0].message).toBe(
            'Street must be at least 5 characters',
          );
        }
      });
    });

    describe('arrays', () => {
      it('should return success with array data', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];

          constructor(data: { tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: ['admin', 'user'] };
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.tags).toEqual(['admin', 'user']);
          expect(result.problems).toEqual([]);
        }
      });

      it('should return failure with array validation errors', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];

          constructor(data: { tags?: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: ['admin', 123] };
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems.length).toBeGreaterThan(0);
          expect(result.problems[0].property).toContain('tags');
        }
      });
    });

    describe('entity validators', () => {
      it('should return success with entity validator problems when not strict', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }

          @EntityValidator()
          validateAge(): Problem[] {
            if (this.age < 18) {
              return [
                new Problem({
                  property: 'age',
                  message: 'Must be at least 18 years old',
                }),
              ];
            }
            return [];
          }
        }

        const json = { name: 'John', age: 15 };
        const result = await EntityUtils.safeParse(User, json, {
          strict: false,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.age).toBe(15);
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('age');
          expect(result.problems[0].message).toBe(
            'Must be at least 18 years old',
          );
        }
      });

      it('should return failure with entity validator problems when strict', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }

          @EntityValidator()
          validateAge(): Problem[] {
            if (this.age < 18) {
              return [
                new Problem({
                  property: 'age',
                  message: 'Must be at least 18 years old',
                }),
              ];
            }
            return [];
          }
        }

        const json = { name: 'John', age: 15 };
        const result = await EntityUtils.safeParse(User, json, {
          strict: true,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].property).toBe('age');
          expect(result.problems[0].message).toBe(
            'Must be at least 18 years old',
          );
        }
      });
    });

    describe('default strict behavior', () => {
      it('should default to non-strict mode (strict: false)', async () => {
        @Entity()
        class User {
          @Property({
            type: () => String,
            validators: [
              ({ value }) => {
                if (typeof value === 'string' && value.length < 3) {
                  return [
                    new Problem({
                      property: '',
                      message: 'Name must be at least 3 characters',
                    }),
                  ];
                }
                return [];
              },
            ],
          })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'Jo' };
        const result = await EntityUtils.safeParse(User, json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.problems).toHaveLength(1);
        }
      });
    });
  });
});
