# Extract report

Result: FAIL (blocker: requested 11 records are not the current Chrome IndexedDB state).

Source profile: `/Users/alphabravo/Library/Application Support/Google/Chrome/Profile 1`
Origin storage: `file__0.indexeddb.leveldb` (Chrome encoding for `file://`).
Database marker: `local-element-catalog`.

Relevant source paths:

- `/Users/alphabravo/Library/Application Support/Google/Chrome/Profile 1/IndexedDB/file__0.indexeddb.leveldb/000004.log`
- `/Users/alphabravo/Library/Application Support/Google/Chrome/Profile 1/IndexedDB/file__0.indexeddb.leveldb/000005.ldb`
- `/Users/alphabravo/Library/Application Support/Google/Chrome/Profile 1/IndexedDB/file__0.indexeddb.blob/1/02/`

Safe copy created:

- `/Users/alphabravo/Downloads/katalog-site/tmp-extract/file__0.indexeddb.leveldb/` (7 files, 2,404 KiB; source log 2,412,117 bytes)

Read-only parse results from the live log:

- `projects`: 1 active primary record
- `elements`: 13 active primary records, not 11
- `settings`: 3 active primary records
- `categories`: 7 active primary records
- current blob directory: 13 files (`27b` through `287`)
- element primary keys use `00 01 02 01 01` plus UTF-16LE UUID key; values are 9–10-byte external-value references

Active element UUIDs found: `06092cc6-1730-4af7-b409-48a19477029a`, `29f32a7c-13be-43ad-8486-66a5b8e24eab`, `374cb1d8-215b-43b5-89c8-d78edcb8e723`, `4d2c1310-c451-4e86-9ed7-38ed60688ccb`, `56075cf1-3995-4ea1-b0d4-05a087b2150d`, `6319a565-645a-4a07-a9aa-6fd278a46165`, `6ebdb220-74b8-40dd-83e0-5fa3d2763eae`, `721d63bf-85f1-4fcc-ad69-8c78b0af8ac5`, `8db2b615-0793-41a6-8adb-de10e34f5054`, `92dc27ac-1364-4063-a6cb-30798e9a50e5`, `bcac988d-d712-4f74-a72e-6b141cc5f20a`, `dad55967-d5d7-4efd-a790-222c57d83e04`, `eba7d7f7-e032-468a-97d4-fffd6364da91`.

Failure: no principled read-only way to choose exactly 11 of the 13 active records; browser storage was live and the blob set rotated from `26e–27a` to `27b–287` during inspection. Exact JSON export was therefore not claimed. No browser was closed and no profile file, HTML, `data.json`, or `index.html` was edited. `index.html` was already modified in the worktree (`git status`: `M index.html`); `data.json` remained unmodified.
