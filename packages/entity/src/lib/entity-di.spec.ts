/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  Entity,
  EntityDI,
  EntityUtils,
  InjectedProperty,
  StringProperty,
  NumberProperty,
  type EntityDIToken,
  type EntityDIProvider,
} from '../index.js';

describe('EntityDI', () => {
  beforeEach(() => {
    // Reset EntityDI state before each test
    EntityDI.configure({ providers: [], fallbackFn: undefined });
  });

  describe('configure', () => {
    it('should configure providers', async () => {
      const token = 'test-token';
      const value = { message: 'Hello' };

      EntityDI.configure({
        providers: [{ provide: token, useValue: value }],
      });

      const result = await EntityDI.get(token);
      expect(result).toBe(value);
    });

    it('should configure fallback function', async () => {
      const token = 'fallback-token';
      const value = { data: 'fallback' };
      const fallbackFn = async (t: EntityDIToken) =>
        t === token ? value : null;

      EntityDI.configure({ fallbackFn });

      const result = await EntityDI.get(token);
      expect(result).toEqual(value);
    });

    it('should prefer providers over fallback function', async () => {
      const token = 'shared-token';
      const providerValue = { source: 'provider' };
      const fallbackValue = { source: 'fallback' };

      const fallbackFn = async (t: EntityDIToken) =>
        t === token ? fallbackValue : null;

      EntityDI.configure({
        providers: [{ provide: token, useValue: providerValue }],
        fallbackFn,
      });

      const result = await EntityDI.get(token);
      expect(result).toEqual(providerValue);
    });
  });

  describe('get with useValue', () => {
    it('should return the value provided', async () => {
      const token = 'value-token';
      const value = { name: 'test' };

      EntityDI.configure({
        providers: [{ provide: token, useValue: value }],
      });

      const result = await EntityDI.get(token);
      expect(result).toBe(value);
    });

    it('should work with string tokens', async () => {
      const token = 'string-token';
      const value = 'test-value';

      EntityDI.configure({
        providers: [{ provide: token, useValue: value }],
      });

      const result = await EntityDI.get(token);
      expect(result).toBe(value);
    });

    it('should work with symbol tokens', async () => {
      const token = Symbol('symbol-token');
      const value = { data: 'symbol' };

      EntityDI.configure({
        providers: [{ provide: token, useValue: value }],
      });

      const result = await EntityDI.get(token);
      expect(result).toEqual(value);
    });

    it('should work with class tokens', async () => {
      class MyService {
        getName() {
          return 'MyService';
        }
      }

      const instance = new MyService();
      EntityDI.configure({
        providers: [{ provide: MyService, useValue: instance }],
      });

      const result = await EntityDI.get(MyService);
      expect(result).toBe(instance);
    });
  });

  describe('get with useFactory', () => {
    it('should call the factory and return the result', async () => {
      const token = 'factory-token';
      const value = { timestamp: Date.now() };

      EntityDI.configure({
        providers: [
          {
            provide: token,
            useFactory: () => value,
          },
        ],
      });

      const result = await EntityDI.get(token);
      expect(result).toEqual(value);
    });

    it('should call factory every time (no caching)', async () => {
      const token = 'factory-token';
      const factory = () => ({ id: Math.random() });

      EntityDI.configure({
        providers: [{ provide: token, useFactory: factory }],
      });

      const result1 = (await EntityDI.get(token)) as any;
      const result2 = (await EntityDI.get(token)) as any;

      expect(result1).not.toBe(result2);
      expect(result1.id).not.toBe(result2.id);
    });

    it('should support async factories', async () => {
      const token = 'async-factory-token';
      const asyncFactory = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { data: 'async-result' };
      };

      EntityDI.configure({
        providers: [{ provide: token, useFactory: asyncFactory }],
      });

      const result = await EntityDI.get(token);
      expect(result).toEqual({ data: 'async-result' });
    });
  });

  describe('error handling', () => {
    it('should throw error when token not found', async () => {
      EntityDI.configure({ providers: [] });

      const unknownToken = 'unknown-token';
      await expect(EntityDI.get(unknownToken)).rejects.toThrow(
        `No provider found for token: ${unknownToken}`,
      );
    });

    it('should include class name in error message for class tokens', async () => {
      class MyClass {}
      EntityDI.configure({ providers: [] });

      await expect(EntityDI.get(MyClass)).rejects.toThrow(
        'No provider found for token: MyClass',
      );
    });

    it('should throw error if fallback also returns nothing', async () => {
      const fallbackFn = async () => null;
      EntityDI.configure({ fallbackFn });

      await expect(EntityDI.get('missing-token')).rejects.toThrow(
        'No provider found for token: missing-token',
      );
    });
  });

  describe('multiple providers', () => {
    it('should handle multiple providers', async () => {
      const providers: EntityDIProvider[] = [
        { provide: 'token-1', useValue: 'value-1' },
        { provide: 'token-2', useValue: 'value-2' },
        { provide: 'token-3', useValue: 'value-3' },
      ];

      EntityDI.configure({ providers });

      const result1 = await EntityDI.get('token-1');
      const result2 = await EntityDI.get('token-2');
      const result3 = await EntityDI.get('token-3');

      expect(result1).toBe('value-1');
      expect(result2).toBe('value-2');
      expect(result3).toBe('value-3');
    });

    it('should use first matching provider', async () => {
      const token = 'shared-token';
      const providers: EntityDIProvider[] = [
        { provide: token, useValue: 'first' },
        { provide: token, useValue: 'second' },
      ];

      EntityDI.configure({ providers });

      const result = await EntityDI.get(token);
      expect(result).toBe('first');
    });
  });
});

describe('@InjectedProperty', () => {
  beforeEach(() => {
    EntityDI.configure({ providers: [], fallbackFn: undefined });
  });

  describe('basic injection', () => {
    it('should inject property from DI container', async () => {
      const DatabaseToken = Symbol('Database');

      interface Database {
        query: (sql: string) => Promise<any[]>;
      }

      const mockDatabase: Database = {
        query: async (sql: string) => [{ id: 1 }],
      };

      @Entity({ name: 'DIUserService1' })
      class UserService {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseToken)
        db!: Database;

        constructor(data: { name: string; db?: Database }) {
          this.name = data.name;
          this.db = data.db!;
        }
      }

      EntityDI.configure({
        providers: [{ provide: DatabaseToken, useValue: mockDatabase }],
      });

      const json = { name: 'John' };
      const service = await EntityUtils.parse(UserService, json);

      expect(service.name).toBe('John');
      expect(service.db).toBe(mockDatabase);
    });

    it('should accept injected property via constructor data', () => {
      const DatabaseToken = Symbol('Database');
      const mockDatabase = { query: async () => [] };

      @Entity({ name: 'DIUserService2' })
      class UserService {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseToken)
        db!: any;

        constructor(data: { name: string; db?: any }) {
          this.name = data.name;
          this.db = data.db!;
        }
      }

      const service = new UserService({
        name: 'Jane',
        db: mockDatabase,
      });

      expect(service.name).toBe('Jane');
      expect(service.db).toBe(mockDatabase);
    });
  });

  describe('JSON handling', () => {
    it('should exclude injected properties from toJSON', async () => {
      const DatabaseToken = Symbol('Database');
      const mockDatabase = { connected: true };

      @Entity({ name: 'DIService1' })
      class Service {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseToken)
        db!: any;

        constructor(data: { name: string; db?: any }) {
          this.name = data.name;
          this.db = data.db!;
        }
      }

      EntityDI.configure({
        providers: [{ provide: DatabaseToken, useValue: mockDatabase }],
      });

      const json = { name: 'MyService' };
      const service = await EntityUtils.parse(Service, json);

      const json_output = EntityUtils.toJSON(service);
      expect(json_output).toEqual({ name: 'MyService' });
      expect(json_output).not.toHaveProperty('db');
    });

    it('should ignore injected properties in JSON input', async () => {
      const DatabaseToken = Symbol('Database');
      const originalDb = { original: true };
      const injectedDb = { injected: true };

      @Entity({ name: 'DIService2' })
      class Service {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseToken)
        db!: any;

        constructor(data: { name: string; db?: any }) {
          this.name = data.name;
          this.db = data.db!;
        }
      }

      EntityDI.configure({
        providers: [{ provide: DatabaseToken, useValue: injectedDb }],
      });

      const json = { name: 'MyService', db: originalDb };
      const service = await EntityUtils.parse(Service, json);

      expect(service.db).toEqual(injectedDb);
      expect(service.db).not.toEqual(originalDb);
    });
  });

  describe('multiple injected properties', () => {
    it('should inject multiple dependencies', async () => {
      const DatabaseToken = Symbol('Database');
      const LoggerToken = Symbol('Logger');

      const mockDatabase = { name: 'db' };
      const mockLogger = { name: 'logger' };

      @Entity({ name: 'DIService3' })
      class Service {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseToken)
        db!: any;

        @InjectedProperty(LoggerToken)
        logger!: any;

        constructor(data: { name: string; db?: any; logger?: any }) {
          this.name = data.name;
          this.db = data.db!;
          this.logger = data.logger!;
        }
      }

      EntityDI.configure({
        providers: [
          { provide: DatabaseToken, useValue: mockDatabase },
          { provide: LoggerToken, useValue: mockLogger },
        ],
      });

      const json = { name: 'MyService' };
      const service = await EntityUtils.parse(Service, json);

      expect(service.db).toBe(mockDatabase);
      expect(service.logger).toBe(mockLogger);
      expect(service.name).toBe('MyService');
    });
  });

  describe('with factory providers', () => {
    it('should work with factory providers', async () => {
      const ServiceToken = Symbol('Service');

      @Entity()
      class Consumer {
        @StringProperty()
        name!: string;

        @InjectedProperty(ServiceToken)
        service!: any;

        constructor(data: { name: string; service?: any }) {
          this.name = data.name;
          this.service = data.service!;
        }
      }

      const factory = () => ({
        id: Math.random(),
        getName: () => 'DynamicService',
      });

      EntityDI.configure({
        providers: [{ provide: ServiceToken, useFactory: factory }],
      });

      const json = { name: 'Consumer1' };
      const consumer = await EntityUtils.parse(Consumer, json);

      expect(consumer.service).toBeDefined();
      expect(consumer.service.getName()).toBe('DynamicService');
    });

    it('should call factory for each parse', async () => {
      const ServiceToken = Symbol('Service');

      @Entity({ name: 'DIConsumer2' })
      class Consumer {
        @StringProperty()
        name!: string;

        @InjectedProperty(ServiceToken)
        service!: any;

        constructor(data: { name: string; service?: any }) {
          this.name = data.name;
          this.service = data.service!;
        }
      }

      const factory = () => ({
        id: Math.random(),
        getName: () => 'DynamicService',
      });

      EntityDI.configure({
        providers: [{ provide: ServiceToken, useFactory: factory }],
      });

      const consumer1 = await EntityUtils.parse(Consumer, {
        name: 'Consumer1',
      });
      const consumer2 = await EntityUtils.parse(Consumer, {
        name: 'Consumer2',
      });

      expect(consumer1.service.id).not.toBe(consumer2.service.id);
    });
  });

  describe('with async factories', () => {
    it('should support async dependency injection', async () => {
      const DatabaseToken = Symbol('Database');

      @Entity()
      class Service {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseToken)
        db!: any;

        constructor(data: { name: string; db?: any }) {
          this.name = data.name;
          this.db = data.db!;
        }
      }

      const asyncFactory = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { async: true, data: 'loaded' };
      };

      EntityDI.configure({
        providers: [{ provide: DatabaseToken, useFactory: asyncFactory }],
      });

      const json = { name: 'MyService' };
      const service = await EntityUtils.parse(Service, json);

      expect(service.db).toEqual({ async: true, data: 'loaded' });
    });
  });

  describe('with class tokens', () => {
    it('should use class as token for injection', async () => {
      class DatabaseService {
        getName() {
          return 'DatabaseService';
        }
      }

      @Entity()
      class UserService {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseService)
        db!: DatabaseService;

        constructor(data: { name: string; db?: DatabaseService }) {
          this.name = data.name;
          this.db = data.db!;
        }
      }

      const dbInstance = new DatabaseService();
      EntityDI.configure({
        providers: [{ provide: DatabaseService, useValue: dbInstance }],
      });

      const json = { name: 'John' };
      const service = await EntityUtils.parse(UserService, json);

      expect(service.db).toBe(dbInstance);
      expect(service.db.getName()).toBe('DatabaseService');
    });
  });

  describe('fallback behavior', () => {
    it('should use fallback function if provider not found', async () => {
      const DatabaseToken = Symbol('Database');
      const mockDatabase = { fallback: true };

      @Entity({ name: 'DIFallbackService1' })
      class Service {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseToken)
        db!: any;

        constructor(data: { name: string; db?: any }) {
          this.name = data.name;
          this.db = data.db!;
        }
      }

      const fallbackFn = async (token: EntityDIToken) =>
        token === DatabaseToken ? mockDatabase : null;

      EntityDI.configure({ fallbackFn });

      const json = { name: 'MyService' };
      const service = await EntityUtils.parse(Service, json);

      expect(service.db).toEqual(mockDatabase);
    });

    it('should throw error if token cannot be resolved', async () => {
      const DatabaseToken = Symbol('Database');

      @Entity({ name: 'DIFallbackService2' })
      class Service {
        @StringProperty()
        name!: string;

        @InjectedProperty(DatabaseToken)
        db?: any;

        constructor(data: { name: string; db?: any }) {
          this.name = data.name;
          this.db = data.db;
        }
      }

      EntityDI.configure({ providers: [] });

      const json = { name: 'MyService' };
      await expect(EntityUtils.parse(Service, json)).rejects.toThrow(
        'No provider found for token:',
      );
    });
  });

  describe('with regular properties', () => {
    it('should work with mix of regular and injected properties', async () => {
      const DatabaseToken = Symbol('Database');
      const mockDatabase = { connected: true };

      @Entity()
      class ComplexService {
        @StringProperty()
        name!: string;

        @NumberProperty()
        port!: number;

        @InjectedProperty(DatabaseToken)
        db!: any;

        constructor(data: { name: string; port: number; db?: any }) {
          this.name = data.name;
          this.port = data.port;
          this.db = data.db!;
        }
      }

      EntityDI.configure({
        providers: [{ provide: DatabaseToken, useValue: mockDatabase }],
      });

      const json = { name: 'MyService', port: 5432 };
      const service = await EntityUtils.parse(ComplexService, json);

      expect(service.name).toBe('MyService');
      expect(service.port).toBe(5432);
      expect(service.db).toBe(mockDatabase);
    });

    it('should handle optional regular properties with injected properties', async () => {
      const DatabaseToken = Symbol('Database');
      const mockDatabase = { connected: true };

      @Entity({ name: 'DIRegularPropertiesService' })
      class Service {
        @StringProperty()
        name!: string;

        @StringProperty({ optional: true })
        description?: string;

        @InjectedProperty(DatabaseToken)
        db!: any;

        constructor(data: { name: string; description?: string; db?: any }) {
          this.name = data.name;
          this.description = data.description;
          this.db = data.db!;
        }
      }

      EntityDI.configure({
        providers: [{ provide: DatabaseToken, useValue: mockDatabase }],
      });

      const json = { name: 'MyService' };
      const service = await EntityUtils.parse(Service, json);

      expect(service.name).toBe('MyService');
      expect(service.description).toBeUndefined();
      expect(service.db).toBe(mockDatabase);
    });
  });
});
