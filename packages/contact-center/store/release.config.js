module.exports = {
  extends: 'semantic-release-monorepo',
  branches: [
    'master', // or 'main', depending on your main branch name
    {
      name: 'eft-pipeline',
      prerelease: 'alpha', // This will trigger versions like 1.0.0-alpha.X
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
        yarnPublish: false, // Prevents publishing via Yarn (useful for Yarn workspaces)
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'], // Ensure package.json is updated
      },
    ],
    '@semantic-release/github',
  ],
  tagFormat: '${version}', // Tag format without the 'v' prefix, e.g., 1.0.0-alpha.1
};
