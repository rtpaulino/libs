/* eslint-disable @typescript-eslint/no-non-null-assertion */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { StringifiableProperty, SerializableProperty } from './property.js';
import {
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  type PropertyOptions,
} from './types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPropertyOptions = PropertyOptions<any, any>;

class Capability {
  static readonly ELEVATED_ACCESS = new Capability({
    value: 'ELEVATED_ACCESS',
    description: 'Allows privileged operations that require elevated access.',
  });

  static readonly READ_ONLY = new Capability({
    value: 'READ_ONLY',
    description: 'Allows read-only access.',
  });

  readonly value: string;
  readonly description: string;

  protected constructor(data: { value: string; description: string }) {
    this.value = data.value;
    this.description = data.description;
  }

  static values = () => {
    return Object.values(Capability).filter((v) => v instanceof Capability);
  };

  static valuesMap = () => {
    const map = new Map<string, Capability>();
    for (const capability of Capability.values()) {
      map.set(capability.value, capability);
    }
    return map;
  };

  static parse(value: string): Capability {
    const capability = Capability.valuesMap().get(value);
    if (!capability) {
      throw new Error(`Invalid Capability value: ${value}`);
    }
    return capability;
  }

  toString() {
    return this.value;
  }

  equals(other: Capability): boolean {
    if (this === other) {
      return true;
    }

    if (this.value !== other.value) {
      return false;
    }

    return true;
  }
}

describe('StringifiableProperty', () => {
  it('should register property metadata', () => {
    class User {
      @StringifiableProperty(() => Capability)
      readonly capability!: Capability;
    }

    const properties: string[] = Reflect.getMetadata(
      PROPERTY_METADATA_KEY,
      User.prototype,
    );
    expect(properties).toContain('capability');
  });

  it('should register property options with serialize/deserialize functions', () => {
    class User {
      @StringifiableProperty(() => Capability)
      readonly capability!: Capability;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    expect(options['capability']).toBeDefined();
    expect(options['capability'].serialize).toBeDefined();
    expect(options['capability'].deserialize).toBeDefined();
    expect(options['capability'].equals).toBeDefined();
  });

  it('should serialize capability to string', () => {
    class User {
      @StringifiableProperty(() => Capability)
      readonly capability!: Capability;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const serialize = options['capability'].serialize!;
    expect(serialize(Capability.ELEVATED_ACCESS)).toBe('ELEVATED_ACCESS');
    expect(serialize(Capability.READ_ONLY)).toBe('READ_ONLY');
  });

  it('should deserialize string to capability', () => {
    class User {
      @StringifiableProperty(() => Capability)
      readonly capability!: Capability;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const deserialize = options['capability'].deserialize!;
    expect(deserialize('ELEVATED_ACCESS')).toBe(Capability.ELEVATED_ACCESS);
    expect(deserialize('READ_ONLY')).toBe(Capability.READ_ONLY);
  });

  it('should throw error when deserializing invalid string', () => {
    class User {
      @StringifiableProperty(() => Capability)
      readonly capability!: Capability;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const deserialize = options['capability'].deserialize!;
    expect(() => deserialize('INVALID')).toThrow('Invalid Capability value');
  });

  it('should throw error when deserializing non-string value', () => {
    class User {
      @StringifiableProperty(() => Capability)
      readonly capability!: Capability;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const deserialize = options['capability'].deserialize!;
    expect(() => deserialize(123)).toThrow('Invalid value');
  });

  it('should compare capabilities using equals', () => {
    class User {
      @StringifiableProperty(() => Capability)
      readonly capability!: Capability;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const equals = options['capability'].equals!;
    expect(equals(Capability.ELEVATED_ACCESS, Capability.ELEVATED_ACCESS)).toBe(
      true,
    );
    expect(equals(Capability.ELEVATED_ACCESS, Capability.READ_ONLY)).toBe(
      false,
    );
  });

  it('should support array option', () => {
    class User {
      @StringifiableProperty(() => Capability, { array: true })
      readonly capabilities!: Capability[];
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    expect(options['capabilities'].array).toBe(true);
  });

  it('should support optional option', () => {
    class User {
      @StringifiableProperty(() => Capability, { optional: true })
      readonly capability?: Capability;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    expect(options['capability'].optional).toBe(true);
  });

  it('should compare using toString when equals method is not present', () => {
    class SimpleValue {
      constructor(public value: string) {}

      toString() {
        return this.value;
      }

      static parse(value: string): SimpleValue {
        return new SimpleValue(value);
      }
    }

    class Config {
      @StringifiableProperty(() => SimpleValue)
      readonly simple!: SimpleValue;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      Config.prototype,
    );

    const equals = options['simple'].equals!;
    expect(equals(new SimpleValue('test'), new SimpleValue('test'))).toBe(true);
    expect(equals(new SimpleValue('test'), new SimpleValue('other'))).toBe(
      false,
    );
  });
});

class Permission {
  static readonly ADMIN = new Permission({
    id: 'admin',
    level: 10,
    description: 'Administrator access',
  });

  static readonly USER = new Permission({
    id: 'user',
    level: 1,
    description: 'User access',
  });

  readonly id: string;
  readonly level: number;
  readonly description: string;

  protected constructor(data: {
    id: string;
    level: number;
    description: string;
  }) {
    this.id = data.id;
    this.level = data.level;
    this.description = data.description;
  }

  static values = () => {
    return Object.values(Permission).filter((v) => v instanceof Permission);
  };

  static valuesMap = () => {
    const map = new Map<string, Permission>();
    for (const permission of Permission.values()) {
      map.set(permission.id, permission);
    }
    return map;
  };

  static parse(value: unknown): Permission {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Invalid Permission value: ${String(value)}`);
    }
    const data = value as { id: string };
    const permission = Permission.valuesMap().get(data.id);
    if (!permission) {
      throw new Error(`Invalid Permission id: ${data.id}`);
    }
    return permission;
  }

  toJSON() {
    return {
      id: this.id,
      level: this.level,
      description: this.description,
    };
  }

  equals(other: Permission): boolean {
    return this.id === other.id;
  }
}

describe('SerializableProperty', () => {
  it('should register property metadata', () => {
    class User {
      @SerializableProperty(() => Permission)
      readonly permission!: Permission;
    }

    const properties: string[] = Reflect.getMetadata(
      PROPERTY_METADATA_KEY,
      User.prototype,
    );
    expect(properties).toContain('permission');
  });

  it('should register property options with serialize/deserialize functions', () => {
    class User {
      @SerializableProperty(() => Permission)
      readonly permission!: Permission;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    expect(options['permission']).toBeDefined();
    expect(options['permission'].serialize).toBeDefined();
    expect(options['permission'].deserialize).toBeDefined();
    expect(options['permission'].equals).toBeDefined();
  });

  it('should serialize permission to JSON', () => {
    class User {
      @SerializableProperty(() => Permission)
      readonly permission!: Permission;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const serialize = options['permission'].serialize!;
    expect(serialize(Permission.ADMIN)).toEqual({
      id: 'admin',
      level: 10,
      description: 'Administrator access',
    });
    expect(serialize(Permission.USER)).toEqual({
      id: 'user',
      level: 1,
      description: 'User access',
    });
  });

  it('should deserialize JSON to permission', () => {
    class User {
      @SerializableProperty(() => Permission)
      readonly permission!: Permission;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const deserialize = options['permission'].deserialize!;
    expect(
      deserialize({
        id: 'admin',
        level: 10,
        description: 'Administrator access',
      }),
    ).toBe(Permission.ADMIN);
    expect(
      deserialize({ id: 'user', level: 1, description: 'User access' }),
    ).toBe(Permission.USER);
  });

  it('should throw error when deserializing invalid JSON', () => {
    class User {
      @SerializableProperty(() => Permission)
      readonly permission!: Permission;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const deserialize = options['permission'].deserialize!;
    expect(() => deserialize({ id: 'invalid' })).toThrow(
      'Invalid Permission id',
    );
  });

  it('should throw error when deserializing non-object value', () => {
    class User {
      @SerializableProperty(() => Permission)
      readonly permission!: Permission;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const deserialize = options['permission'].deserialize!;
    expect(() => deserialize('invalid')).toThrow('Invalid Permission value');
  });

  it('should compare permissions using equals', () => {
    class User {
      @SerializableProperty(() => Permission)
      readonly permission!: Permission;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    const equals = options['permission'].equals!;
    expect(equals(Permission.ADMIN, Permission.ADMIN)).toBe(true);
    expect(equals(Permission.ADMIN, Permission.USER)).toBe(false);
  });

  it('should compare using toJSON when equals method is not present', () => {
    class SimpleData {
      constructor(
        public id: string,
        public value: number,
      ) {}

      toJSON() {
        return { id: this.id, value: this.value };
      }

      static parse(value: unknown): SimpleData {
        if (typeof value !== 'object' || value === null) {
          throw new Error('Invalid data');
        }
        const data = value as { id: string; value: number };
        return new SimpleData(data.id, data.value);
      }
    }

    class Config {
      @SerializableProperty(() => SimpleData)
      readonly data!: SimpleData;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      Config.prototype,
    );

    const equals = options['data'].equals!;
    expect(equals(new SimpleData('test', 1), new SimpleData('test', 1))).toBe(
      true,
    );
    expect(equals(new SimpleData('test', 1), new SimpleData('test', 2))).toBe(
      false,
    );
    expect(equals(new SimpleData('test', 1), new SimpleData('other', 1))).toBe(
      false,
    );
  });

  it('should support array option', () => {
    class User {
      @SerializableProperty(() => Permission, { array: true })
      readonly permissions!: Permission[];
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    expect(options['permissions'].array).toBe(true);
  });

  it('should support optional option', () => {
    class User {
      @SerializableProperty(() => Permission, { optional: true })
      readonly permission?: Permission;
    }

    const options: Record<string, AnyPropertyOptions> = Reflect.getMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      User.prototype,
    );

    expect(options['permission'].optional).toBe(true);
  });
});
