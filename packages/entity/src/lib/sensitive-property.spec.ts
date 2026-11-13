import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Entity } from './entity.js';
import { EntityUtils } from './entity-utils.js';
import { ValidationError } from './validation-error.js';
import { REDACTED_MESSAGE } from './validation-utils.js';
import {
  StringProperty,
  IntProperty,
  DateProperty,
  ArrayProperty,
  EntityProperty,
  StringifiableProperty,
  SerializableProperty,
  Property,
} from './property.js';
import { ZodProperty } from './zod-property.js';
import { z } from 'zod';

const SECRET = 'S3cr3t-hash-value';

class PasswordHash {
  constructor(readonly value: string) {}

  static parse(value: string): PasswordHash {
    if (!value.startsWith('$2b$')) {
      throw new Error(`Invalid hash: ${value}`);
    }
    return new PasswordHash(value);
  }

  toString(): string {
    return this.value;
  }
}

class SerializableSecret {
  constructor(readonly value: string) {}

  static parse(value: unknown): SerializableSecret {
    throw new Error(`Cannot parse ${String(value)}`);
  }

  toJSON(): string {
    return this.value;
  }
}

const noSecret = () => (value: { value: unknown }) =>
  String(value.value).includes('ok')
    ? []
    : [{ property: '', message: `bad ${String(value.value)}` }];

@Entity({ name: 'SensitiveStringifiableUser' })
class SensitiveStringifiableUser {
  @StringifiableProperty(() => PasswordHash, { sensitive: true })
  hash!: PasswordHash;
}

@Entity({ name: 'PlainStringifiableUser' })
class PlainStringifiableUser {
  @StringifiableProperty(() => PasswordHash)
  hash!: PasswordHash;
}

@Entity({ name: 'SensitiveSerializableUser' })
class SensitiveSerializableUser {
  @SerializableProperty(() => SerializableSecret, { sensitive: true })
  secret!: SerializableSecret;
}

@Entity({ name: 'SensitivePrimitivesUser' })
class SensitivePrimitivesUser {
  @IntProperty({ sensitive: true, parseBigInt: true })
  pin!: number;

  @DateProperty({ sensitive: true })
  birth!: Date;

}

@Entity({ name: 'SensitiveCustomValidatorUser' })
class SensitiveCustomValidatorUser {
  @Property({
    type: () => String,
    sensitive: true,
    validators: [noSecret()],
  })
  token!: string;

  @Property({ type: () => String, validators: [noSecret()] })
  plain!: string;

  constructor(data?: { token: string; plain: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'SensitiveArrayUser' })
class SensitiveArrayUser {
  @ArrayProperty(() => String, {
    sensitive: true,
    arrayValidators: [() => [{ property: '', message: 'array bad' }]],
  })
  tokens!: string[];
}

@Entity({ name: 'SensitiveArrayElementUser' })
class SensitiveArrayElementUser {
  @ArrayProperty(() => String, {
    sensitive: true,
    validators: [noSecret()],
  })
  tokens!: string[];
}

@Entity({ name: 'SensitiveZodUser' })
class SensitiveZodUser {
  @ZodProperty(
    z.string().refine((v) => v.length > 100, { message: `must be long` }),
    { sensitive: true },
  )
  secret!: string;
}

@Entity({ name: 'SensitiveInner' })
class SensitiveInner {
  @StringProperty({ minLength: 100 })
  name!: string;

  constructor(data: { name: string }) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'SensitiveOuter' })
class SensitiveOuter {
  @EntityProperty(() => SensitiveInner, { sensitive: true })
  inner!: SensitiveInner;

  constructor(data: { inner: SensitiveInner }) {
    Object.assign(this, data);
  }
}

async function parseError(
  cls: new (data: any) => object,
  data: Record<string, unknown>,
  options?: { strict?: boolean },
): Promise<ValidationError> {
  try {
    await EntityUtils.parse(cls, data, options);
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    return error as ValidationError;
  }
  throw new Error('expected parse to fail');
}

describe('sensitive properties', () => {
  it('leaks the value when not sensitive (baseline)', async () => {
    const error = await parseError(PlainStringifiableUser, { hash: SECRET });
    expect(error.message).toContain(SECRET);
  });

  it('redacts errors thrown by a Stringifiable parse()', async () => {
    const error = await parseError(SensitiveStringifiableUser, {
      hash: SECRET,
    });
    expect(error.message).not.toContain(SECRET);
    expect(error.problems).toHaveLength(1);
    expect(error.problems[0].property).toBe('hash');
    expect(error.problems[0].message).toBe(REDACTED_MESSAGE);
  });

  it('redacts non-string input to a Stringifiable property', async () => {
    const error = await parseError(SensitiveStringifiableUser, {
      hash: { leaked: SECRET },
    });
    expect(error.message).not.toContain(SECRET);
  });

  it('redacts errors thrown by Serializable parse()', async () => {
    const error = await parseError(SensitiveSerializableUser, {
      secret: SECRET,
    });
    expect(error.message).not.toContain(SECRET);
    expect(error.problems[0].message).toBe(REDACTED_MESSAGE);
  });

  it('redacts primitive deserializer errors', async () => {
    const error = await parseError(SensitivePrimitivesUser, {
      pin: '12x-3999',
      birth: `not-a-date-${SECRET}`,
    });
    expect(error.message).not.toContain('12x-3999');
    expect(error.message).not.toContain(SECRET);
    expect(error.problems.map((p) => p.property).sort()).toEqual([
      'birth',
      'pin',
    ]);
    expect(error.problems.every((p) => p.message === REDACTED_MESSAGE)).toBe(
      true,
    );
  });

  it('redacts validator problems from validate()', async () => {
    const user = new SensitiveCustomValidatorUser();
    user.token = SECRET;
    user.plain = SECRET;
    const problems = await EntityUtils.validate(user);
    const token = problems.find((p) => p.property === 'token');
    const plain = problems.find((p) => p.property === 'plain');
    expect(token?.message).toBe(REDACTED_MESSAGE);
    expect(plain?.message).toContain(SECRET);
  });

  it('redacts array validators and element validators', async () => {
    const a = new SensitiveArrayUser();
    a.tokens = [SECRET];
    const arrayProblems = await EntityUtils.validate(a);
    expect(arrayProblems.map((p) => p.message)).toEqual([REDACTED_MESSAGE]);

    const b = new SensitiveArrayElementUser();
    b.tokens = [SECRET, SECRET];
    const elementProblems = await EntityUtils.validate(b);
    expect(elementProblems.map((p) => p.property)).toEqual([
      'tokens[0]',
      'tokens[1]',
    ]);
    expect(elementProblems.every((p) => p.message === REDACTED_MESSAGE)).toBe(
      true,
    );
  });

  it('redacts validator problems raised during update()', async () => {
    const user = new SensitiveCustomValidatorUser({
      token: 'ok',
      plain: 'ok',
    });
    const result = await EntityUtils.safeUpdate(
      user,
      { token: SECRET },
      { strict: true },
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.problems)).not.toContain(SECRET);
  });

  it('redacts Zod issue messages', async () => {
    const error = await parseError(SensitiveZodUser, { secret: SECRET });
    expect(error.problems[0].message).toBe(REDACTED_MESSAGE);
  });

  it('redacts problems of a sensitive nested entity, keeping the path', async () => {
    const error = await parseError(
      SensitiveOuter,
      { inner: { name: SECRET } },
      { strict: true },
    );
    expect(error.message).not.toContain(SECRET);
    expect(error.problems[0].property).toBe('inner.name');
    expect(error.problems[0].message).toBe(REDACTED_MESSAGE);
  });
});
