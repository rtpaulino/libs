import { Nullable, sha1, StrictDataWrapper } from '@rtpaulino/core';
import { ok } from 'assert';

export class Blob {
  readonly hash: string;
  readonly content: Buffer;

  constructor(data: { content: Buffer; hash?: string }) {
    this.content = data.content;
    this.hash = data.hash ?? sha1(data.content);
  }
}

export enum TreeNodeType {
  Internal = 'internal',
  Leaf = 'leaf',
}

export abstract class TreeNode {
  readonly name: string;

  protected _hash: string | undefined;

  abstract readonly type: TreeNodeType;

  protected constructor(name: string) {
    this.name = name;
  }

  get hash() {
    ok(this._hash, 'Hash is not set');
    return this._hash;
  }

  abstract toJSON(): Record<string, unknown>;

  static fromJSON(obj: unknown) {
    const data = new StrictDataWrapper(obj);
    const type = data.get('type').asString();
    if (type === TreeNodeType.Internal) {
      const name = data.get('name').asString();
      const childrenRefs = data.get('childrenRefs').asStringArray();
      ok(name, 'Name is required for InternalNode');

      return new InternalNode({
        name,
        childrenRefs,
      });
    } else if (type === TreeNodeType.Leaf) {
      const name = data.get('name').asString();
      const blobRef = data.get('blobRef').asString();
      ok(name, 'Name is required for LeafNode');
      ok(blobRef, 'blobRef is required for LeafNode');

      return new LeafNode({
        name,
        blobRef,
      });
    } else {
      throw new Error(`Unknown TreeNode type: ${type}`);
    }
  }

  isLeaf(): this is LeafNode {
    return this.type === TreeNodeType.Leaf;
  }

  isInternal(): this is InternalNode {
    return this.type === TreeNodeType.Internal;
  }
}

export class LeafNode extends TreeNode {
  readonly type = TreeNodeType.Leaf;

  readonly blobRef: string;

  constructor(data: { name: string; blobRef: string; hash?: string }) {
    super(data.name);
    this.blobRef = data.blobRef;
    this._hash =
      data.hash ??
      sha1(Buffer.from(`${this.type}:${data.name}:${data.blobRef}`));
  }

  toJSON() {
    return {
      type: this.type,
      name: this.name,
      blobRef: this.blobRef,
    };
  }
}

export class InternalNode extends TreeNode {
  readonly type = TreeNodeType.Internal;

  readonly childrenRefs: string[];

  constructor(data: { name: string; childrenRefs: string[]; hash?: string }) {
    super(data.name);
    this.childrenRefs = data.childrenRefs.slice().sort();
    this._hash =
      data.hash ??
      sha1(
        Buffer.from(`${this.type}:${this.name}:${this.childrenRefs.join(',')}`),
      );
  }

  toJSON() {
    return {
      type: this.type,
      name: this.name,
      childrenRefs: this.childrenRefs,
    };
  }
}

export class Commit {
  readonly message: string;
  readonly treeRef: Nullable<string>;
  readonly previousCommitRef?: Nullable<string>;
  readonly hash: string;

  constructor(data: {
    message: string;
    treeRef: Nullable<string>;
    previousCommitRef?: Nullable<string>;
    hash?: string;
  }) {
    this.message = data.message;
    this.treeRef = data.treeRef;
    this.previousCommitRef = data.previousCommitRef;
    this.hash =
      data.hash ??
      sha1(
        Buffer.from(
          `${this.message}:${this.treeRef ?? ''}:${this.previousCommitRef ?? ''}`,
        ),
      );
  }

  toJSON() {
    return {
      message: this.message,
      treeRef: this.treeRef,
      previousCommitRef: this.previousCommitRef,
      hash: this.hash,
    };
  }

  static fromJSON(obj: unknown): Commit {
    const data = new StrictDataWrapper(obj);
    const message = data.get('message').asString();
    const treeRef = data.get('treeRef').asString();
    const previousCommitRef = data.get('previousCommitRef').asString();

    ok(message, 'Commit message is required');

    return new Commit({
      message,
      treeRef,
      previousCommitRef: previousCommitRef ?? undefined,
    });
  }
}

export class Ref {
  readonly name: string;
  readonly commitRef: string;

  constructor(data: { name: string; commitRef: string }) {
    this.name = data.name;
    this.commitRef = data.commitRef;
  }
}

export class StagingItem {
  readonly path: string[];
  readonly blob?: Blob;

  constructor(data: { path: string[]; blob?: Blob }) {
    this.path = data.path;
    this.blob = data.blob;
  }
}

export enum StagingChangeType {
  Add = 'add',
  Update = 'update',
  Remove = 'remove',
  Unchanged = 'unchanged',
}

export class StagingChange {
  readonly stagingItem: StagingItem;
  readonly existingNode: Nullable<TreeNode>;

  constructor(data: {
    stagingItem: StagingItem;
    existingNode: Nullable<TreeNode>;
  }) {
    this.stagingItem = data.stagingItem;
    this.existingNode = data.existingNode;
  }

  get type(): StagingChangeType {
    if (this.existingNode && this.stagingItem.blob) {
      return this.existingNode.isLeaf() &&
        this.existingNode.blobRef !== this.stagingItem.blob.hash
        ? StagingChangeType.Update
        : StagingChangeType.Unchanged;
    } else if (!this.existingNode && this.stagingItem.blob) {
      return StagingChangeType.Add;
    } else if (this.existingNode && !this.stagingItem.blob) {
      return StagingChangeType.Remove;
    } else {
      return StagingChangeType.Unchanged;
    }
  }
}
