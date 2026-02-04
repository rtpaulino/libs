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

// ============================================================================
// Entity Definitions
// ============================================================================

@Stringifiable({ name: 'StringifiableUserId1' })
class StringifiableUserId1 {
  @StringProperty()
  readonly value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'StringifiableNonStringUser' })
class StringifiableNonStringUser {
  @StringProperty()
  name!: string;
}

@Stringifiable({ name: 'StringifiableUserId2' })
class StringifiableUserId2 {
  @StringProperty()
  readonly value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'StringifiableTestUser' })
class StringifiableTestUser {
  @EntityProperty(() => StringifiableUserId2)
  id!: StringifiableUserId2;

  @StringProperty()
  name!: string;

  constructor(data: Partial<StringifiableTestUser> = {}) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiableTag' })
class StringifiableTag {
  @StringProperty()
  readonly value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'StringifiableArticle' })
class StringifiableArticle {
  @ArrayProperty(() => StringifiableTag)
  tags!: StringifiableTag[];

  @StringProperty()
  title!: string;

  constructor(data: Partial<StringifiableArticle> = {}) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiableOptionalId' })
class StringifiableOptionalId {
  @StringProperty()
  readonly value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'StringifiableDocument' })
class StringifiableDocument {
  @EntityProperty(() => StringifiableOptionalId, { optional: true })
  externalId?: StringifiableOptionalId;

  @StringProperty()
  title!: string;

  constructor(data: Partial<StringifiableDocument> = {}) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiableNestedId' })
class StringifiableNestedId {
  @StringProperty()
  readonly value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'StringifiableAuthor' })
class StringifiableAuthor {
  @EntityProperty(() => StringifiableNestedId)
  id!: StringifiableNestedId;

  @StringProperty()
  name!: string;

  constructor(data: Partial<StringifiableAuthor> = {}) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'StringifiablePost' })
class StringifiablePost {
  @EntityProperty(() => StringifiableNestedId)
  id!: StringifiableNestedId;

  @EntityProperty(() => StringifiableAuthor)
  author!: StringifiableAuthor;

  @StringProperty()
  content!: string;

  constructor(data: Partial<StringifiablePost> = {}) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiableBadEntity1' })
class StringifiableBadEntity1 {
  // Missing metadata on value property
  readonly value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiableBadEntity2' })
class StringifiableBadEntity2 {
  @ArrayProperty(() => String)
  readonly value!: string[]; // Array instead of single value

  constructor(data: { value: string[] }) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiableBadEntity3' })
class StringifiableBadEntity3 {
  @NumberProperty()
  readonly value!: number; // Wrong type - should be string

  constructor(data: { value: number }) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiableStrictId' })
class StringifiableStrictId {
  @StringProperty()
  readonly value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiableMutableId' })
class StringifiableMutableId {
  @StringProperty()
  value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'StringifiableMutableUser' })
class StringifiableMutableUser {
  @EntityProperty(() => StringifiableMutableId)
  id!: StringifiableMutableId;

  @StringProperty()
  name!: string;

  constructor(data: Partial<StringifiableMutableUser> = {}) {
    Object.assign(this, data);
  }
}

@Stringifiable({ name: 'StringifiablePartialId' })
class StringifiablePartialId {
  @StringProperty()
  readonly value!: string;

  constructor(data: { value: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'StringifiablePartialUser' })
class StringifiablePartialUser {
  @EntityProperty(() => StringifiablePartialId)
  id!: StringifiablePartialId;

  @StringProperty()
  name!: string;

  constructor(data: Partial<StringifiablePartialUser> = {}) {
    Object.assign(this, data);
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Stringifiable', () => {
  describe('Basic functionality', () => {
    it('should parse from string', async () => {
      const userId = await EntityUtils.parse(StringifiableUserId1, 'user-123');
      expect(userId).toBeInstanceOf(StringifiableUserId1);
      expect(userId.value).toBe('user-123');
    });

    it('should serialize to string', () => {
      const userId = new StringifiableUserId1({ value: 'user-456' });
      const json = EntityUtils.toJSON(userId);
      expect(json).toBe('user-456');
    });

    it('should round-trip correctly', async () => {
      const original = new StringifiableUserId1({ value: 'user-789' });
      const json = EntityUtils.toJSON(original);
      const parsed = await EntityUtils.parse(StringifiableUserId1, json);
      expect(parsed.value).toBe(original.value);
    });

    it('should detect stringifiable entity', () => {
      const userId = new StringifiableUserId1({ value: 'test' });
      expect(EntityUtils.isStringifiable(userId)).toBe(true);
      expect(EntityUtils.isStringifiable(StringifiableUserId1)).toBe(true);
    });

    it('should not detect non-stringifiable as stringifiable', () => {
      expect(
        EntityUtils.isStringifiable(new StringifiableNonStringUser()),
      ).toBe(false);
      expect(EntityUtils.isStringifiable(StringifiableNonStringUser)).toBe(
        false,
      );
    });
  });

  describe('Nested in other entities', () => {
    it('should parse stringifiable property from string', async () => {
      const user = await EntityUtils.parse(StringifiableTestUser, {
        id: 'user-123',
        name: 'John',
      });
      expect(user.id).toBeInstanceOf(StringifiableUserId2);
      expect(user.id.value).toBe('user-123');
      expect(user.name).toBe('John');
    });

    it('should serialize stringifiable property to string', () => {
      const user = new StringifiableTestUser();
      user.id = new StringifiableUserId2({ value: 'user-456' });
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
      const parsed = await EntityUtils.parse(StringifiableTestUser, original);
      const json = EntityUtils.toJSON(parsed);
      expect(json).toEqual(original);
    });
  });

  describe('Arrays of stringifiable entities', () => {
    it('should parse array of stringifiable from array of strings', async () => {
      const article = await EntityUtils.parse(StringifiableArticle, {
        tags: ['tech', 'programming', 'typescript'],
        title: 'My Article',
      });
      expect(article.tags).toHaveLength(3);
      expect(article.tags[0]).toBeInstanceOf(StringifiableTag);
      expect(article.tags[0].value).toBe('tech');
      expect(article.tags[1].value).toBe('programming');
      expect(article.tags[2].value).toBe('typescript');
    });

    it('should serialize array of stringifiable to array of strings', () => {
      const article = new StringifiableArticle();
      article.tags = [
        new StringifiableTag({ value: 'tag1' }),
        new StringifiableTag({ value: 'tag2' }),
      ];
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
      const parsed = await EntityUtils.parse(StringifiableArticle, original);
      const json = EntityUtils.toJSON(parsed);
      expect(json).toEqual(original);
    });
  });

  describe('Optional stringifiable entities', () => {
    it('should parse optional stringifiable when present', async () => {
      const doc = await EntityUtils.parse(StringifiableDocument, {
        externalId: 'ext-123',
        title: 'Document',
      });
      expect(doc.externalId).toBeInstanceOf(StringifiableOptionalId);
      expect(doc.externalId!.value).toBe('ext-123');
    });

    it('should parse optional stringifiable when missing', async () => {
      const doc = await EntityUtils.parse(StringifiableDocument, {
        title: 'Document',
      });
      expect(doc.externalId).toBeUndefined();
    });

    it('should serialize optional stringifiable when present', () => {
      const doc = new StringifiableDocument();
      doc.externalId = new StringifiableOptionalId({ value: 'ext-456' });
      doc.title = 'Test';

      const json = EntityUtils.toJSON(doc);
      expect(json).toEqual({
        externalId: 'ext-456',
        title: 'Test',
      });
    });

    it('should serialize optional stringifiable when missing', () => {
      const doc = new StringifiableDocument();
      doc.title = 'Test';

      const json = EntityUtils.toJSON(doc);
      expect(json).toEqual({
        title: 'Test',
      });
    });
  });

  describe('Deeply nested stringifiable entities', () => {
    it('should parse deeply nested stringifiable entities', async () => {
      const post = await EntityUtils.parse(StringifiablePost, {
        id: 'post-123',
        author: {
          id: 'author-456',
          name: 'John Doe',
        },
        content: 'Hello world',
      });

      expect(post.id).toBeInstanceOf(StringifiableNestedId);
      expect(post.id.value).toBe('post-123');
      expect(post.author).toBeInstanceOf(StringifiableAuthor);
      expect(post.author.id).toBeInstanceOf(StringifiableNestedId);
      expect(post.author.id.value).toBe('author-456');
      expect(post.author.name).toBe('John Doe');
      expect(post.content).toBe('Hello world');
    });

    it('should serialize deeply nested stringifiable entities', () => {
      const post = new StringifiablePost();
      post.id = new StringifiableNestedId({ value: 'post-789' });
      post.author = new StringifiableAuthor();
      post.author.id = new StringifiableNestedId({ value: 'author-111' });
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
    it('should throw error if value property has no metadata', () => {
      const entity = new StringifiableBadEntity1({ value: 'test' });
      expect(() => EntityUtils.toJSON(entity)).toThrow(
        `Stringifiable entity 'value' property is missing metadata`,
      );
    });

    it('should throw error if value property is an array', () => {
      const entity = new StringifiableBadEntity2({ value: ['test'] });
      expect(() => EntityUtils.toJSON(entity)).toThrow(
        `Stringifiable entity 'value' property must not be an array`,
      );
    });

    it('should throw error if value property is not of type String', () => {
      const entity = new StringifiableBadEntity3({ value: 123 });
      expect(() => EntityUtils.toJSON(entity)).toThrow(
        `Stringifiable entity 'value' property must be of type String`,
      );
    });
  });

  describe('SafeParse', () => {
    it('should successfully safe parse valid string', async () => {
      const result = await EntityUtils.safeParse(
        StringifiableStrictId,
        'valid-id',
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(StringifiableStrictId);
        expect(result.data.value).toBe('valid-id');
      }
    });

    it('should handle safe parse errors', async () => {
      const result = await EntityUtils.safeParse(StringifiableStrictId, null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.problems).toBeDefined();
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Update functionality', () => {
    it('should update stringifiable property', async () => {
      const user = new StringifiableMutableUser();
      user.id = new StringifiableMutableId({ value: 'old-id' });
      user.name = 'John';

      await EntityUtils.update(user, {
        id: new StringifiableMutableId({ value: 'new-id' }),
      });

      expect(user.id.value).toBe('old-id'); // original unchanged
    });

    it('should update multiple properties including stringifiable', async () => {
      const user = new StringifiableMutableUser();
      user.id = new StringifiableMutableId({ value: 'id-1' });
      user.name = 'Alice';

      const updated = await EntityUtils.update(user, {
        id: new StringifiableMutableId({ value: 'id-2' }),
        name: 'Bob',
      });

      expect(updated.id.value).toBe('id-2');
      expect(updated.name).toBe('Bob');
      expect(user.id.value).toBe('id-1'); // original unchanged
    });
  });

  describe('PartialParse functionality', () => {
    it('should partial parse with stringifiable property', async () => {
      const result = await EntityUtils.partialParse(StringifiablePartialUser, {
        id: 'user-123',
      });

      expect(result.id).toBeInstanceOf(StringifiablePartialId);
      expect(result.id!.value).toBe('user-123');
      expect(result.name).toBeUndefined();
    });

    it('should partial parse without stringifiable property', async () => {
      const result = await EntityUtils.partialParse(StringifiablePartialUser, {
        name: 'John',
      });

      expect(result.id).toBeUndefined();
      expect(result.name).toBe('John');
    });
  });

  describe('Stringifiable Entity Validation with Pattern', () => {
    @Stringifiable()
    class Email {
      @StringProperty({
        pattern: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
      })
      readonly value!: string;

      constructor(data: { value: string }) {
        Object.assign(this, data);
      }
    }

    @Entity()
    class User {
      @StringProperty()
      name!: string;

      @EntityProperty(() => Email)
      email!: Email;

      constructor(data: Partial<User>) {
        Object.assign(this, data);
      }
    }

    it('should validate pattern on stringifiable entity directly', async () => {
      const email = new Email({ value: 'INVALID' });
      const problems = await EntityUtils.validate(email);

      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('');
      expect(problems[0].message).toContain('pattern');
    });

    it('should pass validation with valid email', async () => {
      const email = new Email({ value: 'test@example.com' });
      const problems = await EntityUtils.validate(email);

      expect(problems).toHaveLength(0);
    });

    it('should strip wrapper property when validating NESTED stringifiable entity', async () => {
      // This demonstrates where stripWrapperPrefix is still needed
      const user = new User({
        name: 'John',
        email: new Email({ value: 'INVALID' }),
      });
      const problems = await EntityUtils.validate(user);

      expect(problems).toHaveLength(1);
      // The problem should be "email", NOT "email.value"
      // because "value" is the internal wrapper property
      expect(problems[0].property).toBe('email');
      expect(problems[0].message).toContain('pattern');
    });

    it('should strip wrapper property when PARSING entity with nested stringifiable', async () => {
      // This demonstrates where prependPropertyPathAndUnwrap is still needed
      const result = await EntityUtils.safeParse(
        User,
        {
          name: 'John',
          email: 'INVALID', // Will be parsed as Email
        },
        { strict: false },
      );

      expect(result.success).toBe(true);
      expect(result.problems).toHaveLength(1);
      // The problem should be "email", NOT "email.value"
      expect(result.problems[0].property).toBe('email');
      expect(result.problems[0].message).toContain('pattern');
    });
  });
});
