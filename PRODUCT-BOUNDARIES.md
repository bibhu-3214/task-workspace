# Task Workspace: projects, tasks and their notes

Task Workspace is the destination for project planning and project-linked notes. The task board, project list and notes each have a dedicated view; this app does not contain film or sales dashboards.

To transfer Notes Workspace data:

1. In Notes Workspace, sign into the source account and choose **Export JSON**. Keep this original export.
2. Sign into the intended Task Workspace account, choose **Import notes** and select that file.
3. Review new and duplicate counts and optionally choose a destination project, then select **Import notes**.
4. Verify note contents, pinned state and timestamps, then export a Task Workspace backup.

Imports merge records. Stable hashed source IDs prevent repeat imports from overwriting notes, including edits made after the first import. Notes accounts and Task accounts are separate; there is no automatic account matching. The source app remains available. A source ID identifies a record within this source product; if combining unrelated source accounts with manually reused IDs, review collisions before transferring.

Existing taskbox exports (version 1), appearance preferences and session cookie names remain supported. Combined backups use version 2 and include tasks, projects and notes. **Restore backup** explicitly replaces the destination workspace after review; it differs from merging Notes imports. The API rejects missing project references, duplicate IDs, stale revisions and cross-account writes.
