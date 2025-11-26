/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';
import { GitLib } from './git-lib';
import { Blob, StagingItem } from './model';
import {
  InMemoryBlobStorage,
  InMemoryCommitStorage,
  InMemoryRefStorage,
  InMemoryStagingStorage,
  InMemoryTreeStorage,
} from './in-memory-storage';
import { ok } from 'assert';

describe('GitLib', () => {
  it('should add a string, commit, and verify refs/commits/tree', async () => {
    // Setup in-memory storage
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Create a string blob
    const stringContent = 'hello world';
    const blob = new Blob(Buffer.from(stringContent));

    // Stage the blob with a path
    const stagingItem = new StagingItem({
      path: ['test.txt'],
      blob,
    });

    await gitLib.add('main', stagingItem);

    // Commit the staged changes
    await gitLib.commit('main', 'Initial commit with test data');

    // Verify ref exists and points to a commit
    const ref = await storage.ref.load('main');
    expect(ref).toBeDefined();
    expect(ref?.name).toBe('main');

    // Verify the commit exists and has correct message
    const commit = await storage.commit.load(ref!.commitRef);
    expect(commit).toBeDefined();
    expect(commit?.message).toBe('Initial commit with test data');
    expect(commit?.previousCommitRef).toBeNull();

    // Verify the tree exists
    expect(commit?.treeRef).toBeDefined();
    const treeNode = await storage.tree.loadNode(commit!.treeRef!);
    expect(treeNode).toBeDefined();
    expect(treeNode?.isInternal()).toBe(true);

    // Verify the blob was saved
    const savedBlob = await storage.blob.load(blob.hash);
    expect(savedBlob).toBeDefined();
    expect(savedBlob?.content.toString()).toBe(stringContent);

    // Verify we can retrieve the data via treeLookup
    ok(commit?.treeRef);
    const retrievedNode = await gitLib.treeLookup(commit.treeRef, ['test.txt']);
    expect(retrievedNode).toBeDefined();
    expect(retrievedNode?.name).toBe('test.txt');
    expect(retrievedNode?.isLeaf() && retrievedNode.blobRef).toBe(blob.hash);

    // Verify log shows the commit
    const commits = await gitLib.log('main');
    expect(commits).toHaveLength(1);
    expect(commits[0].message).toBe('Initial commit with test data');
  });

  it('should handle multiple files in a single commit', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Stage multiple files
    const file1 = new Blob(Buffer.from('content 1'));
    const file2 = new Blob(Buffer.from('content 2'));
    const file3 = new Blob(Buffer.from('content 3'));

    await gitLib.add(
      'main',
      new StagingItem({ path: ['file1.txt'], blob: file1 }),
    );
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file2.txt'], blob: file2 }),
    );
    await gitLib.add(
      'main',
      new StagingItem({ path: ['dir', 'file3.txt'], blob: file3 }),
    );

    // Commit all at once
    await gitLib.commit('main', 'Add multiple files');

    // Verify all files are in the tree
    const ref = await storage.ref.load('main');
    const commit = await storage.commit.load(ref!.commitRef);
    ok(commit?.treeRef);

    const node1 = await gitLib.treeLookup(commit.treeRef, ['file1.txt']);
    const node2 = await gitLib.treeLookup(commit.treeRef, ['file2.txt']);
    const node3 = await gitLib.treeLookup(commit.treeRef, ['dir', 'file3.txt']);

    expect(node1?.isLeaf()).toBe(true);
    expect(node2?.isLeaf()).toBe(true);
    expect(node3?.isLeaf()).toBe(true);
  });

  it('should maintain commit history across multiple commits on different files', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // First commit - add a file
    const blob1 = new Blob(Buffer.from('version 1'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file1.txt'], blob: blob1 }),
    );
    await gitLib.commit('main', 'First commit');

    // Second commit - add a different file (don't touch file1)
    const blob2 = new Blob(Buffer.from('new file'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file2.txt'], blob: blob2 }),
    );
    await gitLib.commit('main', 'Second commit');

    // Third commit - add yet another file
    const blob3 = new Blob(Buffer.from('another file'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file3.txt'], blob: blob3 }),
    );
    await gitLib.commit('main', 'Third commit');

    // Verify the log
    const log = await gitLib.log('main');
    expect(log).toHaveLength(3);
    expect(log[0].message).toBe('Third commit');
    expect(log[1].message).toBe('Second commit');
    expect(log[2].message).toBe('First commit');

    // Verify commit chain
    expect(log[0].previousCommitRef).toBe(log[1].hash);
    expect(log[1].previousCommitRef).toBe(log[2].hash);
    expect(log[2].previousCommitRef).toBeNull();
  });

  it('should support updating an existing file', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Initial commit
    const blob1 = new Blob(Buffer.from('original content'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file.txt'], blob: blob1 }),
    );
    await gitLib.commit('main', 'Initial commit');

    const ref1 = await storage.ref.load('main');
    const commit1 = await storage.commit.load(ref1!.commitRef);
    ok(commit1?.treeRef);
    const node1 = await gitLib.treeLookup(commit1.treeRef, ['file.txt']);
    const initialBlobRef = node1?.isLeaf() ? node1.blobRef : null;

    // Update the file
    const blob2 = new Blob(Buffer.from('updated content'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file.txt'], blob: blob2 }),
    );
    await gitLib.commit('main', 'Update file');

    // Verify the update
    const ref2 = await storage.ref.load('main');
    const commit2 = await storage.commit.load(ref2!.commitRef);
    ok(commit2?.treeRef);
    const node2 = await gitLib.treeLookup(commit2.treeRef, ['file.txt']);
    const updatedBlobRef = node2?.isLeaf() ? node2.blobRef : null;

    expect(initialBlobRef).not.toBe(updatedBlobRef);
    expect(updatedBlobRef).toBe(blob2.hash);
  });

  it('should support deleting files on initial commit content', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Initial commit with three files
    const blob1 = new Blob(Buffer.from('file 1'));
    const blob2 = new Blob(Buffer.from('file 2'));
    const blob3 = new Blob(Buffer.from('file 3'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file1.txt'], blob: blob1 }),
    );
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file2.txt'], blob: blob2 }),
    );
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file3.txt'], blob: blob3 }),
    );
    await gitLib.commit('main', 'Initial commit');

    // Verify all files exist
    const ref1 = await storage.ref.load('main');
    const commit1 = await storage.commit.load(ref1!.commitRef);
    ok(commit1?.treeRef);

    const n1 = await gitLib.treeLookup(commit1.treeRef, ['file1.txt']);
    const n2 = await gitLib.treeLookup(commit1.treeRef, ['file2.txt']);
    const n3 = await gitLib.treeLookup(commit1.treeRef, ['file3.txt']);
    expect(n1).toBeDefined();
    expect(n2).toBeDefined();
    expect(n3).toBeDefined();

    // Delete file2.txt
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file2.txt'] }), // No blob = deletion
    );
    await gitLib.commit('main', 'Delete file2');

    // Verify file2 is deleted but others remain
    const ref2 = await storage.ref.load('main');
    const commit2 = await storage.commit.load(ref2!.commitRef);
    ok(commit2?.treeRef);

    const n1After = await gitLib.treeLookup(commit2.treeRef, ['file1.txt']);
    const n2After = await gitLib.treeLookup(commit2.treeRef, ['file2.txt']);
    const n3After = await gitLib.treeLookup(commit2.treeRef, ['file3.txt']);

    expect(n1After).toBeDefined();
    expect(n2After).toBeUndefined(); // file2 should be deleted (returns undefined from find())
    expect(n3After).toBeDefined();

    // Verify log shows both commits
    const log = await gitLib.log('main');
    expect(log).toHaveLength(2);
    expect(log[0].message).toBe('Delete file2');
    expect(log[1].message).toBe('Initial commit');
  });

  it('should support independent branches with separate storage instances', async () => {
    // Main branch
    const mainStorage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const mainGit = new GitLib({ storage: mainStorage });
    const blob1 = new Blob(Buffer.from('main content'));
    await mainGit.add(
      'main',
      new StagingItem({ path: ['main.txt'], blob: blob1 }),
    );
    await mainGit.commit('main', 'Main branch commit');

    // Feature branch (separate storage)
    const featureStorage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const featureGit = new GitLib({ storage: featureStorage });
    const blob2 = new Blob(Buffer.from('feature content'));
    await featureGit.add(
      'feature',
      new StagingItem({ path: ['feature.txt'], blob: blob2 }),
    );
    await featureGit.commit('feature', 'Feature branch commit');

    // Verify both branches have their own commits
    const mainCommit = await mainGit.getCommitFromRef('main');
    const featureCommit = await featureGit.getCommitFromRef('feature');

    expect(mainCommit?.message).toBe('Main branch commit');
    expect(featureCommit?.message).toBe('Feature branch commit');
    expect(mainCommit?.hash).not.toBe(featureCommit?.hash);
  });

  it('should support reset to a previous commit', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // First commit
    const blob1 = new Blob(Buffer.from('v1'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file.txt'], blob: blob1 }),
    );
    await gitLib.commit('main', 'Commit 1');

    const ref1 = await storage.ref.load('main');
    const commit1Hash = ref1!.commitRef;

    // Second commit
    const blob2 = new Blob(Buffer.from('v2'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file.txt'], blob: blob2 }),
    );
    await gitLib.commit('main', 'Commit 2');

    // Reset to first commit
    await gitLib.reset('main', commit1Hash);

    // Verify ref points to first commit
    const resetRef = await storage.ref.load('main');
    expect(resetRef?.commitRef).toBe(commit1Hash);
    const resetCommit = await storage.commit.load(resetRef!.commitRef);
    expect(resetCommit?.message).toBe('Commit 1');
  });

  it('should throw error when trying to commit without changes', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Try to commit with no staged changes
    await expect(gitLib.commit('main', 'Empty commit')).rejects.toThrow(
      'No changes to commit',
    );
  });

  it('should not stage unchanged files', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Initial commit
    const blob1 = new Blob(Buffer.from('content'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file.txt'], blob: blob1 }),
    );
    await gitLib.commit('main', 'Initial commit');

    // Try to stage the same file again
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file.txt'], blob: blob1 }),
    );

    // Verify nothing is staged
    const stagingItems = await storage.staging.load();
    expect(stagingItems).toHaveLength(0);
  });

  it('should delete orphaned records with garbage collection', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Create first commit on main
    const blob1 = new Blob(Buffer.from('content 1'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file1.txt'], blob: blob1 }),
    );
    await gitLib.commit('main', 'First commit');

    // Create second commit on main
    const blob2 = new Blob(Buffer.from('content 2'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file2.txt'], blob: blob2 }),
    );
    await gitLib.commit('main', 'Second commit');

    // Create third commit on main
    const blob3 = new Blob(Buffer.from('content 3'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file3.txt'], blob: blob3 }),
    );
    await gitLib.commit('main', 'Third commit');

    const mainCommits = await gitLib.log('main');
    expect(mainCommits).toHaveLength(3);

    // Create a branch that points to the second commit
    await gitLib.reset('dev', mainCommits[1].hash);

    // Count objects before GC
    const allCommitsBefore = await storage.commit.listAll();
    const allTreesBefore = await storage.tree.listAll();
    const allBlobsBefore = await storage.blob.listAll();
    expect(allCommitsBefore.length).toBeGreaterThan(0);
    expect(allTreesBefore.length).toBeGreaterThan(0);
    expect(allBlobsBefore.length).toBeGreaterThan(0);

    // Run GC - nothing should be deleted since all commits are reachable
    const result1 = await gitLib.gc();
    expect(result1.commits).toBe(0);
    expect(result1.trees).toBe(0);
    expect(result1.blobs).toBe(0);

    // Now reset main to the first commit, making the third commit orphaned
    await gitLib.reset('main', mainCommits[2].hash); // Point to first commit

    // Run GC - should delete orphaned commits/trees/blobs
    const result2 = await gitLib.gc();

    // The third commit is no longer reachable
    // We expect it to be deleted, but first and second are still reachable
    expect(result2.commits).toBeGreaterThan(0);
    expect(result2.trees).toBeGreaterThan(0);
    expect(result2.blobs).toBeGreaterThan(0);

    // Verify we can still access commits from both refs
    const mainCommit = await gitLib.getCommitFromRef('main');
    const devCommit = await gitLib.getCommitFromRef('dev');
    expect(mainCommit).toBeDefined();
    expect(devCommit).toBeDefined();

    // Delete dev ref, making the second commit orphaned
    await storage.ref.delete('dev');

    // Run GC again
    const result3 = await gitLib.gc();
    expect(result3.commits).toBeGreaterThan(0);

    // Verify we can still access the main commit
    const finalMainCommit = await gitLib.getCommitFromRef('main');
    expect(finalMainCommit).toBeDefined();
    expect(finalMainCommit?.message).toBe('First commit');
  });

  it('should handle GC with no orphaned objects', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Create a single commit
    const blob1 = new Blob(Buffer.from('content 1'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file1.txt'], blob: blob1 }),
    );
    await gitLib.commit('main', 'First commit');

    // Run GC - nothing should be deleted
    const result = await gitLib.gc();
    expect(result.commits).toBe(0);
    expect(result.trees).toBe(0);
    expect(result.blobs).toBe(0);

    // Verify commit is still accessible
    const commit = await gitLib.getCommitFromRef('main');
    expect(commit).toBeDefined();
  });

  it('should handle GC with empty repository', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Run GC on empty repository
    const result = await gitLib.gc();
    expect(result.commits).toBe(0);
    expect(result.trees).toBe(0);
    expect(result.blobs).toBe(0);
  });

  it('should handle GC with shared blobs across commits', async () => {
    const storage = {
      blob: new InMemoryBlobStorage(),
      tree: new InMemoryTreeStorage(),
      commit: new InMemoryCommitStorage(),
      ref: new InMemoryRefStorage(),
      staging: new InMemoryStagingStorage(),
    };

    const gitLib = new GitLib({ storage });

    // Create first commit with a file
    const blob1 = new Blob(Buffer.from('shared content'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file1.txt'], blob: blob1 }),
    );
    await gitLib.commit('main', 'First commit');

    // Create second commit with same blob (simulating unchanged file)
    const blob2 = new Blob(Buffer.from('new content'));
    await gitLib.add(
      'main',
      new StagingItem({ path: ['file2.txt'], blob: blob2 }),
    );
    await gitLib.commit('main', 'Second commit');

    const commits = await gitLib.log('main');

    // Reset to first commit, making second commit orphaned
    await gitLib.reset('main', commits[1].hash);

    // Run GC
    const result = await gitLib.gc();

    // Second commit should be deleted, but blob1 should remain
    expect(result.commits).toBeGreaterThan(0);

    // Verify blob1 still exists (it's used by the first commit)
    const remainingBlob = await storage.blob.load(blob1.hash);
    expect(remainingBlob).toBeDefined();
  });
});
