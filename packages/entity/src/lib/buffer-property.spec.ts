import { describe, it, expect } from 'vitest';
import { Entity, BufferProperty } from '../index.js';
import { EntityUtils } from './entity-utils.js';
import { EntitySchema, EntityProps } from './entity-definition.js';

@Entity({ name: 'BufferPropertyDocument' })
class BufferPropertyDocument {
  @BufferProperty()
  content!: Buffer;

  @BufferProperty({ optional: true })
  thumbnail?: Buffer;

  @BufferProperty({ array: true, optional: true })
  chunks?: Buffer[];

  constructor(data: Partial<BufferPropertyDocument>) {
    Object.assign(this, data);
  }
}

function toJSON(doc: BufferPropertyDocument): Record<string, unknown> {
  return EntityUtils.toJSON(doc) as Record<string, unknown>;
}

describe('BufferProperty', () => {
  describe('serialization', () => {
    it('should serialize a Buffer to a base64 string', () => {
      const doc = new BufferPropertyDocument({
        content: Buffer.from('hello world'),
      });
      expect(toJSON(doc)).toEqual({
        content: 'aGVsbG8gd29ybGQ=',
        thumbnail: undefined,
        chunks: undefined,
      });
    });

    it('should serialize binary data that is not valid UTF-8', () => {
      const bytes = Buffer.from([0x00, 0xff, 0xfe, 0x80]);
      const doc = new BufferPropertyDocument({ content: bytes });
      expect(toJSON(doc).content).toBe(bytes.toString('base64'));
    });

    it('should serialize an empty Buffer to an empty string', () => {
      const doc = new BufferPropertyDocument({ content: Buffer.alloc(0) });
      expect(toJSON(doc).content).toBe('');
    });

    it('should serialize arrays of Buffers', () => {
      const doc = new BufferPropertyDocument({
        content: Buffer.from('a'),
        chunks: [Buffer.from('b'), Buffer.from('c')],
      });
      expect(toJSON(doc).chunks).toEqual(['Yg==', 'Yw==']);
    });

    it('should produce JSON.stringify-safe output', () => {
      const doc = new BufferPropertyDocument({ content: Buffer.from('hi') });
      expect(JSON.parse(JSON.stringify(toJSON(doc))).content).toBe('aGk=');
    });
  });

  describe('deserialization', () => {
    it('should parse a base64 string into a Buffer', async () => {
      const doc = await EntityUtils.parse(BufferPropertyDocument, {
        content: 'aGVsbG8gd29ybGQ=',
      });
      expect(Buffer.isBuffer(doc.content)).toBe(true);
      expect(doc.content.toString('utf8')).toBe('hello world');
      expect(EntityUtils.getProblems(doc)).toHaveLength(0);
    });

    it('should accept base64 without padding', async () => {
      const doc = await EntityUtils.parse(BufferPropertyDocument, {
        content: 'aGk',
      });
      expect(doc.content.toString('utf8')).toBe('hi');
    });

    it('should accept an empty string', async () => {
      const doc = await EntityUtils.parse(BufferPropertyDocument, {
        content: '',
      });
      expect(doc.content.length).toBe(0);
    });

    it('should accept a Buffer instance as-is', async () => {
      const buffer = Buffer.from('raw');
      const doc = await EntityUtils.parse(BufferPropertyDocument, {
        content: buffer,
      });
      expect(doc.content).toBe(buffer);
    });

    it('should convert a Uint8Array into a Buffer copy', async () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const doc = await EntityUtils.parse(BufferPropertyDocument, {
        content: bytes,
      });
      expect(Buffer.isBuffer(doc.content)).toBe(true);
      expect([...doc.content]).toEqual([1, 2, 3]);
      bytes[0] = 99;
      expect(doc.content[0]).toBe(1);
    });

    it('should parse optional and array properties', async () => {
      const doc = await EntityUtils.parse(BufferPropertyDocument, {
        content: 'YQ==',
        thumbnail: 'Yg==',
        chunks: ['Yw==', 'ZA=='],
      });
      expect(doc.thumbnail?.toString()).toBe('b');
      expect(doc.chunks?.map((c) => c.toString())).toEqual(['c', 'd']);
    });

    it('should leave optional property undefined when omitted', async () => {
      const doc = await EntityUtils.parse(BufferPropertyDocument, {
        content: 'YQ==',
      });
      expect(doc.thumbnail).toBeUndefined();
    });

    it.each(['not base64!', 'aGk=aGk=', 'a', 'aGk==', 'aGk-_'])(
      'should reject invalid base64 string %j',
      async (content) => {
        await expect(
          EntityUtils.parse(BufferPropertyDocument, { content }),
        ).rejects.toThrow('Cannot parse value as a base64 string');
      },
    );

    it.each([42, true, {}, [1, 2, 3]])(
      'should reject non-buffer value %j',
      async (content) => {
        await expect(
          EntityUtils.parse(BufferPropertyDocument, { content }),
        ).rejects.toThrow('Expects a Buffer or base64 string');
      },
    );

    it('should report invalid array item with its index', async () => {
      await expect(
        EntityUtils.parse(BufferPropertyDocument, {
          content: 'YQ==',
          chunks: ['Yg==', '***'],
        }),
      ).rejects.toThrow('chunks');
    });
  });

  describe('round trip', () => {
    it('should round-trip arbitrary binary data', async () => {
      const bytes = Buffer.from(
        Array.from({ length: 256 }, (_, index) => index),
      );
      const original = new BufferPropertyDocument({ content: bytes });
      const parsed = await EntityUtils.parse(
        BufferPropertyDocument,
        JSON.parse(JSON.stringify(EntityUtils.toJSON(original))),
      );
      expect(parsed.content.equals(bytes)).toBe(true);
    });
  });

  describe('equality', () => {
    it('should compare Buffers by content', () => {
      const a = new BufferPropertyDocument({ content: Buffer.from('same') });
      const b = new BufferPropertyDocument({ content: Buffer.from('same') });
      const c = new BufferPropertyDocument({ content: Buffer.from('diff') });
      expect(EntityUtils.equals(a, b)).toBe(true);
      expect(EntityUtils.equals(a, c)).toBe(false);
      expect(EntityUtils.diff(a, c).map((d) => d.property)).toEqual([
        'content',
      ]);
    });
  });

  describe('EntityProps.Buffer', () => {
    it('should work with EntitySchema.define', async () => {
      const FileSchema = EntitySchema.define({
        name: 'BufferPropertyFile',
        properties: {
          data: EntityProps.Buffer(),
          preview: EntityProps.Buffer({ optional: true }),
        },
      });

      const file = (await EntityUtils.parse(FileSchema.entityClass as any, {
        data: 'aGk=',
      })) as any;
      expect(file.data.toString()).toBe('hi');
      expect((EntityUtils.toJSON(file) as any).data).toBe('aGk=');
    });
  });
});
