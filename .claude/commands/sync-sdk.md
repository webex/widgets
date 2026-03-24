Sync SDK dependencies and generate an impact report.

## What this does

1. Reads the SDK manifest from the local SDK checkout (via node_modules symlink or fallback local path)
2. Compares it against the cached previous manifest (if any) in `.sdk-cache/`
3. Regenerates `sdk-dependencies.yaml` by scanning all consumer source files
4. Cross-references manifest changes with the dependency map
5. Outputs a precise impact report showing which files need updating

## Steps

1. Run: `npx ts-node --project scripts/tsconfig.json scripts/generate-sdk-deps.ts`
2. Check if `.sdk-cache/@webex/contact-center.manifest.yaml` exists (previous cached manifest)
3. Read the current manifest from the SDK (via `node_modules/@webex/contact-center/sdk-manifest.yaml` or the local ccSDK path)
4. If a cached version exists, diff the two manifests:
   - Find added/removed/changed methods
   - Find added/removed/changed events
   - Find added/removed/changed types
5. For each change, look up affected files in `sdk-dependencies.yaml`
6. Output the impact report in a structured format
7. Cache the current manifest to `.sdk-cache/@webex/contact-center.manifest.yaml` for future diffing

## Impact Report Format

```
SDK Sync Report — @webex/contact-center
Previous: v<old> -> Current: v<new>

=== BREAKING CHANGES ===
1. Method: <name>
   Change: <description>
   Affected files:
     -> <file>:<line> (<context>)
   Action: <what to do>

=== ADDITIONS (non-breaking) ===
2. Method: <name> added
   No current consumers.

=== SUMMARY ===
Breaking changes: N (affects M files)
Additions: N
Removals: N
```

## When to run

- After bumping the SDK version in package.json
- After the SDK team notifies of API changes
- Before starting work that depends on SDK APIs
- Periodically to check for drift
