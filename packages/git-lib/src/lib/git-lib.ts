import { excludeNil, Nullable } from '@rtpaulino/core';
import {
  Commit,
  Ref,
  StagingChange,
  StagingChangeType,
  StagingItem,
  TreeNode,
} from './model';
import { GitLibStorage } from './storage';
import { TreeChangeNode } from './tree-change';
import { ok } from 'assert';

export class GitLib {
  readonly storage: GitLibStorage;

  constructor(data: { storage: GitLibStorage }) {
    this.storage = data.storage;
  }

  async treeLookup(ref: string, path: string[]): Promise<Nullable<TreeNode>> {
    let node = await this.storage.tree.loadNode(ref);
    for (let i = 0; node && i < path.length; i++) {
      const part = path[i];
      if (node.isInternal()) {
        const children = (
          await Promise.all(
            node.childrenRefs.map((childRef) =>
              this.storage.tree.loadNode(childRef),
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
      ? await this.storage.tree.loadNode(headCommit.treeRef)
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
}
