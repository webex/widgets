# npm releases

## Release path

[`Deploy CD`](../.github/workflows/deploy.yml) runs on pushes to `next`. It finds changed packages and
their dependents, synchronizes and increments versions with `package-tools`, builds production
packages, and runs the enabled [consumer checks](CONSUMER_BUILDS.md). The publish job restores the
prepared versions and build output and checks them against the tested Contact Center archives.

The repository pins Yarn `4.10.3`, which supports OIDC publishing for scoped packages. Each released
workspace keeps `deploy:npm: yarn npm publish`. Yarn packs the current workspace and publishes it
with public access and the branch dist-tag (`next`). It also manages dependencies and builds,
including conversion of `workspace:*` dependencies during packing. The release command adds
`--provenance` to publish build provenance. Candidate archives remain the input to the consumer
checks; the publish job verifies restored workspace contents before publishing.
See the [Yarn scoped-package OIDC fix](https://github.com/yarnpkg/berry/releases/tag/%40yarnpkg/cli/4.10.3).

Only `publish-npm` has `id-token: write`, with `contents: read`. It runs on a GitHub-hosted runner.
Yarn exchanges the GitHub OIDC identity for a short-lived npm publish credential. The job does not receive
`NPM_TOKEN` or `YARN_NPM_AUTH_TOKEN`. The documentation, Git tags, and release comments keep their
existing dependency on successful publication.

## Package owner setup

The person who configures npm must have write access to each package and account-level 2FA enabled.
The package owner can do this setup for the contributor. No token needs to be shared. See the
[npm trust requirements](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

On npmjs.com, open each package's **Settings > Trusted publishing** and add a GitHub Actions publisher:

| Field | Value |
|---|---|
| Organization or user | `webex` |
| Repository | `widgets` |
| Workflow filename | `deploy.yml` |
| Environment | Leave empty; the current publish job has no GitHub environment |
| Allowed action | Enable **Allow npm publish** |

Configure these ten packages:

```text
@webex/widgets
@webex/cc-store
@webex/cc-components
@webex/cc-widgets
@webex/cc-station-login
@webex/cc-user-state
@webex/cc-ui-logging
@webex/cc-digital-channels
@webex/cc-ai-assistant
@webex/cc-task
```

`@webex/test-fixtures` is not published and needs no publisher entry. The release uses
`yarn npm publish --tag next`; it does not need permission for separate dist-tag commands.

Coordinate setup with the release. **Each package must complete its first successful OIDC publish
within two days after its entry is created.** Only changed packages and their dependents publish in a
run. An entry for an unchanged package can expire before that package's first release. Create it near
that release, or delete and recreate an expired entry before use. Check the exact repository and
workflow spelling. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

Keep the migration PR as a draft until its checks pass and the owner confirms the required npm
entries. Merge only when the entries for the next release are ready. Track the first successful
publish evidence in [CAI-8749](https://jira-eng-sjc12.cisco.com/jira/browse/CAI-8749).

## Local checks

Use Node from `.nvmrc` and the pinned Yarn `4.10.3`. To build and check the Contact Center archives
without publishing, run from the repository root:

```sh
yarn install --immutable
yarn workspace webex-widgets build:prod
yarn workspace webex-widgets consumer-builds:pack
yarn workspace webex-widgets consumer-builds:verify
yarn workspace @webex/cc-widgets deploy:npm --dry-run --json --access public --tag next
yarn workspace webex-widgets test:tooling --runInBand tooling/tests/yarn-oidc.js tooling/tests/consumer-build-release.js
```

Check the other selected workspaces with the same dry-run options. Inspect package names, prepared
versions, repository metadata, and resolved internal dependencies. The OIDC tooling test uses local
fixtures to check the token exchange and publishing request; it does not call GitHub or npm. A local
dry run or fixture test does not confirm the real npm trusted-publisher authorization. Use the
consumer build commands in [CONSUMER_BUILDS.md](CONSUMER_BUILDS.md) to check the packages in supported
bundlers. Rebuild with `yarn build:dev` before the full unit suite or a commit.

## First OIDC release and token removal

1. Confirm that the npm entries cover every package selected for the release. Confirm that the run
   uses `webex/widgets`, `deploy.yml`, a GitHub-hosted runner, and the pinned Yarn version.
2. Run the normal release with the long-lived npm publish token unavailable to the publish job.
   Keep the version preparation, archive checks, and consumer checks enabled.
3. Check that each selected name, version, public access setting, and `next` dist-tag is correct on
   npm. Save the successful workflow link and package results in CAI-8749. A local dry run or
   `yarn npm whoami` result is not proof of OIDC publish permission.
4. Remove obsolete Widgets publish secrets after a successful release. Revoke a shared token only
   after every repository and workflow that uses it has migrated. The npm token owner must handle
   revocation; a repository secret deletion does not revoke an npm token.

OIDC does not authenticate dependency installs. If a private dependency later requires authentication,
use a separate read-only token only in the install step. Do not pass it to publishing. The current
public dependency install needs no npm token.

## Recovery

- If npm rejects authentication, check the trusted-publisher fields, allowed publish action, expiry,
  workflow job permissions, runner, and Yarn version. The package's `repository.url` must identify
  `https://github.com/webex/widgets.git`. Ask the package maintainer to correct or recreate the npm
  entry. Do not add a publish token to bypass the failure.
- If an archive check or consumer check fails, fix the source or build issue and run the normal
  preparation and checks again. Do not skip the release gate.
- If publication fails after some packages succeed, first check which versions reached npm. Published
  versions cannot be reused. Use the normal version sync, increment, build, and consumer check path
  to prepare the next release. Do not assume that rerunning only `publish-npm` can recover a partial
  release. Release tags must follow successful publication.

Owner setup and a successful token-free OIDC release are required to complete CAI-8749. Repository
changes alone do not confirm that npm trusted publishing works.
