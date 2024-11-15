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
      'semantic-release-yarn',
      {
        yarnPublish: false,
      },
    ],
  ],
  tagFormat: '${version}',
};
