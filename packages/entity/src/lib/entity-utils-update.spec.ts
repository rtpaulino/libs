/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import { Property } from './property.js';
import { Entity, EntityValidator } from './entity.js';
import { Problem } from './problem.js';

describe('EntityUtils', () => {
  describe('update', () => {
    describe('basic update', () => {
      it('should update basic properties', async () => {
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

        const user = new User({ name: 'John', age: 30 });
        const updated = await EntityUtils.update(user, {
          name: 'Jane',
          age: 31,
        });

        expect(updated).toBeInstanceOf(User);
        expect(updated.name).toBe('Jane');
        expect(updated.age).toBe(31);
      });

      it('should update partial properties', async () => {
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

        const user = new User({ name: 'John', age: 30 });
        const updated = await EntityUtils.update(user, { name: 'Jane' });

        expect(updated.name).toBe('Jane');
        expect(updated.age).toBe(30); // unchanged
      });

      it('should not mutate original instance', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John' });
        const updated = await EntityUtils.update(user, { name: 'Jane' });

        expect(user.name).toBe('John');
        expect(updated.name).toBe('Jane');
        expect(user).not.toBe(updated);
      });
    });

    describe('preventUpdates flag', () => {
      it('should not update properties with preventUpdates: true', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, preventUpdates: true })
          id!: string;

          @Property({ type: () => String })
          name!: string;

          constructor(data: { id: string; name: string }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ id: '123', name: 'John' });
        const updated = await EntityUtils.update(user, {
          id: '456',
          name: 'Jane',
        });

        expect(updated.id).toBe('123'); // not updated
        expect(updated.name).toBe('Jane'); // updated
      });

      it('should allow updating other properties when one has preventUpdates', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          id!: string;

          @Property({ type: () => String, preventUpdates: true })
          createdAt!: string;

          @Property({ type: () => String })
          name!: string;

          constructor(data: { id: string; createdAt: string; name: string }) {
            Object.assign(this, data);
          }
        }

        const user = new User({
          id: '1',
          createdAt: '2024-01-01',
          name: 'John',
        });
        const updated = await EntityUtils.update(user, {
          id: '2',
          createdAt: '2024-12-31',
          name: 'Jane',
        });

        expect(updated.id).toBe('2'); // updated
        expect(updated.createdAt).toBe('2024-01-01'); // not updated
        expect(updated.name).toBe('Jane'); // updated
      });
    });

    describe('validation errors in non-strict mode', () => {
      it('should store validation problems in non-strict mode', async () => {
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

        const user = new User({ name: 'John' });
        const updated = await EntityUtils.update(user, { name: 'Jo' });

        expect(updated.name).toBe('Jo');
        const problems = EntityUtils.getProblems(updated);
        expect(problems).toHaveLength(1);
        expect(problems[0].message).toBe('Name must be at least 3 characters');
      });

      it('should not throw when validation fails in non-strict mode', async () => {
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

        const user = new User({ name: 'John' });

        await expect(
          EntityUtils.update(user, { name: 'Jo' }, { strict: false }),
        ).resolves.toBeDefined();
      });
    });

    describe('strict mode', () => {
      it('should throw ValidationError when validation fails in strict mode', async () => {
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

        const user = new User({ name: 'John' });

        await expect(
          EntityUtils.update(user, { name: 'Jo' }, { strict: true }),
        ).rejects.toThrow();
      });

      it('should pass validation in strict mode when no problems', async () => {
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

        const user = new User({ name: 'John' });

        const updated = await EntityUtils.update(
          user,
          { name: 'Jane' },
          {
            strict: true,
          },
        );
        expect(updated.name).toBe('Jane');
      });
    });

    describe('entity validators', () => {
      it('should run entity validators during update', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          @EntityValidator()
          validateAge(): Problem[] {
            if (this.age < 0) {
              return [
                new Problem({
                  property: 'age',
                  message: 'Age cannot be negative',
                }),
              ];
            }
            return [];
          }

          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', age: 30 });
        const updated = await EntityUtils.update(user, { age: -5 });

        const problems = EntityUtils.getProblems(updated);
        expect(problems).toHaveLength(1);
        expect(problems[0].message).toBe('Age cannot be negative');
      });

      it('should throw when entity validator fails in strict mode', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          @EntityValidator()
          validateAge(): Problem[] {
            if (this.age < 0) {
              return [
                new Problem({
                  property: 'age',
                  message: 'Age cannot be negative',
                }),
              ];
            }
            return [];
          }

          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', age: 30 });

        await expect(
          EntityUtils.update(user, { age: -5 }, { strict: true }),
        ).rejects.toThrow();
      });
    });

    describe('error handling', () => {
      it('should throw error when updating non-entity instance', async () => {
        const notEntity = { name: 'John' };

        await expect(
          EntityUtils.update(notEntity as any, { name: 'Jane' }),
        ).rejects.toThrow('Cannot update non-entity instance');
      });
    });

    describe('nested entities', () => {
      it('should update nested entity properties', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          city!: string;

          constructor(data: { city: string }) {
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

        const user = new User({
          name: 'John',
          address: new Address({ city: 'Boston' }),
        });
        const updated = await EntityUtils.update(user, {
          address: new Address({ city: 'New York' }),
        });

        expect(updated.address.city).toBe('New York');
      });
    });
  });

  describe('safeUpdate', () => {
    describe('basic success cases', () => {
      it('should return success with data when update is valid', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John' });
        const result = await EntityUtils.safeUpdate(user, { name: 'Jane' });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeInstanceOf(User);
          expect(result.data.name).toBe('Jane');
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

        const user = new User({ name: 'John' });
        const result = await EntityUtils.safeUpdate(
          user,
          { name: 'Jane' },
          {
            strict: true,
          },
        );

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

        const user = new User({ name: 'John' });
        const result = await EntityUtils.safeUpdate(
          user,
          { name: 'Jo' },
          {
            strict: false,
          },
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeInstanceOf(User);
          expect(result.data.name).toBe('Jo');
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].message).toBe(
            'Name must be at least 3 characters',
          );
        }
      });
    });

    describe('validation failures in strict mode', () => {
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

        const user = new User({ name: 'John' });
        const result = await EntityUtils.safeUpdate(
          user,
          { name: 'Jo' },
          {
            strict: true,
          },
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems).toHaveLength(1);
        }
      });
    });

    describe('preventUpdates with safeUpdate', () => {
      it('should not update properties with preventUpdates: true', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, preventUpdates: true })
          id!: string;

          @Property({ type: () => String })
          name!: string;

          constructor(data: { id: string; name: string }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ id: '123', name: 'John' });
        const result = await EntityUtils.safeUpdate(user, {
          id: '456',
          name: 'Jane',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('123'); // not updated
          expect(result.data.name).toBe('Jane'); // updated
        }
      });
    });

    describe('entity validators with safeUpdate', () => {
      it('should return failure when entity validator fails in strict mode', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          @EntityValidator()
          validateAge(): Problem[] {
            if (this.age < 0) {
              return [
                new Problem({
                  property: 'age',
                  message: 'Age cannot be negative',
                }),
              ];
            }
            return [];
          }

          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', age: 30 });
        const result = await EntityUtils.safeUpdate(
          user,
          { age: -5 },
          {
            strict: true,
          },
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.data).toBeUndefined();
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].message).toBe('Age cannot be negative');
        }
      });

      it('should return success with problems when entity validator fails in non-strict mode', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          @EntityValidator()
          validateAge(): Problem[] {
            if (this.age < 0) {
              return [
                new Problem({
                  property: 'age',
                  message: 'Age cannot be negative',
                }),
              ];
            }
            return [];
          }

          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', age: 30 });
        const result = await EntityUtils.safeUpdate(
          user,
          { age: -5 },
          {
            strict: false,
          },
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.age).toBe(-5);
          expect(result.problems).toHaveLength(1);
          expect(result.problems[0].message).toBe('Age cannot be negative');
        }
      });
    });

    describe('error handling', () => {
      it('should throw error when safeUpdate is called on non-entity instance', async () => {
        const notEntity = { name: 'John' };

        await expect(
          EntityUtils.safeUpdate(notEntity as any, { name: 'Jane' }),
        ).rejects.toThrow('Cannot update non-entity instance');
      });
    });

    describe('async validators', () => {
      it('should handle async validators in safeUpdate', async () => {
        @Entity()
        class User {
          @Property({
            type: () => String,
            validators: [
              async ({ value }) => {
                // Simulate async operation
                await new Promise((resolve) => setTimeout(resolve, 1));
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

        const user = new User({ name: 'John' });
        const result = await EntityUtils.safeUpdate(user, { name: 'Jo' });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.problems).toHaveLength(1);
        }
      });
    });
  });

  describe('update and safeUpdate consistency', () => {
    it('should have consistent behavior between update and safeUpdate in non-strict mode', async () => {
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

      const user = new User({ name: 'John' });
      const updateResult = await EntityUtils.update(user, { name: 'Jo' });
      const safeUpdateResult = await EntityUtils.safeUpdate(user, {
        name: 'Jo',
      });

      expect(safeUpdateResult.success).toBe(true);
      if (safeUpdateResult.success) {
        expect(updateResult.name).toBe(safeUpdateResult.data.name);
        expect(EntityUtils.getProblems(updateResult)).toEqual(
          safeUpdateResult.problems,
        );
      }
    });
  });
});
