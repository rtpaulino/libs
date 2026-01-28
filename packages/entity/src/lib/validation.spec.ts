/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Entity, EntityValidator } from './entity.js';
import {
  StringProperty,
  NumberProperty,
  Property,
  BooleanProperty,
} from './property.js';
import { EntityUtils } from './entity-utils.js';
import { ValidationError } from './validation-error.js';
import { Problem } from './problem.js';

describe('Validation System', () => {
  describe('ValidationError', () => {
    it('should create a ValidationError', () => {
      const problem = new Problem({
        property: 'name',
        message: 'Test error',
      });
      const error = new ValidationError([problem]);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.problems).toHaveLength(1);
      expect(error.problems[0]).toBe(problem);
      expect(error.message).toContain('name: Test error');
    });

    it('should create a ValidationError with multiple problems', () => {
      const problems = [
        new Problem({ property: 'name', message: 'Name is required' }),
        new Problem({ property: 'age', message: 'Age must be positive' }),
      ];
      const error = new ValidationError(problems);
      expect(error.problems).toHaveLength(2);
      expect(error.message).toContain('Validation failed with 2 error(s)');
      expect(error.message).toContain('name: Name is required');
      expect(error.message).toContain('age: Age must be positive');
    });
  });

  describe('Problem', () => {
    it('should create a Problem', () => {
      const problem = new Problem({
        property: 'name',
        message: 'Name is too short',
      });
      expect(problem.property).toBe('name');
      expect(problem.message).toBe('Name is too short');
    });

    it('should convert to string', () => {
      const problem = new Problem({
        property: 'age',
        message: 'Age must be positive',
      });
      expect(problem.toString()).toBe('age: Age must be positive');
    });
  });

  describe('Property Validators', () => {
    @Entity()
    class User {
      @Property({
        type: () => String,
        validators: [
          ({ value }: { value: string }) => {
            if (value.length < 3) {
              return [
                new Problem({
                  property: '',
                  message: 'Name must be at least 3 characters',
                }),
              ];
            }
            return [];
          },
          ({ value }: { value: string }) => {
            if (value.length > 50) {
              return [
                new Problem({
                  property: '',
                  message: 'Name must be at most 50 characters',
                }),
              ];
            }
            return [];
          },
        ],
      })
      name!: string;

      @Property({
        type: () => Number,
        validators: [
          ({ value }: { value: number }) => {
            if (value < 0) {
              return [
                new Problem({
                  property: '',
                  message: 'Age cannot be negative',
                }),
              ];
            }
            return [];
          },
          ({ value }: { value: number }) => {
            if (value > 150) {
              return [
                new Problem({ property: '', message: 'Age cannot exceed 150' }),
              ];
            }
            return [];
          },
        ],
      })
      age!: number;

      constructor(data: Partial<User>) {
        Object.assign(this, data);
      }
    }

    it('should validate properties and return no problems for valid data', async () => {
      const user = await EntityUtils.parse(User, { name: 'John', age: 30 });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(0);
    });

    it('should detect property validation problems in non-strict mode', async () => {
      const user = await EntityUtils.parse(User, { name: 'Jo', age: -5 });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(2);
      expect(problems[0].property).toBe('name');
      expect(problems[0].message).toBe('Name must be at least 3 characters');
      expect(problems[1].property).toBe('age');
      expect(problems[1].message).toBe('Age cannot be negative');
    });

    it('should throw ValidationError in strict mode when validation fails', async () => {
      await expect(async () => {
        await EntityUtils.parse(
          User,
          { name: 'Jo', age: 30 },
          { strict: true },
        );
      }).rejects.toThrow(ValidationError);
      await expect(async () => {
        await EntityUtils.parse(
          User,
          { name: 'Jo', age: 30 },
          { strict: true },
        );
      }).rejects.toThrow('name: Name must be at least 3 characters');
    });

    it('should validate multiple problems on same property', async () => {
      const veryLongName = 'a'.repeat(51);
      const user = await EntityUtils.parse(User, {
        name: veryLongName,
        age: 30,
      });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('name');
      expect(problems[0].message).toBe('Name must be at most 50 characters');
    });
  });

  describe('Entity Validators', () => {
    @Entity()
    class Person {
      @StringProperty()
      firstName!: string;

      @StringProperty()
      lastName!: string;

      @NumberProperty()
      age!: number;

      constructor(data: Partial<Person>) {
        Object.assign(this, data);
      }

      @EntityValidator()
      validateNames(): Problem[] {
        const problems: Problem[] = [];
        if (this.firstName === this.lastName) {
          problems.push(
            new Problem({
              property: 'firstName',
              message: 'First and last name cannot be the same',
            }),
          );
        }
        return problems;
      }

      @EntityValidator()
      validateAge(): Problem[] {
        const problems: Problem[] = [];
        if (this.age < 18) {
          problems.push(
            new Problem({
              property: 'age',
              message: 'Person must be at least 18 years old',
            }),
          );
        }
        return problems;
      }
    }

    it('should run entity validators after property validators', async () => {
      const person = await EntityUtils.parse(Person, {
        firstName: 'John',
        lastName: 'John',
        age: 16,
      });
      const problems = EntityUtils.problems(person);
      expect(problems).toHaveLength(2);
      expect(problems[0].property).toBe('firstName');
      expect(problems[0].message).toBe(
        'First and last name cannot be the same',
      );
      expect(problems[1].property).toBe('age');
      expect(problems[1].message).toBe('Person must be at least 18 years old');
    });

    it('should not run entity validators if all validations pass', async () => {
      const person = await EntityUtils.parse(Person, {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
      });
      const problems = EntityUtils.problems(person);
      expect(problems).toHaveLength(0);
    });

    it('should throw in strict mode with entity validation failures', async () => {
      await expect(async () => {
        await EntityUtils.parse(
          Person,
          {
            firstName: 'John',
            lastName: 'John',
            age: 30,
          },
          { strict: true },
        );
      }).rejects.toThrow(ValidationError);
    });
  });

  describe('EntityUtils.validate()', () => {
    @Entity()
    class Product {
      @Property({
        type: () => String,
        validators: [
          ({ value }: { value: string }) => {
            if (value.length === 0) {
              return [
                new Problem({ property: '', message: 'Name cannot be empty' }),
              ];
            }
            return [];
          },
        ],
      })
      name!: string;

      @Property({
        type: () => Number,
        validators: [
          ({ value }: { value: number }) => {
            if (value <= 0) {
              return [
                new Problem({
                  property: '',
                  message: 'Price must be positive',
                }),
              ];
            }
            return [];
          },
        ],
      })
      price!: number;

      constructor(data: Partial<Product>) {
        Object.assign(this, data);
      }

      @EntityValidator()
      validateProduct(): Problem[] {
        if (this.name === 'Free' && this.price > 0) {
          return [
            new Problem({
              property: 'price',
              message: 'Product named "Free" must have price 0',
            }),
          ];
        }
        return [];
      }
    }

    it('should manually validate an entity', async () => {
      const product = new Product({ name: '', price: -5 });
      const problems = await EntityUtils.validate(product);
      expect(problems).toHaveLength(2);
      expect(problems[0].property).toBe('name');
      expect(problems[1].property).toBe('price');
    });

    it('should return empty array for valid entity', async () => {
      const product = new Product({ name: 'Widget', price: 10 });
      const problems = await EntityUtils.validate(product);
      expect(problems).toHaveLength(0);
    });

    it('should run entity validators in manual validation', async () => {
      const product = new Product({ name: 'Free', price: 10 });
      const problems = await EntityUtils.validate(product);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('price');
      expect(problems[0].message).toBe(
        'Product named "Free" must have price 0',
      );
    });

    it('should throw error for non-entity', async () => {
      await expect(EntityUtils.validate({} as any)).rejects.toThrow(
        'Cannot validate non-entity instance',
      );
    });
  });

  describe('EntityUtils.getRawInput()', () => {
    @Entity()
    class User {
      @StringProperty()
      name!: string;

      @NumberProperty()
      age!: number;

      constructor(data: Partial<User>) {
        Object.assign(this, data);
      }
    }

    it('should retrieve raw input data', async () => {
      const input = { name: 'John', age: 30 };
      const user = await EntityUtils.parse(User, input);
      const rawInput = EntityUtils.getRawInput(user);
      expect(rawInput).toEqual(input);
      expect(rawInput).toBe(input); // Returns reference, not a copy
    });

    it('should return undefined for manually created instances', () => {
      const user = new User({ name: 'John', age: 30 });
      const rawInput = EntityUtils.getRawInput(user);
      expect(rawInput).toBeUndefined();
    });
  });

  describe('HARD vs SOFT Errors', () => {
    @Entity()
    class User {
      @Property({
        type: () => String,
        validators: [
          ({ value }: { value: string }) => {
            if (value.length < 3) {
              return [new Problem({ property: '', message: 'Name too short' })];
            }
            return [];
          },
        ],
      })
      name!: string;

      @NumberProperty()
      age!: number;

      constructor(data: Partial<User>) {
        Object.assign(this, data);
      }
    }

    it('should throw ValidationError for HARD errors (type mismatch)', async () => {
      await expect(async () => {
        await EntityUtils.parse(User, { name: 'John', age: 'thirty' as any });
      }).rejects.toThrow(ValidationError);
      await expect(async () => {
        await EntityUtils.parse(User, { name: 'John', age: 'thirty' as any });
      }).rejects.toThrow('age: Expects a number but received string');
    });

    it('should not throw for SOFT errors in non-strict mode', async () => {
      const user = await EntityUtils.parse(User, { name: 'Jo', age: 30 });
      expect(user).toBeDefined();
      expect(user.name).toBe('Jo');
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
    });

    it('should throw for SOFT errors in strict mode', async () => {
      await expect(async () => {
        await EntityUtils.parse(
          User,
          { name: 'Jo', age: 30 },
          { strict: true },
        );
      }).rejects.toThrow(ValidationError);
    });

    it('should throw for missing required properties (HARD error)', async () => {
      await expect(async () => {
        await EntityUtils.parse(User, { name: 'John' } as any);
      }).rejects.toThrow(ValidationError);
      await expect(async () => {
        await EntityUtils.parse(User, { name: 'John' } as any);
      }).rejects.toThrow('age: Required property is missing from input');
    });

    it('should collect multiple HARD errors before throwing', async () => {
      @Entity()
      class MultiProblem {
        @StringProperty()
        name!: string;

        @NumberProperty()
        age!: number;

        @BooleanProperty()
        active!: boolean;

        constructor(data: Partial<MultiProblem>) {
          Object.assign(this, data);
        }
      }

      try {
        await EntityUtils.parse(MultiProblem, {
          name: 123 as any,
          age: 'not a number' as any,
          active: 'not a boolean' as any,
        });
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.problems).toHaveLength(3);
          expect(error.problems[0].property).toBe('name');
          expect(error.problems[0].message).toContain('string');
          expect(error.problems[1].property).toBe('age');
          expect(error.problems[1].message).toContain('number');
          expect(error.problems[2].property).toBe('active');
          expect(error.problems[2].message).toContain('boolean');
        }
      }
    });

    it('should collect errors from nested entities with proper paths', async () => {
      @Entity()
      class Address {
        @StringProperty()
        street!: string;

        @StringProperty()
        city!: string;

        constructor(data: Partial<Address>) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class Person {
        @StringProperty()
        name!: string;

        @Property({ type: () => Address })
        address!: Address;

        constructor(data: Partial<Person>) {
          Object.assign(this, data);
        }
      }

      try {
        await EntityUtils.parse(Person, {
          name: 123 as any,
          address: {
            street: 456 as any,
            city: 789 as any,
          },
        });
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.problems).toHaveLength(3);
          expect(error.problems[0].property).toBe('name');
          expect(error.problems[1].property).toBe('address.street');
          expect(error.problems[2].property).toBe('address.city');
        }
      }
    });
  });

  describe('Combined Property and Entity Validators', () => {
    @Entity()
    class Account {
      @Property({
        type: () => String,
        validators: [
          ({ value }: { value: string }) => {
            if (!/^[a-z0-9]+$/.test(value)) {
              return [
                new Problem({
                  property: '',
                  message: 'Username must be alphanumeric lowercase',
                }),
              ];
            }
            return [];
          },
        ],
      })
      username!: string;

      @Property({
        type: () => String,
        validators: [
          ({ value }: { value: string }) => {
            if (value.length < 8) {
              return [
                new Problem({
                  property: '',
                  message: 'Password must be at least 8 characters',
                }),
              ];
            }
            return [];
          },
        ],
      })
      password!: string;

      @StringProperty()
      email!: string;

      constructor(data: Partial<Account>) {
        Object.assign(this, data);
      }

      @EntityValidator()
      validatePasswordSecurity(): Problem[] {
        if (this.password.toLowerCase().includes(this.username.toLowerCase())) {
          return [
            new Problem({
              property: 'password',
              message: 'Password cannot contain username',
            }),
          ];
        }
        return [];
      }

      @EntityValidator()
      validateEmailUsername(): Problem[] {
        if (!this.email.startsWith(this.username)) {
          return [
            new Problem({
              property: 'email',
              message: 'Email must start with username',
            }),
          ];
        }
        return [];
      }
    }

    it('should run all validators and collect all problems', async () => {
      const account = await EntityUtils.parse(Account, {
        username: 'JohnDoe',
        password: 'short',
        email: 'wrong@example.com',
      });
      const problems = EntityUtils.problems(account);
      expect(problems.length).toBeGreaterThan(0);

      const usernameProblems = problems.filter(
        (p) => p.property === 'username',
      );
      const passwordProblems = problems.filter(
        (p) => p.property === 'password',
      );
      const emailProblems = problems.filter((p) => p.property === 'email');

      expect(usernameProblems.length).toBeGreaterThan(0);
      expect(passwordProblems.length).toBeGreaterThan(0);
      expect(emailProblems.length).toBeGreaterThan(0);
    });

    it('should pass all validations with correct data', async () => {
      const account = await EntityUtils.parse(Account, {
        username: 'johndoe',
        password: 'securepassword123',
        email: 'johndoe@example.com',
      });
      const problems = EntityUtils.problems(account);
      expect(problems).toHaveLength(0);
    });
  });

  describe('Nested Entity Validation', () => {
    @Entity()
    class Address {
      @Property({
        type: () => String,
        validators: [
          ({ value }: { value: string }) => {
            if (value.length === 0) {
              return [
                new Problem({
                  property: '',
                  message: 'Street cannot be empty',
                }),
              ];
            }
            return [];
          },
        ],
      })
      street!: string;

      @StringProperty()
      city!: string;

      constructor(data: Partial<Address>) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Company {
      @StringProperty()
      name!: string;

      @Property({ type: () => Address })
      address!: Address;

      constructor(data: Partial<Company>) {
        Object.assign(this, data);
      }

      @EntityValidator()
      validateCompany(): Problem[] {
        if (this.name.length < 2) {
          return [
            new Problem({
              property: 'name',
              message: 'Company name too short',
            }),
          ];
        }
        return [];
      }
    }

    it('should validate nested entities', async () => {
      const company = await EntityUtils.parse(Company, {
        name: 'A',
        address: { street: '', city: 'Boston' },
      });

      const problems = EntityUtils.problems(company);
      expect(problems).toHaveLength(2);
      // Nested entity validation happens first (during property validation)
      expect(problems[0].property).toBe('address.street');
      // Entity validators run after property validation
      expect(problems[1].property).toBe('name');

      // Check nested entity has its own problems
      const addressProblems = EntityUtils.problems(company.address);
      expect(addressProblems).toHaveLength(1);
      expect(addressProblems[0].property).toBe('street');
    });
  });

  describe('Optional Properties with Validators', () => {
    @Entity()
    class Profile {
      @StringProperty()
      username!: string;

      @Property({
        type: () => String,
        optional: true,
        validators: [
          ({ value }: { value: string }) => {
            if (value && value.length < 10) {
              return [
                new Problem({
                  property: '',
                  message: 'Bio must be at least 10 characters if provided',
                }),
              ];
            }
            return [];
          },
        ],
      })
      bio?: string;

      constructor(data: Partial<Profile>) {
        Object.assign(this, data);
      }
    }

    it('should not run validators for null/undefined optional properties', async () => {
      const profile = await EntityUtils.parse(Profile, { username: 'john' });
      const problems = EntityUtils.problems(profile);
      expect(problems).toHaveLength(0);
    });

    it('should run validators for provided optional properties', async () => {
      const profile = await EntityUtils.parse(Profile, {
        username: 'john',
        bio: 'short',
      });
      const problems = EntityUtils.problems(profile);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('bio');
    });
  });

  describe('Array Validation with arrayValidators vs validators', () => {
    @Entity()
    class TodoList {
      @StringProperty()
      name!: string;

      @Property({
        type: () => String,
        array: true,
        arrayValidators: [
          // arrayValidators receives the whole array
          ({ value }: { value: string[] }) => {
            if (value.some((task) => task.length < 3)) {
              return [
                new Problem({
                  property: '',
                  message: 'All tasks must be at least 3 characters',
                }),
              ];
            }
            return [];
          },
        ],
      })
      tasksWhole!: string[];

      @Property({
        type: () => String,
        array: true,
        validators: [
          ({ value }: { value: string }) => {
            // validators receives each element
            if (value.length < 3) {
              return [
                new Problem({
                  property: '',
                  message: 'Task must be at least 3 characters',
                }),
              ];
            }
            return [];
          },
        ],
      })
      tasksEach!: string[];

      constructor(data: Partial<TodoList>) {
        Object.assign(this, data);
      }
    }

    it('should validate whole array when using arrayValidators', async () => {
      const todoList = await EntityUtils.parse(TodoList, {
        name: 'My List',
        tasksWhole: ['task1', 'task2'],
        tasksEach: ['task1', 'task2'],
      });
      const problems = EntityUtils.problems(todoList);

      // Both arrays are valid, no problems
      expect(problems).toHaveLength(0);
    });

    it('should validate each array element when using validators', async () => {
      const todoList = await EntityUtils.parse(TodoList, {
        name: 'My List',
        tasksWhole: ['task1', 'task2'],
        tasksEach: ['a', 'b', 'task3'],
      });
      const problems = EntityUtils.problems(todoList);

      // tasksEach validates each element individually
      expect(problems).toHaveLength(2);
      expect(problems[0].property).toBe('tasksEach[0]');
      expect(problems[0].message).toBe('Task must be at least 3 characters');
      expect(problems[1].property).toBe('tasksEach[1]');
      expect(problems[1].message).toBe('Task must be at least 3 characters');
    });

    it('should include element index in property path for element validators', async () => {
      const todoList = await EntityUtils.parse(TodoList, {
        name: 'My List',
        tasksWhole: ['task1'],
        tasksEach: ['ok1', 'x', 'ok2'],
      });
      const problems = EntityUtils.problems(todoList);

      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('tasksEach[1]');
    });

    it('should validate whole array with arrayValidators', async () => {
      @Entity()
      class NumberList {
        @Property({
          type: () => Number,
          array: true,
          arrayValidators: [
            // arrayValidators receives the whole array
            ({ value }: { value: number[] }) => {
              if (value.length < 2) {
                return [
                  new Problem({
                    property: '',
                    message: 'Array must have at least 2 elements',
                  }),
                ];
              }
              return [];
            },
          ],
        })
        numbers!: number[];

        constructor(data: Partial<NumberList>) {
          Object.assign(this, data);
        }
      }

      const list = await EntityUtils.parse(NumberList, { numbers: [1] });
      const problems = EntityUtils.problems(list);

      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('numbers');
      expect(problems[0].message).toBe('Array must have at least 2 elements');
    });
  });

  describe('PropertyValidator signature', () => {
    it('should use new validator signature with destructured value parameter', async () => {
      @Entity()
      class TestEntity {
        @Property({
          type: () => String,
          validators: [
            ({ value }: { value: string }) => {
              if (value === 'invalid') {
                return [
                  new Problem({
                    property: '',
                    message: 'Value cannot be "invalid"',
                  }),
                ];
              }
              return [];
            },
          ],
        })
        field!: string;

        constructor(data: Partial<TestEntity>) {
          Object.assign(this, data);
        }
      }

      const validEntity = await EntityUtils.parse(TestEntity, {
        field: 'test',
      });
      expect(EntityUtils.problems(validEntity)).toHaveLength(0);

      const invalidEntity = await EntityUtils.parse(TestEntity, {
        field: 'invalid',
      });
      const problems = EntityUtils.problems(invalidEntity);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('field');
      expect(problems[0].message).toBe('Value cannot be "invalid"');
    });
  });

  describe('Passthrough Properties with Validators', () => {
    it('should validate passthrough properties', async () => {
      @Entity()
      class Config {
        @Property({
          type: () => Object,
          passthrough: true,
          validators: [
            ({ value }: { value: any }) => {
              const problems: Problem[] = [];
              if (typeof value === 'object' && value !== null) {
                if (!value.apiKey) {
                  problems.push(
                    new Problem({
                      property: 'apiKey',
                      message: 'API key is required',
                    }),
                  );
                }
                if (value.timeout && value.timeout < 0) {
                  problems.push(
                    new Problem({
                      property: 'timeout',
                      message: 'Timeout must be positive',
                    }),
                  );
                }
              }
              return problems;
            },
          ],
        })
        settings!: Record<string, unknown>;

        constructor(data: Partial<Config>) {
          Object.assign(this, data);
        }
      }

      // Valid passthrough data
      const validConfig = await EntityUtils.parse(Config, {
        settings: { apiKey: 'abc123', timeout: 5000 },
      });
      expect(EntityUtils.problems(validConfig)).toHaveLength(0);

      // Invalid passthrough data
      const invalidConfig = await EntityUtils.parse(Config, {
        settings: { timeout: -5 },
      });
      const problems = EntityUtils.problems(invalidConfig);
      expect(problems).toHaveLength(2);
      expect(problems[0].property).toBe('settings.apiKey');
      expect(problems[0].message).toBe('API key is required');
      expect(problems[1].property).toBe('settings.timeout');
      expect(problems[1].message).toBe('Timeout must be positive');
    });

    it('should validate passthrough properties with empty string for value-level problems', async () => {
      @Entity()
      class Data {
        @Property({
          type: () => Object,
          passthrough: true,
          validators: [
            ({ value }: { value: any }) => {
              if (typeof value !== 'object' || value === null) {
                return [
                  new Problem({
                    property: '',
                    message: 'Must be an object',
                  }),
                ];
              }
              return [];
            },
          ],
        })
        raw!: unknown;

        constructor(data: Partial<Data>) {
          Object.assign(this, data);
        }
      }

      const invalidData = await EntityUtils.parse(Data, {
        raw: 'not an object',
      });
      const problems = EntityUtils.problems(invalidData);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('raw');
      expect(problems[0].message).toBe('Must be an object');
    });
  });
});
