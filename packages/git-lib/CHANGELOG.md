## 0.10.0 (2025-12-31)

This was a version bump only for @rtpaulino/git-lib to align it with other projects, there were no code changes.

## 0.9.3 (2025-12-31)

### 🚀 Features

- implement garbage collection for orphaned commits, trees, and blobs ([4e45981](https://github.com/rtpaulino/libs/commit/4e45981))
- implement in-memory storage for GitLib, including blob, tree, commit, ref, and staging storage feat: enhance GitLib with tree lookup, commit handling, and staging changes management feat: add model classes for Blob, TreeNode, Commit, Ref, and StagingItem with serialization support feat: implement tree change management for internal and leaf nodes in GitLib chore: update ESLint configuration to reflect new scope tags for core and git-lib modules chore: add references in tsconfig for core library ([8686f75](https://github.com/rtpaulino/libs/commit/8686f75))

### 🩹 Fixes

- remove references from tsconfig.lib.json ([5ba0516](https://github.com/rtpaulino/libs/commit/5ba0516))
- update StagingItem to allow nullable Blob type ([4c6646b](https://github.com/rtpaulino/libs/commit/4c6646b))
- update package.json to set access to public and remove private flag ([3cc35c6](https://github.com/rtpaulino/libs/commit/3cc35c6))

### ❤️ Thank You

- Rafael Paulino