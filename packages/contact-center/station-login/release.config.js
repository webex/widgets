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
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          {type: 'fix', release: 'patch'},
          {type: 'feat', release: 'patch'},
          {type: 'chore', release: 'patch'},
        ],
      },
    ],
    [
      'semantic-release-yarn',
      {
        yarnPublish: false,
      },
    ],
  ],
  tagFormat: '${version}',
};
