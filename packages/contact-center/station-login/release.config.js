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
  ],
  tagFormat: '${version}',
  commitAnalyzer: {
    releaseRules: [
      {type: 'fix', release: 'patch'},
      {type: 'feat', release: 'patch'},
      {type: 'chore', release: 'patch'},
    ],
  },
};
