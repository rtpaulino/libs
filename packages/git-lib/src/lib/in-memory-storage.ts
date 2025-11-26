import { Nullable } from '@rtpaulino/core';
import { Blob, Commit, Ref, StagingItem, TreeNode } from './model';
import {
  GitLibBlobStorage,
  GitLibCommitStorage,
  GitLibRefStorage,
  GitLibStagingStorage,
  GitLibTreeStorage,
} from './storage';

export class InMemoryBlobStorage implements GitLibBlobStorage {
  private blobs: Map<string, Blob> = new Map();

  async load(hash: string): Promise<Nullable<Blob>> {
    return this.blobs.get(hash) ?? null;
  }

  async save(blob: Blob): Promise<void> {
    this.blobs.set(blob.hash, blob);
  }

  async delete(hash: string): Promise<void> {
    this.blobs.delete(hash);
  }

  async listAll(): Promise<string[]> {
    return Array.from(this.blobs.keys());
  }
}

export class InMemoryTreeStorage implements GitLibTreeStorage {
  private nodes: Map<string, TreeNode> = new Map();

  async load(hash: string): Promise<Nullable<TreeNode>> {
    return this.nodes.get(hash) ?? null;
  }

  async save(node: TreeNode): Promise<void> {
    this.nodes.set(node.hash, node);
  }

  async delete(hash: string): Promise<void> {
    this.nodes.delete(hash);
  }

  async listAll(): Promise<string[]> {
    return Array.from(this.nodes.keys());
  }
}

export class InMemoryCommitStorage implements GitLibCommitStorage {
  private commits: Map<string, Commit> = new Map();

  async load(hash: string): Promise<Nullable<Commit>> {
    return this.commits.get(hash) ?? null;
  }

  async save(commit: Commit): Promise<void> {
    this.commits.set(commit.hash, commit);
  }

  async delete(hash: string): Promise<void> {
    this.commits.delete(hash);
  }

  async listAll(): Promise<string[]> {
    return Array.from(this.commits.keys());
  }
}

export class InMemoryRefStorage implements GitLibRefStorage {
  private refs: Map<string, Ref> = new Map();

  async load(refName: string): Promise<Nullable<Ref>> {
    return this.refs.get(refName) ?? null;
  }

  async save(ref: Ref): Promise<void> {
    this.refs.set(ref.name, ref);
  }

  async delete(refName: string): Promise<void> {
    this.refs.delete(refName);
  }

  async listAll(): Promise<string[]> {
    return Array.from(this.refs.keys());
  }

  async compareAndSwap(
    ref: Ref,
    expectedCommitHash: Nullable<string>,
  ): Promise<boolean> {
    const current = this.refs.get(ref.name);
    const currentHash = current?.commitRef ?? null;

    if (currentHash !== expectedCommitHash) {
      return false;
    }

    this.refs.set(ref.name, ref);
    return true;
  }
}

export class InMemoryStagingStorage implements GitLibStagingStorage {
  private items: Map<string, StagingItem> = new Map();

  private pathToKey(path: string[]): string {
    return path.join('/');
  }

  async load(): Promise<StagingItem[]> {
    return Array.from(this.items.values());
  }

  async add(item: StagingItem): Promise<void> {
    this.items.set(this.pathToKey(item.path), item);
  }

  async remove(path: string[]): Promise<void> {
    this.items.delete(this.pathToKey(path));
  }

  async clear(): Promise<void> {
    this.items.clear();
  }
}
