# Consumer build release checks

## Scope

The checks can build a small Contact Center consumer with Webpack, Vite, Parcel, Rollup, and esbuild.
The consumer imports `@webex/cc-widgets` and `@webex/cc-ai-assistant`. A Chromium check loads each
build from a nested URL, checks the React exports, and imports `@webex/cc-widgets/wc` to check
custom element registration. The consumer does not start an SDK session.

The fixture has normal CSS, Sass, font, and image support. It does not have a wellness media loader
or a workaround for Webpack loader syntax. Tool versions and UI peers are fixed in
[`tooling/consumer-builds/fixture/package-lock.json`](../tooling/consumer-builds/fixture/package-lock.json).
The fixture pins `@momentum-ui/react-collaboration` to `26.201.9`, which satisfies the Contact Center
packages' declared minimum versions, including `@webex/cc-station-login`.
These checks cover this fixture and these tool versions. They do not confirm all consumer settings,
development servers, media playback, or CSP policies.

## Enable or disable a bundler

Edit [`tooling/consumer-builds/config.json`](../tooling/consumer-builds/config.json). Webpack, Rollup,
and esbuild are enabled by default. Vite and Parcel are temporarily disabled because the supported
Momentum UI peer contains CSS that they reject (see Known regression below). The default release
gate therefore covers three bundlers. Re-enable Vite and Parcel after a corrected peer passes both
their builds and browser checks. Set a bundler's `enabled` flag to `false` to omit it from PRs and releases:

```json
"rollup": {"enabled": false}
```

Use a boolean value. Keep all five entries. Unknown entries, missing flags, and an empty enabled list
fail configuration validation. At least one bundler must be enabled. The workflow has no separate
list of required bundlers. Disabled tools remain in the fixture lockfile.
Both workflow paths stop on configuration errors before writing a matrix output. A valid opt out
does not require changes to the tooling tests.

## Release sequence

1. `Deploy CD` finds the changed packages, synchronizes and increments versions, and builds production packages.
2. `prepare-release` packs all nine Contact Center packages. A manifest records each package name,
   version, and archive SHA-256. The candidate artifact also contains a Git patch of the package
   manifests changed by `package-tools`. The existing distributable cache holds the production build.
3. The consumer workflow installs those archives into a separate fixture for each enabled bundler.
   It checks archive hashes and package versions, builds the consumer, and checks browser startup.
   Each bundler runs in a separate job. A failure does not cancel the other bundler jobs.
4. `publish-npm` runs only after all enabled checks pass. It installs the checkout's dependencies,
   restores the production distributable cache, applies the prepared manifest patch, and verifies
   the candidate archives again. It repacks the restored workspaces into a separate temporary
   directory and compares package names, versions, file paths, executable flags, and SHA-256 file
   hashes with the tested archives. Archive order, timestamps, owners, and compression metadata
   do not affect this comparison. A content mismatch, missing build cache, or patch conflict stops publishing.
5. The existing `yarn workspaces foreach ... run deploy:npm` command publishes the changed workspaces
   with the branch dist tag. Each workspace keeps its own `deploy:npm` script, including the exclusion
   for `@webex/test-fixtures`. The publish job does not repeat version selection or rebuild packages.
   Yarn packs the restored workspaces during publishing. The existing version outputs, documentation,
   tags, and release comments remain available.

The release preparation and consumer jobs have read access and no publishing secrets.
Only the deploy step receives `NPM_TOKEN`, through `YARN_NPM_AUTH_TOKEN`. The reusable workflow does not inherit secrets.
PR checks use the PR merge commit and read access. They do not use `pull_request_target`.
The `@webex/test-fixtures` package is never published.

## Local checks

From the repository root:

```sh
yarn install --immutable
yarn workspace webex-widgets build:prod
yarn workspace webex-widgets consumer-builds:pack
yarn workspace webex-widgets consumer-builds:verify
yarn workspace webex-widgets consumer-builds:matrix
yarn workspace webex-widgets test:consumer-builds webpack
yarn workspace webex-widgets test:consumer-builds rollup
yarn workspace webex-widgets test:consumer-builds esbuild
yarn workspace webex-widgets test:tooling --runInBand tooling/tests/consumer-build
```

To test Vite or Parcel, first set its `enabled` flag to `true`, then run
`yarn workspace webex-widgets test:consumer-builds vite` or
`yarn workspace webex-widgets test:consumer-builds parcel`.

To check other candidate archives, pass their directory as the second argument to `test:consumer-builds`.
It must contain `manifest.json` and all nine Contact Center archives. The runner creates its installs,
builds, logs, and results under `.generated/consumer-builds/`. GitHub Actions saves build logs and
package hashes as `consumer-report-<bundler>` artifacts, including when a check fails.

Rebuild with `yarn build:dev` before the full unit suite or a commit. The repo unit tests use development
distributables. The release tests use a temporary Git repository to check the manifest patch and a
stub Yarn executable to check `deploy:npm` arguments and failures. They do not publish packages.
Archive comparison tests cover modified build output, added and removed files, changed manifests,
executable flags, package sets and versions, timestamp differences, and temporary directory cleanup.
Archive links and paths outside `package/` are rejected before extraction.

## Known regression

The supported Momentum UI peer `26.201.9` emits an invalid `::part(icon) path` selector from
`MeetingRowContent.style.scss`. The fork run at `fbfb39d1` passed Webpack, Rollup, and esbuild;
Vite and Parcel rejected this CSS. The same Sass block is present in sampled later versions,
including `26.214.0`, which also failed both local checks. Vite and Parcel are opted out in the
default configuration while this dependency issue remains. Enabling either check reproduces the
failure and blocks publishing. Webpack, Rollup, and esbuild remain required by the default gate.
The earlier passing run at `915df2a` used peer `26.197.0`, below the declared station-login minimum.

The original `next` baseline at `c298215c` contained the wellness inline Webpack loader and development
logging output. The consumer checks rejected that candidate. [PR #751](https://github.com/webex/widgets/pull/751)
fixed those package outputs. Its fix is now included through the PR branch's merges from `next`.

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

## Release tooling correction on 2026-10-22

The workflow keeps `package-tools sync`, `package-tools increment`, `build:prod`, and workspace
`deploy:npm`. The custom archive publisher and its root package script were removed. Candidate
archives are used for consumer checks. Publishing uses the existing workspace scripts after
restoring the prepared package versions and production distributables.

The 51 targeted tests pass with 88.32% helper line coverage and 84.72% branch coverage. The release
tests cover an empty manifest patch, version restoration, patch conflicts, deploy arguments, and
failed deployment handling. A separate local check with real Yarn 4.5.1 also confirmed restored
versions, package selection, argument forwarding, and the `test-fixtures` exclusion with harmless
workspace deploy scripts. The development build, production build, and styles check passed.
