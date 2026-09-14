---
name: PostgreSQL session store setup
description: Runtime constraint for connect-pg-simple in bundled API-server builds
---

When using connect-pg-simple in the bundled API server, create the `session` table explicitly during startup and disable `createTableIfMissing`.

**Why:** The package's automatic table creation expects a package-relative `table.sql` file that is not present in the bundled dist directory, so the first session write fails with ENOENT.

**How to apply:** Run the idempotent session-table DDL through the shared PostgreSQL pool before listening, then construct the store with `createTableIfMissing: false`.