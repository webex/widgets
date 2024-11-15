module.exports = {
  extends: 'semantic-release-monorepo',
  branches: [
    'master',
    {
      name: 'eft-pipeline',
      prerelease: 'alpha',
    },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    [
      '@semantic-release/release-notes-generator',
      {
        writerOpts: {
          commitsSort: ['subject', 'scope'],
        },
      },
    ],
    '@semantic-release/changelog',
    [
      'semantic-release-yarn',
      {
        yarnPublish: false,
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
        tarballDir: 'dist',
        tag: 'alpha',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
      },
    ],
    '@semantic-release/github',
  ],
  tagFormat: '${version}',
};
