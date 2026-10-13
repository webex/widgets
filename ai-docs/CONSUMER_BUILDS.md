# Consumer build release checks

## Scope

The checks build a small Contact Center consumer with Webpack, Vite, Parcel, Rollup, and esbuild.
The consumer imports `@webex/cc-widgets` and `@webex/cc-ai-assistant`. A Chromium check loads each
build from a nested URL, checks the React exports, and imports `@webex/cc-widgets/wc` to check
custom element registration. The consumer does not start an SDK session.

The fixture has normal CSS, Sass, font, and image support. It does not have a wellness media loader
or a workaround for Webpack loader syntax. Tool versions and UI peers are fixed in
[`tooling/consumer-builds/fixture/package-lock.json`](../tooling/consumer-builds/fixture/package-lock.json).
These checks cover this fixture and these tool versions. They do not confirm all consumer settings,
development servers, media playback, or CSP policies.

## Enable or disable a bundler

Edit [`tooling/consumer-builds/config.json`](../tooling/consumer-builds/config.json). All five bundlers
are enabled by default. Set a bundler's `enabled` flag to `false` to omit its check from PRs and releases:

```json
"parcel": {"enabled": false}
```

Use a boolean value. Keep all five entries. Unknown entries, missing flags, and an empty enabled list
fail configuration validation. At least one bundler must be enabled. The workflow has no separate
list of required bundlers. Disabled tools remain in the fixture lockfile.

## Release sequence

1. `Deploy CD` finds the changed packages, synchronizes and increments versions, and builds production packages.
2. `prepare-release` packs all nine Contact Center packages, plus the legacy meetings package if it changed.
   A manifest records each package name, version, archive SHA-256, and whether it must be published.
3. The consumer workflow installs those archives into a separate fixture for each enabled bundler.
   It checks archive hashes and package versions, builds the consumer, and checks browser startup.
   Each bundler runs in a separate job. A failure does not cancel the other bundler jobs.
4. `publish-npm` runs only after all enabled checks pass. It verifies the archives again and publishes
   the changed packages from those exact archives with the branch dist tag. It does not rebuild them.
   The existing version outputs, distributable cache, documentation, tags, and release comments remain available.

The release preparation and consumer jobs have read access and no publishing secrets.
Only the npm publish step receives `NPM_TOKEN`. The reusable workflow does not inherit secrets.
PR checks use the PR merge commit and read access. They do not use `pull_request_target`.
The `@webex/test-fixtures` package is never published.

## Local checks

From the repository root:

```sh
yarn install --immutable
yarn workspace webex-widgets build:prod
yarn workspace webex-widgets consumer-builds:pack
yarn workspace webex-widgets consumer-builds:matrix
yarn workspace webex-widgets test:consumer-builds webpack
yarn workspace webex-widgets test:consumer-builds vite
yarn workspace webex-widgets test:consumer-builds parcel
yarn workspace webex-widgets test:consumer-builds rollup
yarn workspace webex-widgets test:consumer-builds esbuild
yarn workspace webex-widgets test:tooling --runInBand tooling/tests/consumer-build
```

To check other candidate archives, pass their directory as the second argument to `test:consumer-builds`.
It must contain `manifest.json` and all nine Contact Center archives. The runner creates its installs,
builds, logs, and results under `.generated/consumer-builds/`. GitHub Actions saves build logs and
package hashes as `consumer-report-<bundler>` artifacts, including when a check fails.

Rebuild with `yarn build:dev` before the full unit suite or a commit. The repo unit tests use development
distributables. Do not use a local publish command to test the gate. Unit tests mock publishing.

## Known regression

`next` at `c298215c` contains the wellness inline Webpack loader and development logging output.
The new checks must reject this candidate. [PR #751](https://github.com/webex/widgets/pull/751)
fixes those package outputs and must merge before this release gate can pass for all five bundlers.
This workflow change does not include that package fix.

## Local validation on 2026-10-13

- Production packages from `next` at `c298215c`: Vite failed on the inline wellness loader request.
  Webpack passed. This confirms that the gate catches the reported consumer regression.
- Production archives from PR #751 at `645707ff`: all five builds and Chromium startup checks passed.
  Each result records the same nine archive hashes. No package fix was added to this branch.
- Setting `parcel.enabled` to `false` removed Parcel from the matrix. A direct Parcel test command
  failed before installation. The default configuration was then restored.
- 51 tooling regression tests passed, with 88.96% line coverage and 84.09% branch coverage across the
  configuration, archive, runner, and browser check helpers.
- `actionlint`, formatting checks, and an immutable Yarn install passed. The existing repo styles
  check passed with six warnings in the unchanged Web Component sample.
- Publishing all nine Contact Center archives with `--dry-run` passed. No package was published.

Rollback: revert the workflow change. To omit one bundler check, change its config flag instead.
