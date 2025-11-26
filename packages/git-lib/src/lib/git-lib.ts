import { excludeNil, Nullable } from '@rtpaulino/core';
import {
  Commit,
  Ref,
  StagingChange,
  StagingChangeType,
  StagingItem,
  TreeNode,
} from './model.js';
import { GitLibStorage } from './storage.js';
import { TreeChangeNode } from './tree-change.js';
import { ok } from 'assert';

export class GitLib {
  readonly storage: GitLibStorage;

  constructor(data: { storage: GitLibStorage }) {
    this.storage = data.storage;
  }

  async treeLookup(ref: string, path: string[]): Promise<Nullable<TreeNode>> {
    let node = await this.storage.tree.load(ref);
    for (let i = 0; node && i < path.length; i++) {
      const part = path[i];
      if (node.isInternal()) {
        const children = (
          await Promise.all(
            node.childrenRefs.map((childRef) =>
              this.storage.tree.load(childRef),
            ),
          )
        ).filter(excludeNil);

        node = children.find((c) => c.name === part);
      } else {
        return null;
      }
    }
    return node;
  }

  async getCommit(hash: string) {
    return await this.storage.commit.load(hash);
  }

  async getCommitFromRef(refName: string): Promise<Nullable<Commit>> {
    const ref = await this.storage.ref.load(refName);
    if (!ref) {
      return null;
    }
    return await this.storage.commit.load(ref.commitRef);
  }

  async add(refName: string, item: StagingItem): Promise<void> {
    const commit = await this.getCommitFromRef(refName);
    const node = commit?.treeRef
      ? await this.treeLookup(commit.treeRef, item.path)
      : null;
    const alreadyExists =
      node && node.isLeaf() && item.blob && node.blobRef === item.blob.hash;
    const alreadyNotExists = !item.blob && !node;
    if (alreadyExists || alreadyNotExists) {
      return;
    }
    await this.storage.staging.add(item);
  }

  async clear(): Promise<void> {
    await this.storage.staging.clear();
  }

  async remove(path: string[]): Promise<void> {
    await this.storage.staging.remove(path);
  }

  async getStagingChanges(refName: string): Promise<StagingChange[]> {
    const commit = await this.getCommitFromRef(refName);
    const stagingItems = await this.storage.staging.load();
    const changes: StagingChange[] = [];
    for (const item of stagingItems) {
      const existingNode = commit?.treeRef
        ? await this.treeLookup(commit.treeRef, item.path)
        : null;
      const stagingChange = new StagingChange({
        stagingItem: item,
        existingNode,
      });
      if (stagingChange.type === StagingChangeType.Unchanged) {
        await this.storage.staging.remove(item.path);
      } else {
        changes.push(stagingChange);
      }
    }
    return changes;
  }

  async commit(refName: string, message: string): Promise<void> {
    const stagingChanges = await this.getStagingChanges(refName);
    if (stagingChanges.length === 0) {
      throw new Error('No changes to commit');
    }
    const headCommit = await this.getCommitFromRef(refName);
    const expectedCommitHash = headCommit?.hash ?? null;

    const headNode = headCommit?.treeRef
      ? await this.storage.tree.load(headCommit.treeRef)
      : null;

    ok(!headNode || headNode.isInternal(), 'Head tree node must be internal');

    const treeChangeHead = headNode
      ? TreeChangeNode.fromExisting({
          storage: this.storage.tree,
          node: headNode,
        })
      : TreeChangeNode.createRoot({ storage: this.storage.tree });

    for (const change of stagingChanges) {
      if (change.type === StagingChangeType.Add && change.stagingItem.blob) {
        await this.storage.blob.save(change.stagingItem.blob);
        await treeChangeHead.save(
          change.stagingItem.path,
          change.stagingItem.blob,
        );
      } else if (
        change.type === StagingChangeType.Update &&
        change.stagingItem.blob
      ) {
        await this.storage.blob.save(change.stagingItem.blob);
        await treeChangeHead.save(
          change.stagingItem.path,
          change.stagingItem.blob,
        );
      } else if (change.type === StagingChangeType.Remove) {
        await treeChangeHead.remove(change.stagingItem.path);
      }
    }

    const newHeadNode = await treeChangeHead.persist();

    const commit = new Commit({
      message,
      treeRef: newHeadNode?.hash ?? null,
      previousCommitRef: headCommit?.hash ?? null,
    });

    await this.storage.commit.save(commit);

    const success = await this.storage.ref.compareAndSwap(
      new Ref({ name: refName, commitRef: commit.hash }),
      expectedCommitHash,
    );

    if (!success) {
      throw new Error(
        `Concurrent modification detected on ref '${refName}'. ` +
          `Another commit was made while this commit was in progress. ` +
          `Please pull the latest changes and try again.`,
      );
    }

    await this.clear();
  }

  async log(refName: string): Promise<Commit[]> {
    const commits: Commit[] = [];
    let commit = await this.getCommitFromRef(refName);
    while (commit) {
      commits.push(commit);
      if (commit.previousCommitRef) {
        commit = await this.storage.commit.load(commit.previousCommitRef);
      } else {
        break;
      }
    }
    return commits;
  }

  async reset(refName: string, commitHash: string): Promise<void> {
    const commit = await this.storage.commit.load(commitHash);
    if (!commit) {
      throw new Error(`Commit ${commitHash} not found`);
    }
    await this.storage.ref.save(
      new Ref({ name: refName, commitRef: commit.hash }),
    );
  }

  /**
   * Garbage collection: removes orphaned commits, trees, and blobs that are not reachable from any ref.
   * This traverses all refs, collects all reachable objects, and deletes unreachable ones.
   * @returns An object containing the counts of deleted commits, trees, and blobs
   */
  async gc(): Promise<{ commits: number; trees: number; blobs: number }> {
    const reachableCommits = new Set<string>();
    const reachableTrees = new Set<string>();
    const reachableBlobs = new Set<string>();

    // Collect all refs
    const refNames = await this.storage.ref.listAll();

    // Traverse from each ref to collect all reachable objects
    for (const refName of refNames) {
      const ref = await this.storage.ref.load(refName);
      if (!ref) continue;

      // Traverse commit chain
      let commit = await this.storage.commit.load(ref.commitRef);
      while (commit && !reachableCommits.has(commit.hash)) {
        reachableCommits.add(commit.hash);

        // Traverse tree from this commit
        if (commit.treeRef) {
          await this.traverseTree(
            commit.treeRef,
            reachableTrees,
            reachableBlobs,
          );
        }

        // Move to previous commit
        if (commit.previousCommitRef) {
          commit = await this.storage.commit.load(commit.previousCommitRef);
        } else {
          break;
        }
      }
    }

    // Collect all stored objects
    const allCommits = await this.storage.commit.listAll();
    const allTrees = await this.storage.tree.listAll();
    const allBlobs = await this.storage.blob.listAll();

    // Delete unreachable objects
    let deletedCommits = 0;
    let deletedTrees = 0;
    let deletedBlobs = 0;

    for (const commitHash of allCommits) {
      if (!reachableCommits.has(commitHash)) {
        await this.storage.commit.delete(commitHash);
        deletedCommits++;
      }
    }

    for (const treeHash of allTrees) {
      if (!reachableTrees.has(treeHash)) {
        await this.storage.tree.delete(treeHash);
        deletedTrees++;
      }
    }

    for (const blobHash of allBlobs) {
      if (!reachableBlobs.has(blobHash)) {
        await this.storage.blob.delete(blobHash);
        deletedBlobs++;
      }
    }

    return {
      commits: deletedCommits,
      trees: deletedTrees,
      blobs: deletedBlobs,
    };
  }

  /**
   * Helper method to recursively traverse a tree and collect all reachable trees and blobs.
   */
  private async traverseTree(
    treeHash: string,
    reachableTrees: Set<string>,
    reachableBlobs: Set<string>,
  ): Promise<void> {
    if (reachableTrees.has(treeHash)) {
      return; // Already visited
    }

    const node = await this.storage.tree.load(treeHash);
    if (!node) {
      return; // Node not found (shouldn't happen in a valid repository)
    }

    reachableTrees.add(treeHash);

    if (node.isLeaf()) {
      reachableBlobs.add(node.blobRef);
    } else if (node.isInternal()) {
      // Recursively traverse child trees
      for (const childRef of node.childrenRefs) {
        await this.traverseTree(childRef, reachableTrees, reachableBlobs);
      }
    }
  }
}
