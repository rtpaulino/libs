import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Entity, Stringifiable } from './entity.js';
import { EntityUtils } from './entity-utils.js';
import {
  StringProperty,
  EntityProperty,
  ArrayProperty,
  NumberProperty,
} from './property.js';

describe('Stringifiable', () => {
  describe('Basic functionality', () => {
    @Stringifiable()
    class UserId {
      @StringProperty()
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    it('should parse from string', async () => {
      const userId = await EntityUtils.parse(UserId, 'user-123');
      expect(userId).toBeInstanceOf(UserId);
      expect(userId.value).toBe('user-123');
    });

    it('should serialize to string', () => {
      const userId = new UserId({ value: 'user-456' });
      const json = EntityUtils.toJSON(userId);
      expect(json).toBe('user-456');
    });

    it('should round-trip correctly', async () => {
      const original = new UserId({ value: 'user-789' });
      const json = EntityUtils.toJSON(original);
      const parsed = await EntityUtils.parse(UserId, json);
      expect(parsed.value).toBe(original.value);
    });

    it('should detect stringifiable entity', () => {
      const userId = new UserId({ value: 'test' });
      expect(EntityUtils.isStringifiable(userId)).toBe(true);
      expect(EntityUtils.isStringifiable(UserId)).toBe(true);
    });

    it('should not detect non-stringifiable as stringifiable', () => {
      @Entity()
      class User {
        @StringProperty()
        name!: string;
      }

      expect(EntityUtils.isStringifiable(new User())).toBe(false);
      expect(EntityUtils.isStringifiable(User)).toBe(false);
    });
  });

  describe('Nested in other entities', () => {
    @Stringifiable()
    class UserId {
      @StringProperty()
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class User {
      @EntityProperty(() => UserId)
      id!: UserId;

      @StringProperty()
      name!: string;

      constructor(data: Partial<User> = {}) {
        Object.assign(this, data);
      }
    }

    it('should parse stringifiable property from string', async () => {
      const user = await EntityUtils.parse(User, {
        id: 'user-123',
        name: 'John',
      });
      expect(user.id).toBeInstanceOf(UserId);
      expect(user.id.value).toBe('user-123');
      expect(user.name).toBe('John');
    });

    it('should serialize stringifiable property to string', () => {
      const user = new User();
      user.id = new UserId({ value: 'user-456' });
      user.name = 'Jane';

      const json = EntityUtils.toJSON(user);
      expect(json).toEqual({
        id: 'user-456',
        name: 'Jane',
      });
    });

    it('should round-trip nested stringifiable correctly', async () => {
      const original = {
        id: 'user-789',
        name: 'Bob',
      };
      const parsed = await EntityUtils.parse(User, original);
      const json = EntityUtils.toJSON(parsed);
      expect(json).toEqual(original);
    });
  });

  describe('Arrays of stringifiable entities', () => {
    @Stringifiable()
    class Tag {
      @StringProperty()
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Article {
      @ArrayProperty(() => Tag)
      tags!: Tag[];

      @StringProperty()
      title!: string;

      constructor(data: Partial<Article> = {}) {
        Object.assign(this, data);
      }
    }

    it('should parse array of stringifiable from array of strings', async () => {
      const article = await EntityUtils.parse(Article, {
        tags: ['tech', 'programming', 'typescript'],
        title: 'My Article',
      });
      expect(article.tags).toHaveLength(3);
      expect(article.tags[0]).toBeInstanceOf(Tag);
      expect(article.tags[0].value).toBe('tech');
      expect(article.tags[1].value).toBe('programming');
      expect(article.tags[2].value).toBe('typescript');
    });

    it('should serialize array of stringifiable to array of strings', () => {
      const article = new Article();
      article.tags = [new Tag({ value: 'tag1' }), new Tag({ value: 'tag2' })];
      article.title = 'Test Article';

      const json = EntityUtils.toJSON(article);
      expect(json).toEqual({
        tags: ['tag1', 'tag2'],
        title: 'Test Article',
      });
    });

    it('should round-trip array of stringifiable correctly', async () => {
      const original = {
        tags: ['a', 'b', 'c'],
        title: 'Test',
      };
      const parsed = await EntityUtils.parse(Article, original);
      const json = EntityUtils.toJSON(parsed);
      expect(json).toEqual(original);
    });
  });

  describe('Optional stringifiable entities', () => {
    @Stringifiable()
    class OptionalId {
      @StringProperty()
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Document {
      @EntityProperty(() => OptionalId, { optional: true })
      externalId?: OptionalId;

      @StringProperty()
      title!: string;

      constructor(data: Partial<Document> = {}) {
        Object.assign(this, data);
      }
    }

    it('should parse optional stringifiable when present', async () => {
      const doc = await EntityUtils.parse(Document, {
        externalId: 'ext-123',
        title: 'Document',
      });
      expect(doc.externalId).toBeInstanceOf(OptionalId);
      expect(doc.externalId!.value).toBe('ext-123');
    });

    it('should parse optional stringifiable when missing', async () => {
      const doc = await EntityUtils.parse(Document, {
        title: 'Document',
      });
      expect(doc.externalId).toBeUndefined();
    });

    it('should serialize optional stringifiable when present', () => {
      const doc = new Document();
      doc.externalId = new OptionalId({ value: 'ext-456' });
      doc.title = 'Test';

      const json = EntityUtils.toJSON(doc);
      expect(json).toEqual({
        externalId: 'ext-456',
        title: 'Test',
      });
    });

    it('should serialize optional stringifiable when missing', () => {
      const doc = new Document();
      doc.title = 'Test';

      const json = EntityUtils.toJSON(doc);
      expect(json).toEqual({
        title: 'Test',
      });
    });
  });

  describe('Deeply nested stringifiable entities', () => {
    @Stringifiable()
    class Id {
      @StringProperty()
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Author {
      @EntityProperty(() => Id)
      id!: Id;

      @StringProperty()
      name!: string;

      constructor(data: Partial<Author> = {}) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class Post {
      @EntityProperty(() => Id)
      id!: Id;

      @EntityProperty(() => Author)
      author!: Author;

      @StringProperty()
      content!: string;

      constructor(data: Partial<Post> = {}) {
        Object.assign(this, data);
      }
    }

    it('should parse deeply nested stringifiable entities', async () => {
      const post = await EntityUtils.parse(Post, {
        id: 'post-123',
        author: {
          id: 'author-456',
          name: 'John Doe',
        },
        content: 'Hello world',
      });

      expect(post.id).toBeInstanceOf(Id);
      expect(post.id.value).toBe('post-123');
      expect(post.author).toBeInstanceOf(Author);
      expect(post.author.id).toBeInstanceOf(Id);
      expect(post.author.id.value).toBe('author-456');
      expect(post.author.name).toBe('John Doe');
      expect(post.content).toBe('Hello world');
    });

    it('should serialize deeply nested stringifiable entities', () => {
      const post = new Post();
      post.id = new Id({ value: 'post-789' });
      post.author = new Author();
      post.author.id = new Id({ value: 'author-111' });
      post.author.name = 'Jane Smith';
      post.content = 'Test content';

      const json = EntityUtils.toJSON(post);
      expect(json).toEqual({
        id: 'post-789',
        author: {
          id: 'author-111',
          name: 'Jane Smith',
        },
        content: 'Test content',
      });
    });
  });

  describe('Error handling', () => {
    @Stringifiable()
    class BadEntity1 {
      // Missing metadata on value property
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    @Stringifiable()
    class BadEntity2 {
      @ArrayProperty(() => String)
      readonly value!: string[]; // Array instead of single value

      constructor(data: { value: string[] }) {
        Object.assign(this, data);
      }
    }

    @Stringifiable()
    class BadEntity3 {
      @NumberProperty()
      readonly value!: number; // Wrong type - should be string

      constructor(data: { value: number }) {
        Object.assign(this, data);
      }
    }

    it('should throw error if value property has no metadata', () => {
      const entity = new BadEntity1({ value: 'test' });
      expect(() => EntityUtils.toJSON(entity)).toThrow(
        `Stringifiable entity 'value' property is missing metadata`,
      );
    });

    it('should throw error if value property is an array', () => {
      const entity = new BadEntity2({ value: ['test'] });
      expect(() => EntityUtils.toJSON(entity)).toThrow(
        `Stringifiable entity 'value' property must not be an array`,
      );
    });

    it('should throw error if value property is not of type String', () => {
      const entity = new BadEntity3({ value: 123 });
      expect(() => EntityUtils.toJSON(entity)).toThrow(
        `Stringifiable entity 'value' property must be of type String`,
      );
    });
  });

  describe('SafeParse', () => {
    @Stringifiable()
    class StrictId {
      @StringProperty()
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    it('should successfully safe parse valid string', async () => {
      const result = await EntityUtils.safeParse(StrictId, 'valid-id');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(StrictId);
        expect(result.data.value).toBe('valid-id');
      }
    });

    it('should handle safe parse errors', async () => {
      const result = await EntityUtils.safeParse(StrictId, null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.problems).toBeDefined();
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Update functionality', () => {
    @Stringifiable()
    class MutableId {
      @StringProperty()
      value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class MutableUser {
      @EntityProperty(() => MutableId)
      id!: MutableId;

      @StringProperty()
      name!: string;

      constructor(data: Partial<MutableUser> = {}) {
        Object.assign(this, data);
      }
    }

    it('should update stringifiable property', async () => {
      const user = new MutableUser();
      user.id = new MutableId({ value: 'old-id' });
      user.name = 'John';

      await EntityUtils.update(user, {
        id: new MutableId({ value: 'new-id' }),
      });

      expect(user.id.value).toBe('old-id'); // original unchanged
    });

    it('should update multiple properties including stringifiable', async () => {
      const user = new MutableUser();
      user.id = new MutableId({ value: 'id-1' });
      user.name = 'Alice';

      const updated = await EntityUtils.update(user, {
        id: new MutableId({ value: 'id-2' }),
        name: 'Bob',
      });

      expect(updated.id.value).toBe('id-2');
      expect(updated.name).toBe('Bob');
      expect(user.id.value).toBe('id-1'); // original unchanged
    });
  });

  describe('PartialParse functionality', () => {
    @Stringifiable()
    class PartialId {
      @StringProperty()
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class PartialUser {
      @EntityProperty(() => PartialId)
      id!: PartialId;

      @StringProperty()
      name!: string;

      constructor(data: Partial<PartialUser> = {}) {
        Object.assign(this, data);
      }
    }

    it('should partial parse with stringifiable property', async () => {
      const result = await EntityUtils.partialParse(PartialUser, {
        id: 'user-123',
      });

      expect(result.id).toBeInstanceOf(PartialId);
      expect(result.id!.value).toBe('user-123');
      expect(result.name).toBeUndefined();
    });

    it('should partial parse without stringifiable property', async () => {
      const result = await EntityUtils.partialParse(PartialUser, {
        name: 'John',
      });

      expect(result.id).toBeUndefined();
      expect(result.name).toBe('John');
    });
  });
});
