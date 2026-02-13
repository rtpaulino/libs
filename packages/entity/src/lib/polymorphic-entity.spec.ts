/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  Entity,
  EntityProperty,
  EntityUtils,
  IntProperty,
  NumberProperty,
  PolymorphicProperty,
  PolymorphicVariant,
  StringProperty,
  ArrayProperty,
  PolymorphicRegistry,
} from '../index.js';

describe('Polymorphic Entity', () => {
  // Note: We don't clear the registry in beforeEach because entity decorators
  // run at class definition time. Each test suite uses unique class/enum names.

  describe('Basic polymorphic parsing', () => {
    enum SchemaPropertyType {
      STRING = 'string',
      NUMBER = 'number',
      BOOLEAN = 'boolean',
    }

    @Entity()
    abstract class SchemaProperty {
      @StringProperty({ minLength: 1 })
      name!: string;

      @StringProperty({ optional: true })
      description?: string;

      @PolymorphicProperty(SchemaPropertyType)
      type!: SchemaPropertyType;

      constructor(data: {
        name: string;
        description?: string;
        type: SchemaPropertyType;
      }) {
        this.name = data.name;
        this.description = data.description;
        this.type = data.type;
      }
    }

    @Entity()
    @PolymorphicVariant(SchemaProperty, SchemaPropertyType.STRING)
    class StringSchemaProperty extends SchemaProperty {
      override readonly type = SchemaPropertyType.STRING;

      @IntProperty({ optional: true, min: 0 })
      minLength?: number;

      @IntProperty({ optional: true, min: 0 })
      maxLength?: number;

      constructor(data: {
        name: string;
        description?: string;
        minLength?: number;
        maxLength?: number;
      }) {
        super({ ...data, type: SchemaPropertyType.STRING });
        this.minLength = data.minLength;
        this.maxLength = data.maxLength;
      }
    }

    @Entity()
    @PolymorphicVariant(SchemaProperty, SchemaPropertyType.NUMBER)
    class NumberSchemaProperty extends SchemaProperty {
      override readonly type = SchemaPropertyType.NUMBER;

      @NumberProperty({ optional: true })
      min?: number;

      @NumberProperty({ optional: true })
      max?: number;

      constructor(data: {
        name: string;
        description?: string;
        min?: number;
        max?: number;
      }) {
        super({ ...data, type: SchemaPropertyType.NUMBER });
        this.min = data.min;
        this.max = data.max;
      }
    }

    @Entity()
    @PolymorphicVariant(SchemaProperty, SchemaPropertyType.BOOLEAN)
    class BooleanSchemaProperty extends SchemaProperty {
      override readonly type = SchemaPropertyType.BOOLEAN;

      constructor(data: { name: string; description?: string }) {
        super({ ...data, type: SchemaPropertyType.BOOLEAN });
      }
    }

    it('should parse string variant', async () => {
      const data = {
        name: 'username',
        type: 'string',
        minLength: 3,
        maxLength: 20,
      };

      const prop = await EntityUtils.parse(SchemaProperty, data);

      expect(prop).toBeInstanceOf(StringSchemaProperty);
      expect(prop.name).toBe('username');
      expect(prop.type).toBe(SchemaPropertyType.STRING);
      expect((prop as StringSchemaProperty).minLength).toBe(3);
      expect((prop as StringSchemaProperty).maxLength).toBe(20);
    });

    it('should parse number variant', async () => {
      const data = {
        name: 'age',
        type: 'number',
        min: 0,
        max: 120,
      };

      const prop = await EntityUtils.parse(SchemaProperty, data);

      expect(prop).toBeInstanceOf(NumberSchemaProperty);
      expect(prop.name).toBe('age');
      expect(prop.type).toBe(SchemaPropertyType.NUMBER);
      expect((prop as NumberSchemaProperty).min).toBe(0);
      expect((prop as NumberSchemaProperty).max).toBe(120);
    });

    it('should parse boolean variant', async () => {
      const data = {
        name: 'isActive',
        type: 'boolean',
      };

      const prop = await EntityUtils.parse(SchemaProperty, data);

      expect(prop).toBeInstanceOf(BooleanSchemaProperty);
      expect(prop.name).toBe('isActive');
      expect(prop.type).toBe(SchemaPropertyType.BOOLEAN);
    });

    it('should serialize and deserialize correctly', async () => {
      const original = new StringSchemaProperty({
        name: 'email',
        description: 'User email address',
        minLength: 5,
        maxLength: 100,
      });

      const json = EntityUtils.toJSON(original);
      const parsed = await EntityUtils.parse(SchemaProperty, json);

      expect(parsed).toBeInstanceOf(StringSchemaProperty);
      expect(parsed.name).toBe('email');
      expect(parsed.description).toBe('User email address');
      expect((parsed as StringSchemaProperty).minLength).toBe(5);
      expect((parsed as StringSchemaProperty).maxLength).toBe(100);
    });
  });

  describe('Error handling', () => {
    enum AnimalType {
      DOG = 'dog',
      CAT = 'cat',
    }

    @Entity()
    abstract class Animal {
      @StringProperty()
      name!: string;

      @PolymorphicProperty(AnimalType)
      type!: AnimalType;

      constructor(data: { name: string; type: AnimalType }) {
        this.name = data.name;
        this.type = data.type;
      }
    }

    @Entity()
    @PolymorphicVariant(Animal, AnimalType.DOG)
    class Dog extends Animal {
      override readonly type = AnimalType.DOG;

      @StringProperty()
      breed!: string;

      constructor(data: { name: string; breed: string }) {
        super({ ...data, type: AnimalType.DOG });
        this.breed = data.breed;
      }
    }

    it('should throw error for missing discriminator', async () => {
      const data = {
        name: 'Buddy',
        breed: 'Labrador',
      };

      await expect(EntityUtils.parse(Animal, data)).rejects.toThrow(
        /Missing polymorphic discriminator property/,
      );
    });

    it('should throw error for unknown variant', async () => {
      const data = {
        name: 'Whiskers',
        type: 'bird', // Not registered
      };

      await expect(EntityUtils.parse(Animal, data)).rejects.toThrow(
        /Unknown polymorphic variant 'bird'/,
      );
    });

    it('should throw error for invalid input type', async () => {
      await expect(EntityUtils.parse(Animal, 'not an object')).rejects.toThrow(
        /Expects an object but received string/,
      );
    });
  });

  describe('Nested polymorphic entities', () => {
    enum FieldType {
      TEXT = 'text',
      NUMBER = 'number',
    }

    @Entity()
    abstract class Field {
      @StringProperty()
      label!: string;

      @PolymorphicProperty(FieldType)
      type!: FieldType;

      constructor(data: { label: string; type: FieldType }) {
        this.label = data.label;
        this.type = data.type;
      }
    }

    @Entity()
    @PolymorphicVariant(Field, FieldType.TEXT)
    class TextField extends Field {
      override readonly type = FieldType.TEXT;

      @StringProperty()
      placeholder!: string;

      constructor(data: { label: string; placeholder: string }) {
        super({ ...data, type: FieldType.TEXT });
        this.placeholder = data.placeholder;
      }
    }

    @Entity()
    @PolymorphicVariant(Field, FieldType.NUMBER)
    class NumberField extends Field {
      override readonly type = FieldType.NUMBER;

      @NumberProperty()
      defaultValue!: number;

      constructor(data: { label: string; defaultValue: number }) {
        super({ ...data, type: FieldType.NUMBER });
        this.defaultValue = data.defaultValue;
      }
    }

    @Entity()
    class Form {
      @StringProperty()
      title!: string;

      @EntityProperty(() => Field)
      primaryField!: Field;

      constructor(data: { title: string; primaryField: Field }) {
        this.title = data.title;
        this.primaryField = data.primaryField;
      }
    }

    it('should parse nested polymorphic property', async () => {
      const data = {
        title: 'Contact Form',
        primaryField: {
          label: 'Email',
          type: 'text',
          placeholder: 'Enter your email',
        },
      };

      const form = await EntityUtils.parse(Form, data);

      expect(form.title).toBe('Contact Form');
      expect(form.primaryField).toBeInstanceOf(TextField);
      expect(form.primaryField.label).toBe('Email');
      expect((form.primaryField as TextField).placeholder).toBe(
        'Enter your email',
      );
    });

    it('should serialize nested polymorphic property', () => {
      const form = new Form({
        title: 'Survey',
        primaryField: new NumberField({
          label: 'Rating',
          defaultValue: 5,
        }),
      });

      const json = EntityUtils.toJSON(form);

      expect(json).toEqual({
        title: 'Survey',
        primaryField: {
          label: 'Rating',
          type: 'number',
          defaultValue: 5,
        },
      });
    });
  });

  describe('Array of polymorphic entities', () => {
    enum ItemType {
      BOOK = 'book',
      MOVIE = 'movie',
    }

    @Entity()
    abstract class Item {
      @StringProperty()
      title!: string;

      @PolymorphicProperty(ItemType)
      type!: ItemType;

      constructor(data: { title: string; type: ItemType }) {
        this.title = data.title;
        this.type = data.type;
      }
    }

    @Entity()
    @PolymorphicVariant(Item, ItemType.BOOK)
    class Book extends Item {
      override readonly type = ItemType.BOOK;

      @StringProperty()
      author!: string;

      constructor(data: { title: string; author: string }) {
        super({ ...data, type: ItemType.BOOK });
        this.author = data.author;
      }
    }

    @Entity()
    @PolymorphicVariant(Item, ItemType.MOVIE)
    class Movie extends Item {
      override readonly type = ItemType.MOVIE;

      @IntProperty()
      year!: number;

      constructor(data: { title: string; year: number }) {
        super({ ...data, type: ItemType.MOVIE });
        this.year = data.year;
      }
    }

    @Entity()
    class Library {
      @StringProperty()
      name!: string;

      @ArrayProperty(() => Item)
      items!: Item[];

      constructor(data: { name: string; items: Item[] }) {
        this.name = data.name;
        this.items = data.items;
      }
    }

    it('should parse array of mixed polymorphic types', async () => {
      const data = {
        name: 'My Collection',
        items: [
          { title: '1984', type: 'book', author: 'George Orwell' },
          { title: 'Inception', type: 'movie', year: 2010 },
          { title: 'The Hobbit', type: 'book', author: 'J.R.R. Tolkien' },
        ],
      };

      const library = await EntityUtils.parse(Library, data);

      expect(library.name).toBe('My Collection');
      expect(library.items).toHaveLength(3);
      expect(library.items[0]).toBeInstanceOf(Book);
      expect(library.items[1]).toBeInstanceOf(Movie);
      expect(library.items[2]).toBeInstanceOf(Book);
      expect((library.items[0] as Book).author).toBe('George Orwell');
      expect((library.items[1] as Movie).year).toBe(2010);
    });
  });

  describe('Optional polymorphic properties', () => {
    enum ShapeType {
      CIRCLE = 'circle',
      RECTANGLE = 'rectangle',
    }

    @Entity()
    abstract class Shape {
      @PolymorphicProperty(ShapeType)
      type!: ShapeType;

      constructor(data: { type: ShapeType }) {
        this.type = data.type;
      }
    }

    @Entity()
    @PolymorphicVariant(Shape, ShapeType.CIRCLE)
    class Circle extends Shape {
      override readonly type = ShapeType.CIRCLE;

      @NumberProperty()
      radius!: number;

      constructor(data: { radius: number }) {
        super({ type: ShapeType.CIRCLE });
        this.radius = data.radius;
      }
    }

    @Entity()
    class Drawing {
      @StringProperty()
      name!: string;

      @EntityProperty(() => Shape, {
        optional: true,
      })
      shape?: Shape;

      constructor(data: { name: string; shape?: Shape }) {
        this.name = data.name;
        this.shape = data.shape;
      }
    }

    it('should handle optional polymorphic property when present', async () => {
      const data = {
        name: 'My Drawing',
        shape: { type: 'circle', radius: 5 },
      };

      const drawing = await EntityUtils.parse(Drawing, data);

      expect(drawing.shape).toBeInstanceOf(Circle);
      expect((drawing.shape as Circle).radius).toBe(5);
    });

    it('should handle optional polymorphic property when absent', async () => {
      const data = {
        name: 'Empty Drawing',
      };

      const drawing = await EntityUtils.parse(Drawing, data);

      expect(drawing.shape).toBeUndefined();
    });
  });

  describe('PolymorphicRegistry', () => {
    it('should prevent duplicate variant registration', () => {
      enum Type {
        A = 'a',
      }

      @Entity()
      abstract class Base {
        @PolymorphicProperty(Type)
        type!: Type;
      }

      @Entity()
      @PolymorphicVariant(Base, Type.A)
      class VariantA extends Base {}

      // Attempting to register another class with the same discriminator
      expect(() => {
        @Entity()
        @PolymorphicVariant(Base, Type.A)
        class VariantB extends Base {}
      }).toThrow(/Duplicate polymorphic variant registration/);
    });

    it('should prevent multiple discriminator properties', () => {
      enum Type {
        A = 'a',
      }

      expect(() => {
        @Entity()
        class Invalid {
          @PolymorphicProperty(Type)
          type1!: Type;

          @PolymorphicProperty(Type)
          type2!: Type; // Should throw
        }
      }).toThrow(/already has a polymorphic discriminator property/);
    });

    it('should retrieve all variants for a base class', () => {
      enum Status {
        ACTIVE = 'active',
        INACTIVE = 'inactive',
      }

      @Entity()
      abstract class Record {
        @PolymorphicProperty(Status)
        status!: Status;
      }

      @Entity()
      @PolymorphicVariant(Record, Status.ACTIVE)
      class ActiveRecord extends Record {}

      @Entity()
      @PolymorphicVariant(Record, Status.INACTIVE)
      class InactiveRecord extends Record {}

      const variants = PolymorphicRegistry.getAllVariants(Record);

      expect(variants).toHaveLength(2);
      expect(variants.map((v) => v.discriminatorValue)).toContain('active');
      expect(variants.map((v) => v.discriminatorValue)).toContain('inactive');
    });
  });

  describe('Stringifiable discriminator types', () => {
    // Define a stringifiable type similar to the Capability class
    class Priority {
      static readonly HIGH = new Priority('high', 'High Priority');
      static readonly MEDIUM = new Priority('medium', 'Medium Priority');
      static readonly LOW = new Priority('low', 'Low Priority');

      readonly value: string;
      readonly label: string;

      private constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
      }

      static values(): Priority[] {
        return [Priority.HIGH, Priority.MEDIUM, Priority.LOW];
      }

      static valuesMap(): Map<string, Priority> {
        const map = new Map<string, Priority>();
        for (const priority of Priority.values()) {
          map.set(priority.value, priority);
        }
        return map;
      }

      static parse(value: string): Priority {
        const priority = Priority.valuesMap().get(value);
        if (!priority) {
          throw new Error(`Invalid Priority value: ${value}`);
        }
        return priority;
      }

      toString(): string {
        return this.value;
      }

      equals(other: Priority): boolean {
        return this.value === other.value;
      }
    }

    @Entity()
    abstract class Task {
      @StringProperty()
      title!: string;

      @PolymorphicProperty(() => Priority)
      priority!: Priority;

      constructor(data: { title: string; priority: Priority }) {
        this.title = data.title;
        this.priority = data.priority;
      }
    }

    @Entity()
    @PolymorphicVariant(Task, Priority.HIGH.value)
    class HighPriorityTask extends Task {
      override readonly priority = Priority.HIGH;

      @StringProperty()
      escalationContact!: string;

      constructor(data: { title: string; escalationContact: string }) {
        super({ ...data, priority: Priority.HIGH });
        this.escalationContact = data.escalationContact;
      }
    }

    @Entity()
    @PolymorphicVariant(Task, Priority.LOW.value)
    class LowPriorityTask extends Task {
      override readonly priority = Priority.LOW;

      @IntProperty({ optional: true })
      deferDays?: number;

      constructor(data: { title: string; deferDays?: number }) {
        super({ ...data, priority: Priority.LOW });
        this.deferDays = data.deferDays;
      }
    }

    it('should parse high priority variant with stringifiable discriminator', async () => {
      const data = {
        title: 'Critical bug fix',
        priority: 'high',
        escalationContact: 'john@example.com',
      };

      const task = await EntityUtils.parse(Task, data);

      expect(task).toBeInstanceOf(HighPriorityTask);
      expect(task.title).toBe('Critical bug fix');
      expect(task.priority).toBe(Priority.HIGH);
      expect(task.priority.label).toBe('High Priority');
      expect((task as HighPriorityTask).escalationContact).toBe(
        'john@example.com',
      );
    });

    it('should parse low priority variant with stringifiable discriminator', async () => {
      const data = {
        title: 'Update documentation',
        priority: 'low',
        deferDays: 7,
      };

      const task = await EntityUtils.parse(Task, data);

      expect(task).toBeInstanceOf(LowPriorityTask);
      expect(task.title).toBe('Update documentation');
      expect(task.priority).toBe(Priority.LOW);
      expect(task.priority.label).toBe('Low Priority');
      expect((task as LowPriorityTask).deferDays).toBe(7);
    });

    it('should serialize and deserialize with stringifiable discriminator', async () => {
      const original = new HighPriorityTask({
        title: 'Security vulnerability',
        escalationContact: 'security@example.com',
      });

      const json = EntityUtils.toJSON(original);

      expect(json).toEqual({
        title: 'Security vulnerability',
        priority: 'high',
        escalationContact: 'security@example.com',
      });

      const parsed = await EntityUtils.parse(Task, json);

      expect(parsed).toBeInstanceOf(HighPriorityTask);
      expect(parsed.priority).toBe(Priority.HIGH);
      expect(parsed.priority.equals(Priority.HIGH)).toBe(true);
    });

    it('should throw error for invalid stringifiable discriminator value', async () => {
      const data = {
        title: 'Some task',
        priority: 'invalid',
      };

      await expect(EntityUtils.parse(Task, data)).rejects.toThrow(
        /Unknown polymorphic variant 'invalid'/,
      );
    });
  });
});
