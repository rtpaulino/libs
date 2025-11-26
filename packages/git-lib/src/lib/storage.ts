import { Nullable } from '@rtpaulino/core';
import { Blob, Commit, Ref, StagingItem, TreeNode } from './model';

export interface GitLibBlobStorage {
  load(hash: string): Promise<Nullable<Blob>>;
  save(blob: Blob): Promise<void>;
  delete(hash: string): Promise<void>;
}

export interface GitLibTreeStorage {
  loadNode(hash: string): Promise<Nullable<TreeNode>>;
  saveNode(node: TreeNode): Promise<void>;
  deleteNode(hash: string): Promise<void>;
}

export interface GitLibCommitStorage {
  load(hash: string): Promise<Nullable<Commit>>;
  save(commit: Commit): Promise<void>;
  delete(hash: string): Promise<void>;
}

export interface GitLibRefStorage {
  load(refName: string): Promise<Nullable<Ref>>;
  save(ref: Ref): Promise<void>;
  delete(refName: string): Promise<void>;

  /**
   * Atomically update a ref only if it currently points to the expected commit.
   * This is used for optimistic locking to prevent concurrent commit conflicts.
   * @param ref The new ref to save
   * @param expectedCommitHash The commit hash the ref is expected to point to (null for new refs)
   * @returns true if the update succeeded, false if the ref was modified by another operation
   */
  compareAndSwap(
    ref: Ref,
    expectedCommitHash: Nullable<string>,
  ): Promise<boolean>;
}

export type GitLibStagingStorage = {
  load(): Promise<StagingItem[]>;
  add(item: StagingItem): Promise<void>;
  remove(path: string[]): Promise<void>;
  clear(): Promise<void>;
};

export type GitLibStorage = {
  blob: GitLibBlobStorage;
  tree: GitLibTreeStorage;
  commit: GitLibCommitStorage;
  ref: GitLibRefStorage;
  staging: GitLibStagingStorage;
};
