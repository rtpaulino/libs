/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
  Entity,
  EntityUtils,
  StringProperty,
  NumberProperty,
  DiscriminatedEntityProperty,
  EntityRegistry,
} from '../index.js';

describe('DiscriminatedEntityProperty', () => {
  // Note: We don't clear the registry in beforeEach because entity decorators
  // run at class definition time. Each test suite uses unique entity names.

  describe('Basic discriminated entity', () => {
    @Entity({ name: 'Circle' })
    class Circle {
      @StringProperty()
      type = 'circle';

      @NumberProperty()
      radius!: number;

      constructor(data: Partial<Circle>) {
        Object.assign(this, data);
      }
    }

    @Entity({ name: 'Rectangle' })
    class Rectangle {
      @StringProperty()
      type = 'rectangle';

      @NumberProperty()
      width!: number;

      @NumberProperty()
      height!: number;

      constructor(data: Partial<Rectangle>) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Drawing {
      @DiscriminatedEntityProperty()
      shape!: Circle | Rectangle;

      constructor(data: Partial<Drawing>) {
        Object.assign(this, data);
      }
    }

    it('should serialize Circle with __type discriminator', () => {
      const drawing = new Drawing({
        shape: new Circle({ radius: 5 }),
      });

      const json = EntityUtils.toJSON(drawing);

      expect(json).toEqual({
        shape: {
          type: 'circle',
          radius: 5,
          __type: 'Circle',
        },
      });
    });

    it('should serialize Rectangle with __type discriminator', () => {
      const drawing = new Drawing({
        shape: new Rectangle({ width: 10, height: 20 }),
      });

      const json = EntityUtils.toJSON(drawing);

      expect(json).toEqual({
        shape: {
          type: 'rectangle',
          width: 10,
          height: 20,
          __type: 'Rectangle',
        },
      });
    });

    it('should deserialize Circle using __type discriminator', async () => {
      const json = {
        shape: {
          __type: 'Circle',
          type: 'circle',
          radius: 5,
        },
      };

      const drawing = await EntityUtils.parse(Drawing, json);

      expect(drawing.shape).toBeInstanceOf(Circle);
      expect((drawing.shape as Circle).radius).toBe(5);
    });

    it('should deserialize Rectangle using __type discriminator', async () => {
      const json = {
        shape: {
          __type: 'Rectangle',
          type: 'rectangle',
          width: 10,
          height: 20,
        },
      };

      const drawing = await EntityUtils.parse(Drawing, json);

      expect(drawing.shape).toBeInstanceOf(Rectangle);
      expect((drawing.shape as Rectangle).width).toBe(10);
      expect((drawing.shape as Rectangle).height).toBe(20);
    });

    it('should round-trip Circle', async () => {
      const original = new Drawing({
        shape: new Circle({ radius: 7 }),
      });

      const json = EntityUtils.toJSON(original);
      const parsed = await EntityUtils.parse(Drawing, json);

      expect(parsed.shape).toBeInstanceOf(Circle);
      expect((parsed.shape as Circle).radius).toBe(7);
    });

    it('should round-trip Rectangle', async () => {
      const original = new Drawing({
        shape: new Rectangle({ width: 15, height: 25 }),
      });

      const json = EntityUtils.toJSON(original);
      const parsed = await EntityUtils.parse(Drawing, json);

      expect(parsed.shape).toBeInstanceOf(Rectangle);
      expect((parsed.shape as Rectangle).width).toBe(15);
      expect((parsed.shape as Rectangle).height).toBe(25);
    });
  });

  describe('Custom discriminator property', () => {
    @Entity({ name: 'Dog' })
    class Dog {
      @StringProperty()
      breed!: string;

      constructor(data: Partial<Dog>) {
        Object.assign(this, data);
      }
    }

    @Entity({ name: 'Cat' })
    class Cat {
      @NumberProperty()
      lives!: number;

      constructor(data: Partial<Cat>) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Pet {
      @DiscriminatedEntityProperty({ discriminatorProperty: 'animalType' })
      animal!: Dog | Cat;

      constructor(data: Partial<Pet>) {
        Object.assign(this, data);
      }
    }

    it('should serialize with custom discriminator property', () => {
      const pet = new Pet({
        animal: new Dog({ breed: 'Labrador' }),
      });

      const json = EntityUtils.toJSON(pet);

      expect(json).toEqual({
        animal: {
          breed: 'Labrador',
          animalType: 'Dog',
        },
      });
    });

    it('should deserialize using custom discriminator property', async () => {
      const json = {
        animal: {
          animalType: 'Cat',
          lives: 9,
        },
      };

      const pet = await EntityUtils.parse(Pet, json);

      expect(pet.animal).toBeInstanceOf(Cat);
      expect((pet.animal as Cat).lives).toBe(9);
    });
  });

  describe('Entity name resolution', () => {
    it('should use class name when name option not provided', () => {
      @Entity()
      class DefaultNameEntity {
        @StringProperty()
        value!: string;

        constructor(data: Partial<DefaultNameEntity>) {
          Object.assign(this, data);
        }
      }

      const name = EntityUtils.getEntityName(DefaultNameEntity);
      expect(name).toBe('DefaultNameEntity');
    });

    it('should use custom name when provided', () => {
      @Entity({ name: 'CustomName' })
      class MyEntity {
        @StringProperty()
        value!: string;

        constructor(data: Partial<MyEntity>) {
          Object.assign(this, data);
        }
      }

      const name = EntityUtils.getEntityName(MyEntity);
      expect(name).toBe('CustomName');
    });

    it('should retrieve entity name from instance', () => {
      @Entity({ name: 'InstanceTest' })
      class TestEntity {
        @StringProperty()
        value!: string;

        constructor(data: Partial<TestEntity>) {
          Object.assign(this, data);
        }
      }

      const instance = new TestEntity({ value: 'test' });
      const name = EntityUtils.getEntityName(instance);
      expect(name).toBe('InstanceTest');
    });
  });

  describe('EntityRegistry', () => {
    it('should register entity with custom name', () => {
      @Entity({ name: 'TestEntity' })
      class MyTestEntity {
        constructor() {}
      }

      expect(EntityRegistry.has('TestEntity')).toBe(true);
      expect(EntityRegistry.get('TestEntity')).toBe(MyTestEntity);
    });

    it('should allow re-registering same class with same name', () => {
      @Entity({ name: 'SameClass' })
      class ReusableEntity {
        constructor() {}
      }

      // This should not throw
      EntityRegistry.register('SameClass', ReusableEntity);

      expect(EntityRegistry.get('SameClass')).toBe(ReusableEntity);
    });

    it('should return undefined for non-existent entity', () => {
      expect(EntityRegistry.get('NonExistent')).toBeUndefined();
    });

    it('should list all registered entity names', () => {
      const names = EntityRegistry.getAllNames();
      expect(names.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error handling', () => {
    @Entity({ name: 'ValidEntity' })
    class ValidEntity {
      @StringProperty()
      value!: string;

      constructor(data: Partial<ValidEntity>) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Container {
      @DiscriminatedEntityProperty()
      item!: ValidEntity;

      constructor(data: Partial<Container>) {
        Object.assign(this, data);
      }
    }

    it('should throw error when deserializing without discriminator', async () => {
      const json = {
        item: {
          value: 'test',
          // Missing __type
        },
      };

      await expect(EntityUtils.parse(Container, json)).rejects.toThrow(
        /Missing or invalid discriminator/,
      );
    });

    it('should throw error with unknown discriminator value', async () => {
      const json = {
        item: {
          __type: 'UnknownEntity',
          value: 'test',
        },
      };

      await expect(EntityUtils.parse(Container, json)).rejects.toThrow(
        /Unknown entity type/,
      );
    });

    it('should throw error when discriminator is not a string', async () => {
      const json = {
        item: {
          __type: 123,
          value: 'test',
        },
      };

      await expect(EntityUtils.parse(Container, json)).rejects.toThrow(
        /Missing or invalid discriminator/,
      );
    });

    it('should throw error when discriminator is empty string', async () => {
      const json = {
        item: {
          __type: '',
          value: 'test',
        },
      };

      await expect(EntityUtils.parse(Container, json)).rejects.toThrow(
        /Missing or invalid discriminator/,
      );
    });

    it('should throw error when deserializing null for discriminated property', async () => {
      const json = {
        item: null,
      };

      // null for required property is caught by validation layer
      await expect(EntityUtils.parse(Container, json)).rejects.toThrow(
        /Required property is missing, null or undefined/,
      );
    });

    it('should throw error when deserializing array for discriminated property', async () => {
      const json = {
        item: ['not', 'an', 'object'],
      };

      await expect(EntityUtils.parse(Container, json)).rejects.toThrow(
        /Discriminated entity must be an object/,
      );
    });
  });

  describe('Array of discriminated entities', () => {
    @Entity({ name: 'Apple' })
    class Apple {
      @StringProperty()
      color!: string;

      constructor(data: Partial<Apple>) {
        Object.assign(this, data);
      }
    }

    @Entity({ name: 'Orange' })
    class Orange {
      @NumberProperty()
      segments!: number;

      constructor(data: Partial<Orange>) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class FruitBasket {
      @DiscriminatedEntityProperty({ array: true })
      fruits!: (Apple | Orange)[];

      constructor(data: Partial<FruitBasket>) {
        Object.assign(this, data);
      }
    }

    it('should serialize array of discriminated entities', () => {
      const basket = new FruitBasket({
        fruits: [
          new Apple({ color: 'red' }),
          new Orange({ segments: 10 }),
          new Apple({ color: 'green' }),
        ],
      });

      const json = EntityUtils.toJSON(basket);

      expect(json).toEqual({
        fruits: [
          { color: 'red', __type: 'Apple' },
          { segments: 10, __type: 'Orange' },
          { color: 'green', __type: 'Apple' },
        ],
      });
    });

    it('should deserialize array of discriminated entities', async () => {
      const json = {
        fruits: [
          { __type: 'Apple', color: 'red' },
          { __type: 'Orange', segments: 10 },
          { __type: 'Apple', color: 'green' },
        ],
      };

      const basket = await EntityUtils.parse(FruitBasket, json);

      expect(basket.fruits).toHaveLength(3);
      expect(basket.fruits[0]).toBeInstanceOf(Apple);
      expect((basket.fruits[0] as Apple).color).toBe('red');
      expect(basket.fruits[1]).toBeInstanceOf(Orange);
      expect((basket.fruits[1] as Orange).segments).toBe(10);
      expect(basket.fruits[2]).toBeInstanceOf(Apple);
      expect((basket.fruits[2] as Apple).color).toBe('green');
    });

    it('should round-trip array of discriminated entities', async () => {
      const original = new FruitBasket({
        fruits: [new Apple({ color: 'yellow' }), new Orange({ segments: 12 })],
      });

      const json = EntityUtils.toJSON(original);
      const parsed = await EntityUtils.parse(FruitBasket, json);

      expect(parsed.fruits).toHaveLength(2);
      expect(parsed.fruits[0]).toBeInstanceOf(Apple);
      expect(parsed.fruits[1]).toBeInstanceOf(Orange);
    });
  });

  describe('Optional discriminated entity', () => {
    @Entity({ name: 'OptionalEntity' })
    class OptionalEntity {
      @StringProperty()
      value!: string;

      constructor(data: Partial<OptionalEntity>) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class OptionalContainer {
      @DiscriminatedEntityProperty({ optional: true })
      item?: OptionalEntity;

      constructor(data: Partial<OptionalContainer>) {
        Object.assign(this, data);
      }
    }

    it('should handle undefined optional discriminated entity', async () => {
      const json = {};

      const container = await EntityUtils.parse(OptionalContainer, json);

      expect(container.item).toBeUndefined();
    });

    it('should serialize undefined optional discriminated entity', () => {
      const container = new OptionalContainer({});

      const json = EntityUtils.toJSON(container);

      expect(json).toEqual({});
    });

    it('should handle null optional discriminated entity', async () => {
      const json = { item: null };

      const container = await EntityUtils.parse(OptionalContainer, json);

      expect(container.item).toBeNull();
    });

    it('should deserialize present optional discriminated entity', async () => {
      const json = {
        item: {
          __type: 'OptionalEntity',
          value: 'test',
        },
      };

      const container = await EntityUtils.parse(OptionalContainer, json);

      expect(container.item).toBeInstanceOf(OptionalEntity);
      expect(container.item!.value).toBe('test');
    });
  });

  describe('Nested discriminated entities', () => {
    @Entity({ name: 'Leaf' })
    class Leaf {
      @StringProperty()
      color!: string;

      constructor(data: Partial<Leaf>) {
        Object.assign(this, data);
      }
    }

    @Entity({ name: 'Branch' })
    class Branch {
      @DiscriminatedEntityProperty()
      child!: Leaf | Branch;

      constructor(data: Partial<Branch>) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Tree {
      @DiscriminatedEntityProperty()
      root!: Leaf | Branch;

      constructor(data: Partial<Tree>) {
        Object.assign(this, data);
      }
    }

    it('should serialize nested discriminated entities', () => {
      const tree = new Tree({
        root: new Branch({
          child: new Leaf({ color: 'green' }),
        }),
      });

      const json = EntityUtils.toJSON(tree);

      expect(json).toEqual({
        root: {
          __type: 'Branch',
          child: {
            __type: 'Leaf',
            color: 'green',
          },
        },
      });
    });

    it('should deserialize nested discriminated entities', async () => {
      const json = {
        root: {
          __type: 'Branch',
          child: {
            __type: 'Leaf',
            color: 'green',
          },
        },
      };

      const tree = await EntityUtils.parse(Tree, json);

      expect(tree.root).toBeInstanceOf(Branch);
      expect((tree.root as Branch).child).toBeInstanceOf(Leaf);
      expect(((tree.root as Branch).child as Leaf).color).toBe('green');
    });

    it('should handle deeply nested discriminated entities', async () => {
      const json = {
        root: {
          __type: 'Branch',
          child: {
            __type: 'Branch',
            child: {
              __type: 'Leaf',
              color: 'red',
            },
          },
        },
      };

      const tree = await EntityUtils.parse(Tree, json);

      expect(tree.root).toBeInstanceOf(Branch);
      const firstBranch = tree.root as Branch;
      expect(firstBranch.child).toBeInstanceOf(Branch);
      const secondBranch = firstBranch.child as Branch;
      expect(secondBranch.child).toBeInstanceOf(Leaf);
      expect((secondBranch.child as Leaf).color).toBe('red');
    });
  });
});
