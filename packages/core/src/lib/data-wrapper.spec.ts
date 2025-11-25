import { describe, it, expect } from 'vitest';
import { DataWrapper } from './data-wrapper.js';

describe('DataWrapper', () => {
  describe('isNil', () => {
    [null, undefined].forEach((value) => {
      it(`should return true when value is ${value}`, () => {
        expect(new DataWrapper(value).isNil()).toBe(true);
      });
    });

    ['', {}, [], true, false, 0, 1].forEach((value) => {
      it(`should return false when value is ${value}`, () => {
        expect(new DataWrapper(value).isNil()).toBe(false);
      });
    });
  });

  describe('isArray', () => {
    it(`should return true when value is an empty array`, () => {
      expect(new DataWrapper([]).isArray()).toBe(true);
    });

    it(`should return true when value is an array with elements`, () => {
      expect(new DataWrapper([0, 'a']).isArray()).toBe(true);
    });

    [null, undefined, {}, true, false, 0, 1, '', 'a'].forEach((value) => {
      it(`should return false when value is ${value}`, () => {
        expect(new DataWrapper(value).isArray()).toBe(false);
      });
    });
  });

  describe('isObject', () => {
    it(`should return true when value is an empty object`, () => {
      expect(new DataWrapper({}).isObject()).toBe(true);
    });

    it(`should return true when value is an instance of a class`, () => {
      expect(new DataWrapper(new (class A {})()).isObject()).toBe(true);
    });

    [null, undefined, [], true, false, 0, 1, '', 'a'].forEach((value) => {
      it(`should return false when value is ${value}`, () => {
        expect(new DataWrapper(value).isObject()).toBe(false);
      });
    });
  });

  describe('asBoolean', () => {
    [null, undefined].forEach((value) => {
      it(`should return the value when ${value}`, () => {
        expect(new DataWrapper(value).asBoolean()).toBe(value);
      });
    });

    [true, 't', 'T', 'true', 'TRUE', '1', 1].forEach((value) => {
      it(`should return true when value is ${value}`, () => {
        expect(new DataWrapper(value).asBoolean()).toBe(true);
      });
    });

    [false, 'f', 'false', 'tru', 0, -1, {}, []].forEach((value) => {
      it(`should return false when value is ${value}`, () => {
        expect(new DataWrapper(value).asBoolean()).toBe(false);
      });
    });
  });

  describe('asString', () => {
    [null, undefined].forEach((value) => {
      it(`should return the value when ${value}`, () => {
        expect(new DataWrapper(value).asString()).toBe(value);
      });
    });

    ['test', 'any other string'].forEach((value) => {
      it(`should return the value when "${value}"`, () => {
        expect(new DataWrapper(value).asString()).toBe(value);
      });
    });

    [
      {
        value: new Date('2025-08-28T12:00:12.345Z'),
        expected: /Thu Aug 28 2025 \d{2}:\d{2}:\d{2} GMT.*/,
      },
      {
        value: new (class Test {
          toString() {
            return 'abc';
          }
        })(),
        expected: /^abc$/,
      },
    ].forEach(({ value, expected }) => {
      it(`should return result of .toString()`, () => {
        const stringValue = new DataWrapper(value).asString();
        expect(stringValue).toMatch(expected);
      });
    });

    [
      {
        value: true,
        expected: 'true',
      },
      {
        value: false,
        expected: 'false',
      },
      {
        value: {},
        expected: '[object Object]',
      },
    ].forEach(({ value, expected }) => {
      it(`should return result of String(value)`, () => {
        const stringValue = new DataWrapper(value).asString();
        expect(stringValue).toBe(expected);
      });
    });
  });

  describe('withDefault', () => {
    it('should return default value when current value is null', () => {
      const defaultValue = { name: 'John', age: 30 };
      const result = new DataWrapper(null).withDefault(defaultValue);
      expect(result.value).toEqual(defaultValue);
    });

    it('should return default value when current value is undefined', () => {
      const defaultValue = { name: 'John', age: 30 };
      const result = new DataWrapper(undefined).withDefault(defaultValue);
      expect(result.value).toEqual(defaultValue);
    });

    it('should merge default with current object value', () => {
      const currentValue = { name: 'Jane', city: 'New York' };
      const defaultValue = { name: 'John', age: 30, country: 'USA' };
      const result = new DataWrapper(currentValue).withDefault(defaultValue);
      expect(result.value).toEqual({
        name: 'Jane', // current value takes precedence
        age: 30, // from default
        city: 'New York', // from current
        country: 'USA', // from default
      });
    });

    it('should perform deep merge for nested objects', () => {
      const currentValue = {
        user: { name: 'Jane' },
        settings: { theme: 'dark' },
      };
      const defaultValue = {
        user: { name: 'John', id: 123 },
        settings: { theme: 'light', lang: 'en' },
      };
      const result = new DataWrapper(currentValue).withDefault(defaultValue);
      expect(result.value).toEqual({
        user: { name: 'Jane', id: 123 },
        settings: { theme: 'dark', lang: 'en' },
      });
    });

    it('should throw TypeError when current value is not an object', () => {
      const defaultValue = { name: 'John' };
      expect(() => {
        new DataWrapper('string').withDefault(defaultValue);
      }).toThrow(new TypeError('Expected object to apply default, got string'));
    });

    it('should throw TypeError when current value is an array', () => {
      const defaultValue = { name: 'John' };
      expect(() => {
        new DataWrapper([1, 2, 3]).withDefault(defaultValue);
      }).toThrow(new TypeError('Expected object to apply default, got array'));
    });

    it('should throw TypeError when current value is a number', () => {
      const defaultValue = { name: 'John' };
      expect(() => {
        new DataWrapper(42).withDefault(defaultValue);
      }).toThrow(new TypeError('Expected object to apply default, got number'));
    });
  });

  describe('asArray', () => {
    [null, undefined].forEach((value) => {
      it(`should return empty array when value is ${value}`, () => {
        const result = new DataWrapper(value).asArray();
        expect(result).toEqual([]);
      });
    });

    it('should return array of DataWrapper instances for empty array', () => {
      const result = new DataWrapper([]).asArray();
      expect(result).toEqual([]);
    });

    it('should return array of DataWrapper instances for array with elements', () => {
      const input = [1, 'hello', null, { key: 'value' }, [1, 2]];
      const result = new DataWrapper(input).asArray();

      expect(result.length).toBe(5);
      expect(result[0].value).toBe(1);
      expect(result[1].value).toBe('hello');
      expect(result[2].value).toBe(null);
      expect(result[3].value).toEqual({ key: 'value' });
      expect(result[4].value).toEqual([1, 2]);

      // Verify all elements are DataWrapper instances
      result.forEach((item) => {
        expect(item instanceof DataWrapper).toBe(true);
      });
    });

    it('should return array of DataWrapper instances for nested structures', () => {
      const input = [{ name: 'John', age: 30 }, ['nested', 'array'], 42, true];
      const result = new DataWrapper(input).asArray();

      expect(result.length).toBe(4);

      // Test that we can access nested properties
      expect(result[0].get('name').asString()).toBe('John');
      expect(result[0].get('age').asNumber()).toBe(30);
      expect(result[2].asNumber()).toBe(42);
      expect(result[3].asBoolean()).toBe(true);
    });

    ['string', 123, true, {}, { key: 'value' }].forEach((value) => {
      it(`should throw error when value is ${typeof value === 'object' ? JSON.stringify(value) : value}`, () => {
        expect(() => {
          new DataWrapper(value).asArray();
        }).toThrow(
          new TypeError(
            `Expected array, got ${new DataWrapper(value).nativeType}`,
          ),
        );
      });
    });

    it('should throw error with correct native type for Date object', () => {
      const date = new Date();
      expect(() => {
        new DataWrapper(date).asArray();
      }).toThrow(new TypeError('Expected array, got date'));
    });

    it('should throw error with correct native type for class instance', () => {
      class TestClass {}
      const instance = new TestClass();
      expect(() => {
        new DataWrapper(instance).asArray();
      }).toThrow(new TypeError('Expected array, got [class TestClass]'));
    });
  });

  describe('asStringArray', () => {
    [null, undefined].forEach((value) => {
      it(`should return empty array when value is ${value}`, () => {
        const result = new DataWrapper(value).asStringArray();
        expect(result).toEqual([]);
      });
    });

    it('should return empty array for empty array', () => {
      const result = new DataWrapper([]).asStringArray();
      expect(result).toEqual([]);
    });

    it('should convert array elements to strings and filter out null/undefined', () => {
      const input = ['hello', 'world', null, undefined, ''];
      const result = new DataWrapper(input).asStringArray();
      expect(result).toEqual(['hello', 'world']);
    });

    it('should convert various types to strings', () => {
      const input = [
        'string',
        123,
        true,
        false,
        { toString: () => 'custom' },
        new Date('2025-01-02T00:00:00.000Z'),
      ];
      const result = new DataWrapper(input).asStringArray();

      expect(result[0]).toBe('string');
      expect(result[1]).toBe('123');
      expect(result[2]).toBe('true');
      expect(result[3]).toBe('false');
      expect(result[4]).toBe('custom');
      expect(result[5]).toMatch(/2025/); // Date string should contain year
    });

    it('should filter out empty strings after conversion', () => {
      const input = ['hello', '', 'world', null, undefined];
      const result = new DataWrapper(input).asStringArray();
      expect(result).toEqual(['hello', 'world']);
    });

    it('should handle complex objects by converting them to strings', () => {
      const input = [{ name: 'test' }, [1, 2, 3], 'valid string'];
      const result = new DataWrapper(input).asStringArray();

      expect(result[0]).toBe('[object Object]');
      expect(result[1]).toBe('1,2,3');
      expect(result[2]).toBe('valid string');
    });

    ['string', 123, true, {}, { key: 'value' }].forEach((value) => {
      it(`should throw error when value is ${typeof value === 'object' ? JSON.stringify(value) : value}`, () => {
        expect(() => {
          new DataWrapper(value).asStringArray();
        }).toThrow(
          new TypeError(
            `Expected array, got ${new DataWrapper(value).nativeType}`,
          ),
        );
      });
    });

    it('should throw error with correct native type for Date object', () => {
      const date = new Date();
      expect(() => {
        new DataWrapper(date).asStringArray();
      }).toThrow(new TypeError('Expected array, got date'));
    });

    it('should throw error with correct native type for class instance', () => {
      class TestClass {}
      const instance = new TestClass();
      expect(() => {
        new DataWrapper(instance).asStringArray();
      }).toThrow(new TypeError('Expected array, got [class TestClass]'));
    });
  });

  describe('parseZod', () => {
    it('should return null when value is null', () => {
      const mockSchema = { parse: () => 'should not be called' };
      const result = new DataWrapper(null).parseZod(mockSchema);
      expect(result).toBe(null);
    });

    it('should return undefined when value is undefined', () => {
      const mockSchema = { parse: () => 'should not be called' };
      const result = new DataWrapper(undefined).parseZod(mockSchema);
      expect(result).toBe(undefined);
    });

    it('should call schema.parse with the current value', () => {
      const inputValue = { name: 'John', age: 30 };
      let parseCalled = false;
      let parseArgument: unknown;

      const mockSchema = {
        parse: (data: unknown) => {
          parseCalled = true;
          parseArgument = data;
          const typedData = data as { name: string; age: number };
          return { name: typedData.name.toUpperCase(), age: typedData.age };
        },
      };

      const result = new DataWrapper(inputValue).parseZod(mockSchema);

      expect(parseCalled).toBe(true);
      expect(parseArgument).toEqual(inputValue);
      expect(result).toEqual({ name: 'JOHN', age: 30 });
    });

    it('should return the parsed result from schema', () => {
      const inputValue = 'hello world';
      const mockSchema = {
        parse: (data: unknown) => (data as string).toUpperCase(),
      };

      const result = new DataWrapper(inputValue).parseZod(mockSchema);
      expect(result).toBe('HELLO WORLD');
    });

    it('should propagate parsing errors from schema', () => {
      const inputValue = { invalid: 'data' };
      const mockSchema = {
        parse: () => {
          throw new Error('Validation failed');
        },
      };

      expect(() => {
        new DataWrapper(inputValue).parseZod(mockSchema);
      }).toThrow(new Error('Validation failed'));
    });

    it('should work with complex schema transformations', () => {
      const inputValue = { name: '  john doe  ', age: '25', active: 'true' };
      const mockSchema = {
        parse: (data: unknown) => {
          const typedData = data as {
            name: string;
            age: string;
            active: string;
          };
          return {
            name: typedData.name.trim(),
            age: parseInt(typedData.age, 10),
            active: typedData.active === 'true',
            processed: true,
          };
        },
      };

      const result = new DataWrapper(inputValue).parseZod(mockSchema);
      expect(result).toEqual({
        name: 'john doe',
        age: 25,
        active: true,
        processed: true,
      });
    });

    it('should work with array data', () => {
      const inputValue = [1, 2, 3, 4, 5];
      const mockSchema = {
        parse: (data: unknown) => (data as number[]).filter((n) => n % 2 === 0),
      };

      const result = new DataWrapper(inputValue).parseZod(mockSchema);
      expect(result).toEqual([2, 4]);
    });
  });
});

describe('StrictDataWrapper', () => {
  describe('asArray', () => {
    it('should return array of DataWrapper instances for empty array', () => {
      const result = new DataWrapper([]).strict().asArray();
      expect(result).toEqual([]);
    });

    it('should return array of DataWrapper instances for array with elements', () => {
      const input = [1, 'hello', null, { key: 'value' }, [1, 2]];
      const result = new DataWrapper(input).strict().asArray();

      expect(result.length).toBe(5);
      expect(result[0].value).toBe(1);
      expect(result[1].value).toBe('hello');
      expect(result[2].value).toBe(null);
      expect(result[3].value).toEqual({ key: 'value' });
      expect(result[4].value).toEqual([1, 2]);

      // Verify all elements are DataWrapper instances (not StrictDataWrapper)
      result.forEach((item) => {
        expect(item instanceof DataWrapper).toBe(true);
        expect(item.isStrict).toBe(false);
      });
    });

    it('should return array of DataWrapper instances for nested structures', () => {
      const input = [{ name: 'John', age: 30 }, ['nested', 'array'], 42, true];
      const result = new DataWrapper(input).strict().asArray();

      expect(result.length).toBe(4);

      // Test that we can access nested properties using non-strict wrapper
      expect(result[0].get('name').asString()).toBe('John');
      expect(result[0].get('age').asNumber()).toBe(30);
      expect(result[2].asNumber()).toBe(42);
      expect(result[3].asBoolean()).toBe(true);
    });

    // StrictDataWrapper should NOT handle null/undefined like regular DataWrapper
    [null, undefined].forEach((value) => {
      it(`should throw error when value is ${value}`, () => {
        expect(() => {
          new DataWrapper(value).strict().asArray();
        }).toThrow(
          new TypeError(
            `Expected array, got ${new DataWrapper(value).nativeType}`,
          ),
        );
      });
    });

    ['string', 123, true, {}, { key: 'value' }].forEach((value) => {
      it(`should throw error when value is ${typeof value === 'object' ? JSON.stringify(value) : value}`, () => {
        expect(() => {
          new DataWrapper(value).strict().asArray();
        }).toThrow(
          new TypeError(
            `Expected array, got ${new DataWrapper(value).nativeType}`,
          ),
        );
      });
    });

    it('should throw error with correct native type for Date object', () => {
      const date = new Date();
      expect(() => {
        new DataWrapper(date).strict().asArray();
      }).toThrow(new TypeError('Expected array, got date'));
    });

    it('should throw error with correct native type for class instance', () => {
      class TestClass {}
      const instance = new TestClass();
      expect(() => {
        new DataWrapper(instance).strict().asArray();
      }).toThrow(new TypeError('Expected array, got [class TestClass]'));
    });
  });

  describe('asStringArray', () => {
    it('should return empty array for empty array', () => {
      const result = new DataWrapper([]).strict().asStringArray();
      expect(result).toEqual([]);
    });

    it('should return array of strings when all elements are strings', () => {
      const input = ['hello', 'world', '', 'test'];
      const result = new DataWrapper(input).strict().asStringArray();
      expect(result).toEqual(['hello', 'world', '', 'test']);
    });

    it('should throw error when array contains non-string elements', () => {
      const input = ['hello', 123, 'world'];
      expect(() => {
        new DataWrapper(input).strict().asStringArray();
      }).toThrow(
        new TypeError(
          'Expected array to contain only strings, but found number.',
        ),
      );
    });

    it('should throw error when array contains null', () => {
      const input = ['hello', null, 'world'];
      expect(() => {
        new DataWrapper(input).strict().asStringArray();
      }).toThrow(
        new TypeError(
          'Expected array to contain only strings, but found object.',
        ),
      );
    });

    it('should throw error when array contains undefined', () => {
      const input = ['hello', undefined, 'world'];
      expect(() => {
        new DataWrapper(input).strict().asStringArray();
      }).toThrow(
        new TypeError(
          'Expected array to contain only strings, but found undefined.',
        ),
      );
    });

    it('should throw error when array contains boolean', () => {
      const input = ['hello', true, 'world'];
      expect(() => {
        new DataWrapper(input).strict().asStringArray();
      }).toThrow(
        new TypeError(
          'Expected array to contain only strings, but found boolean.',
        ),
      );
    });

    it('should throw error when array contains object', () => {
      const input = ['hello', { key: 'value' }, 'world'];
      expect(() => {
        new DataWrapper(input).strict().asStringArray();
      }).toThrow(
        new TypeError(
          'Expected array to contain only strings, but found object.',
        ),
      );
    });

    it('should throw error when array contains nested array', () => {
      const input = ['hello', ['nested'], 'world'];
      expect(() => {
        new DataWrapper(input).strict().asStringArray();
      }).toThrow(
        new TypeError(
          'Expected array to contain only strings, but found object.',
        ),
      );
    });

    ['string', 123, true, {}, { key: 'value' }].forEach((value) => {
      it(`should throw error when value is ${typeof value === 'object' ? JSON.stringify(value) : value}`, () => {
        expect(() => {
          new DataWrapper(value).strict().asStringArray();
        }).toThrow(
          new TypeError(
            `Expected array, got ${new DataWrapper(value).nativeType}`,
          ),
        );
      });
    });

    it('should throw error with correct native type for Date object', () => {
      const date = new Date();
      expect(() => {
        new DataWrapper(date).strict().asStringArray();
      }).toThrow(new TypeError('Expected array, got date'));
    });

    it('should throw error with correct native type for class instance', () => {
      class TestClass {}
      const instance = new TestClass();
      expect(() => {
        new DataWrapper(instance).strict().asStringArray();
      }).toThrow(new TypeError('Expected array, got [class TestClass]'));
    });
  });
});
