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
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'packages/contact-center/*/package.json'],
      },
    ],
    '@semantic-release/github',
  ],
  tagFormat: '${version}',
  commitAnalyzer: {
    releaseRules: [
      {type: 'fix', release: 'patch'},
      {type: 'feat', release: 'patch'},
      {type: 'chore', release: 'patch'},
    ],
  },
  monorepo: {
    release: 'patch',
    updateVersions: true,
    skipCi: false,
    ignore: ['@webex/react-samples-app', '@webex/web-component-samples-app', '@webex/widgets', 'webex-widgets'],
  },
};
