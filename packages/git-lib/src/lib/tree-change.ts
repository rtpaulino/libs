import { ok } from 'assert';
import {
  TreeNodeType,
  Blob,
  TreeNode,
  LeafNode,
  InternalNode,
} from './model.js';
import { GitLibTreeStorage } from './storage.js';
import { Nullable } from '@rtpaulino/core';

export class TreeChangeNode {
  readonly storage: GitLibTreeStorage;
  readonly name: string;
  readonly type: TreeNodeType;

  blob?: Blob;
  existing?: TreeNode;
  children?: TreeChangeNode[];

  constructor(data: {
    storage: GitLibTreeStorage;
    existing?: TreeNode;
    name: string;
    type: TreeNodeType;
    blob?: Blob;
    children?: TreeChangeNode[];
  }) {
    this.storage = data.storage;
    this.existing = data.existing;
    this.name = data.name;
    this.type = data.type;
    this.blob = data.blob;
    this.children = data.children;
  }

  async toTreeNode(): Promise<TreeNode> {
    if (this.type === TreeNodeType.Leaf) {
      if (this.blob) {
        return new LeafNode({
          name: this.name,
          blobRef: this.blob.hash,
        });
      } else if (this.existing) {
        ok(this.existing.isLeaf(), 'Existing node must be a leaf');
        return this.existing;
      } else {
        throw new Error('Leaf nodes must have a blob or existing node');
      }
    } else if (this.type === TreeNodeType.Internal) {
      await this.ensureChildrenLoaded();

      const childrenRefs = this.children
        ? await Promise.all(
            this.children.map(async (child) => {
              if (child.existing) {
                return child.existing.hash;
              }

              const treeNode = await child.toTreeNode();
              return treeNode.hash;
            }),
          )
        : [];

      return new InternalNode({
        name: this.name,
        childrenRefs,
      });
    } else {
      throw new Error(`Unknown TreeNode type: ${this.type}`);
    }
  }

  static fromExisting(data: { storage: GitLibTreeStorage; node: TreeNode }) {
    return new TreeChangeNode({
      storage: data.storage,
      existing: data.node,
      name: data.node.name,
      type: data.node.type,
    });
  }

  static createRoot(data: { storage: GitLibTreeStorage }) {
    return new TreeChangeNode({
      storage: data.storage,
      name: 'root',
      type: TreeNodeType.Internal,
      children: [],
    });
  }

  async ensureChildrenLoaded(): Promise<void> {
    ok(
      this.type === TreeNodeType.Internal,
      'Only internal nodes have children',
    );
    if (this.children) {
      return;
    }
    ok(this.existing, 'Existing node is required to load children');
    ok(
      this.existing.isInternal(),
      'Existing node must be internal to load children',
    );

    this.children = await Promise.all(
      this.existing.childrenRefs.map(async (child) => {
        const node = await this.storage.load(child);
        ok(node, `Child node ${child} not found in storage`);
        return TreeChangeNode.fromExisting({
          storage: this.storage,
          node,
        });
      }),
    );
  }

  async addChild(child: TreeChangeNode) {
    await this.ensureChildrenLoaded();

    this.existing = undefined;

    this.children?.push(child);
  }

  async removeChild(childName: string) {
    await this.ensureChildrenLoaded();

    const childrenCount = this.children?.length ?? 0;

    this.children = this.children?.filter((child) => child.name !== childName);

    if ((this.children?.length ?? 0) < childrenCount) {
      this.existing = undefined;
    }
  }

  async save(path: string[], blob: Blob): Promise<void> {
    if (path.length === 0) {
      throw new Error('Path cannot be empty');
    }

    const [current, ...rest] = path;
    await this.ensureChildrenLoaded();

    let child = this.children?.find((c) => c.name === current);
    if (child) {
      if (rest.length === 0) {
        if (child.type !== TreeNodeType.Leaf) {
          throw new Error(`Cannot add blob to non-leaf node: ${current}`);
        }
        child.blob = blob;
        child.existing = undefined;
      } else {
        if (child.type !== TreeNodeType.Internal) {
          throw new Error(`Cannot add to non-internal node: ${current}`);
        }
        await child.save(rest, blob);
      }
    } else {
      if (rest.length === 0) {
        child = new TreeChangeNode({
          storage: this.storage,
          name: current,
          type: TreeNodeType.Leaf,
          blob,
        });
        await this.addChild(child);
      } else {
        child = new TreeChangeNode({
          storage: this.storage,
          name: current,
          type: TreeNodeType.Internal,
          children: [],
        });
        await this.addChild(child);
        await child.save(rest, blob);
      }
    }
  }

  async remove(path: string[]): Promise<{ noMoreChildren: boolean }> {
    if (path.length === 0) {
      throw new Error('Path cannot be empty');
    }

    const [current, ...rest] = path;
    await this.ensureChildrenLoaded();
    const child = this.children?.find((c) => c.name === current);
    if (!child) {
      return { noMoreChildren: false };
    }

    if (rest.length === 0) {
      await this.removeChild(current);
      return { noMoreChildren: !this.children?.length };
    } else {
      if (child.type !== TreeNodeType.Internal) {
        throw new Error(`Cannot remove from non-internal node: ${current}`);
      }
      const { noMoreChildren } = await child.remove(rest);
      if (noMoreChildren) {
        await this.removeChild(current);
        return { noMoreChildren: !this.children?.length };
      } else {
        return { noMoreChildren: false };
      }
    }
  }

  async persist(): Promise<Nullable<TreeNode>> {
    const treeNode = await this.toTreeNode();
    const existing = await this.storage.load(treeNode.hash);
    if (existing) {
      return existing;
    }

    if (this.type === TreeNodeType.Internal) {
      await this.ensureChildrenLoaded();
      if (!this.children?.length) {
        return null;
      }

      for (const child of this.children ?? []) {
        await child.persist();
      }
    }

    await this.storage.save(treeNode);

    return treeNode;
  }
}
