const path = require('path');
const crypto = require('crypto');

jest.mock('fs');
jest.mock('child_process');

const mockFs = require('fs');
const {execFileSync: mockExecFileSync} = require('child_process');
const {
  AI_SUMMARY_PACKED_WORKSPACES,
  assertNoLocalSDKProtocolsForPublish,
  assertPlainRegistrySemver,
  isPlainRegistrySemverDescriptor,
  resolutionKeyTargetsSDKPackage,
  verifyAISummaryPackages,
  versionAndPublish,
} = require('../src/publish');

const REPOSITORY_ROOT = process.cwd();
const ROOT_PACKAGE_PATH = path.join(REPOSITORY_ROOT, 'package.json');
const CONTACT_CENTER_ROOT = 'packages/contact-center';
const CONTACT_CENTER_ROOT_ABSOLUTE = path.join(REPOSITORY_ROOT, CONTACT_CENTER_ROOT);
const CLEAN_ROOT_PACKAGE = Object.freeze({name: 'webex-widgets', resolutions: {}});
const AI_SUMMARY_PACKED_PACKLIST = Object.freeze(['package/package.json', 'package/dist/index.js']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function tarballNameForWorkspace(workspaceName) {
  return `${workspaceName.replace(/^@/, '').replace(/\//g, '-')}.tgz`;
}

function workspaceTempName(workspaceName) {
  return workspaceName.replace(/^@/, '').replace(/[^a-z0-9._-]+/gi, '-');
}

function defaultAISummaryManifest(workspace) {
  return {
    name: workspace.name,
    dependencies: workspace.name === '@webex/cc-store' ? {'@webex/contact-center': '3.12.0-next.123'} : {},
  };
}

function expectedSDKDescriptors(workspaceName) {
  return workspaceName === '@webex/cc-store' ? [{mapName: 'dependencies', descriptor: '3.12.0-next.123'}] : [];
}

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(process, 'exit').mockImplementation(() => {});

function dirent(name, isDirectory = true) {
  return {name, isDirectory: () => isDirectory};
}

function packageJsonPaths(workspaceDir) {
  return [
    path.join(CONTACT_CENTER_ROOT, workspaceDir, 'package.json'),
    path.join(CONTACT_CENTER_ROOT_ABSOLUTE, workspaceDir, 'package.json'),
  ];
}

function setupWorkspaceManifests(workspaces, rootPackage = CLEAN_ROOT_PACKAGE) {
  const entries = workspaces.map(({dir}) => dirent(dir));

  mockFs.readdirSync.mockImplementation((directoryPath) => {
    const normalizedPath = String(directoryPath);
    if (
      normalizedPath === CONTACT_CENTER_ROOT ||
      normalizedPath === `./${CONTACT_CENTER_ROOT}` ||
      normalizedPath === CONTACT_CENTER_ROOT_ABSOLUTE
    ) {
      return entries;
    }
    throw new Error(`Unexpected readdirSync for ${normalizedPath}`);
  });

  mockFs.existsSync.mockImplementation((filePath) => {
    const normalizedPath = String(filePath);
    if (
      normalizedPath === ROOT_PACKAGE_PATH ||
      normalizedPath === CONTACT_CENTER_ROOT ||
      normalizedPath === `./${CONTACT_CENTER_ROOT}` ||
      normalizedPath === CONTACT_CENTER_ROOT_ABSOLUTE
    ) {
      return true;
    }
    return workspaces.some(({dir}) => packageJsonPaths(dir).includes(normalizedPath));
  });

  mockFs.readFileSync.mockImplementation((filePath) => {
    const normalizedPath = String(filePath);
    if (normalizedPath === ROOT_PACKAGE_PATH) {
      return JSON.stringify(rootPackage);
    }
    const workspace = workspaces.find(({dir}) => packageJsonPaths(dir).includes(normalizedPath));
    if (workspace) {
      return JSON.stringify(workspace.manifest);
    }
    throw new Error(`Unexpected readFileSync for ${normalizedPath}`);
  });
}

function runVersionAndPublish() {
  process.argv = ['node', 'script.js', 'main', '1.0.1'];
  versionAndPublish();
}

describe('publish boundary', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    '3.12.0-next.123',
    '^3.12.0',
    '~3.12.0',
    '>=3.12.0 <4.0.0',
    '1',
  ])('accepts plain registry SemVer descriptor %s', (descriptor) => {
    expect(isPlainRegistrySemverDescriptor(descriptor)).toBe(true);
    expect(() => assertPlainRegistrySemver(descriptor, 'sdk dependency')).not.toThrow();
  });

  it.each([
    'file:./vendor/contact-center-cc-summaries.tgz',
    'link:../contact-center',
    'portal:../contact-center',
    'workspace:*',
    './vendor/contact-center-cc-summaries.tgz',
    '../contact-center',
    '/tmp/contact-center',
    'vendor/contact-center-3.12.0.tgz',
    'contact-center-3.12.0.tgz',
    'contact-center-3.12.0.tar.gz',
    'webex/contact-center#v3.12.0',
    'https://registry.example.com/contact-center.tgz',
    'npm:3.12.0-next.123',
    'latest',
    'latest2',
    '',
    ' 3.12.0',
  ])('rejects non-registry-SemVer descriptor %s', (descriptor) => {
    expect(isPlainRegistrySemverDescriptor(descriptor)).toBe(false);
    expect(() => assertPlainRegistrySemver(descriptor, 'sdk dependency')).toThrow(
      'sdk dependency must be a plain registry SemVer descriptor'
    );
  });

  it.each([
    '@webex/contact-center',
    '@webex/contact-center@npm:3.12.0-next.123',
    '@webex/cc-store/@webex/contact-center',
    '@webex/cc-store/@webex/contact-center@npm:^3.12.0',
    '**/@webex/contact-center',
  ])('recognizes Yarn resolution key %s as targeting the SDK', (resolutionKey) => {
    expect(resolutionKeyTargetsSDKPackage(resolutionKey)).toBe(true);
  });

  it.each(['@webex/contact-center-tools', '@webex/cc-store/@webex/contact-center-tools'])(
    'does not match non-SDK resolution key %s',
    (resolutionKey) => {
      expect(resolutionKeyTargetsSDKPackage(resolutionKey)).toBe(false);
    }
  );

  it.each([
    '@webex/contact-center',
    '@webex/contact-center@npm:3.12.0-next.123',
    '@webex/cc-store/@webex/contact-center',
    '@webex/cc-store/@webex/contact-center@npm:^3.12.0',
  ])('rejects targeted root SDK resolution key %s before writes', (resolutionKey) => {
    setupWorkspaceManifests([], {
      name: 'webex-widgets',
      resolutions: {[resolutionKey]: 'file:./vendor/contact-center-cc-summaries.tgz'},
    });

    expect(() => assertNoLocalSDKProtocolsForPublish(REPOSITORY_ROOT)).toThrow(
      `root resolutions.${resolutionKey} must be a plain registry SemVer descriptor`
    );
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('ignores unrelated root resolution keys', () => {
    setupWorkspaceManifests([], {
      name: 'webex-widgets',
      resolutions: {'@webex/contact-center-tools': 'file:./vendor/contact-center-tools.tgz'},
    });

    expect(() => assertNoLocalSDKProtocolsForPublish(REPOSITORY_ROOT)).not.toThrow();
  });

  it('fails closed when the repository identity is unexpected', () => {
    setupWorkspaceManifests([], {name: 'not-webex-widgets', resolutions: {}});

    expect(() => assertNoLocalSDKProtocolsForPublish(REPOSITORY_ROOT)).toThrow(
      `publish preflight expected webex-widgets repository root at ${REPOSITORY_ROOT}; found not-webex-widgets`
    );
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe('versionAndPublish', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('Exits if we dont have enough arguments', () => {
    process.argv = ['node', 'script.js', 'main'];
    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith(
      'Error: Not enough positional arguments provided! node <relative_path_to_publish> <branchName> <nextVersion>'
    );
    expect(process.exit).toHaveBeenCalledWith(1);

    process.argv = ['node', 'script.js', '1.2.3-test.12'];
    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith(
      'Error: Not enough positional arguments provided! node <relative_path_to_publish> <branchName> <nextVersion>'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('removes stableVersion and then updates the package version', () => {
    setupWorkspaceManifests([
      {
        dir: 'test-workspace',
        manifest: {name: 'test-workspace', version: '1.0.0', stableVersion: '1.0.0'},
      },
    ]);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(
      1,
      'packages/contact-center/test-workspace/package.json',
      JSON.stringify({name: 'test-workspace', version: '1.0.0'}, null, 2),
      'utf-8'
    );
    expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(
      2,
      'packages/contact-center/test-workspace/package.json',
      JSON.stringify({name: 'test-workspace', version: '1.3.3-test.1'}, null, 2),
      'utf-8'
    );
    expect(console.log).toHaveBeenCalledWith("'stableVersion' key removed successfully.");
  });

  it('fails to write package.json after removing stableVersion', () => {
    setupWorkspaceManifests([
      {
        dir: 'test-workspace',
        manifest: {name: 'test-workspace', version: '1.0.0', stableVersion: '1.0.0'},
      },
    ]);
    mockFs.writeFileSync.mockImplementation(() => {
      throw new Error('Error while writing to file');
    });

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith(
      'Failed to process workspaces:',
      "An error occurred while removing 'stableVersion': Error while writing to file"
    );
  });

  it('skips removing stableVersion if it does not exist', () => {
    setupWorkspaceManifests([{dir: 'test-workspace', manifest: {name: 'test-workspace', version: '1.0.0'}}]);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      'packages/contact-center/test-workspace/package.json',
      expect.any(String),
      'utf-8'
    );
    expect(console.log).toHaveBeenCalledWith("'stableVersion' key does not exist in package.json.");
  });

  it('skips updateVersion if version does not exist', () => {
    setupWorkspaceManifests([{dir: 'test-workspace', manifest: {name: 'test-workspace', stableVersion: '1.0.0'}}]);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      'packages/contact-center/test-workspace/package.json',
      expect.any(String),
      'utf-8'
    );
    expect(console.log).toHaveBeenCalledWith("'version' key does not exist in package.json.");
  });

  it('fails the process if version update fails', () => {
    setupWorkspaceManifests([
      {
        dir: 'test-workspace',
        manifest: {name: 'test-workspace', stableVersion: '1.0.0', version: '1.0.0'},
      },
    ]);
    mockFs.writeFileSync
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('Error while writing to file');
      });

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith(
      'Failed to process workspaces:',
      "An error occurred while updating 'version': Error while writing to file"
    );
  });

  it('updates the version for all packages and then publishes the package.', () => {
    setupWorkspaceManifests([
      {dir: 'store', manifest: {name: '@webex/cc-store', version: '1.0.0'}},
      {dir: 'station-login', manifest: {name: '@webex/cc-station-login', version: '1.0.0'}},
    ]);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    runVersionAndPublish();

    expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(
      1,
      'packages/contact-center/store/package.json',
      expect.any(String),
      'utf-8'
    );
    expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(
      2,
      'packages/contact-center/station-login/package.json',
      expect.any(String),
      'utf-8'
    );
    expect(mockExecFileSync).toHaveBeenNthCalledWith(
      1,
      'yarn',
      ['workspace', '@webex/cc-store', 'npm', 'publish', '--tag', 'main'],
      {stdio: 'inherit'}
    );
    expect(mockExecFileSync).toHaveBeenNthCalledWith(
      2,
      'yarn',
      ['workspace', '@webex/cc-station-login', 'npm', 'publish', '--tag', 'main'],
      {stdio: 'inherit'}
    );
  });

  it('should not publish packages in deny list P.S we only have test-fixtures in deny list right now', () => {
    setupWorkspaceManifests([
      {dir: 'test-fixtures', manifest: {name: '@webex/test-fixtures', version: '1.0.0'}},
      {dir: 'station-login', manifest: {name: '@webex/cc-station-login', version: '1.0.0'}},
    ]);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    runVersionAndPublish();

    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'yarn',
      ['workspace', '@webex/test-fixtures', 'npm', 'publish', '--tag', 'main'],
      {stdio: 'inherit'}
    );
    expect(mockExecFileSync).toHaveBeenNthCalledWith(
      1,
      'yarn',
      ['workspace', '@webex/cc-station-login', 'npm', 'publish', '--tag', 'main'],
      {stdio: 'inherit'}
    );
  });

  it('error occurred while reading package.json data', () => {
    setupWorkspaceManifests([{dir: 'store', manifest: {name: '@webex/cc-store', version: '1.0.0'}}]);
    mockFs.readFileSync.mockImplementation((filePath) => {
      if (String(filePath) === ROOT_PACKAGE_PATH) {
        return JSON.stringify(CLEAN_ROOT_PACKAGE);
      }
      throw new Error('Error while reading from file');
    });

    runVersionAndPublish();

    expect(console.error).toHaveBeenCalledWith('Failed to process workspaces:', 'Error while reading from file');
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('WF-02: rejects a malicious branchName containing shell metacharacters', () => {
    setupWorkspaceManifests([{dir: 'store', manifest: {name: '@webex/cc-store', version: '1.0.0'}}]);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    process.argv = ['node', 'script.js', 'main; rm -rf /', '1.0.1'];
    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error'));
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('WF-01: rejects a workspace name containing shell metacharacters', () => {
    setupWorkspaceManifests([{dir: 'store', manifest: {name: '@webex/cc-store$(malicious)', version: '1.0.0'}}]);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    runVersionAndPublish();

    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining(['@webex/cc-store$(malicious)']),
      expect.anything()
    );
  });

  it('should export versionAndPublish when required as a module', () => {
    jest.resetModules();
    const script = require('../src/publish');

    expect(script).toHaveProperty('versionAndPublish');
  });

  it.each([
    'file:./vendor/contact-center-cc-summaries.tgz',
    'link:../contact-center',
    'portal:../contact-center',
    'workspace:*',
    './vendor/contact-center-cc-summaries.tgz',
    '../contact-center',
    '/tmp/contact-center',
    'vendor/contact-center-3.12.0.tgz',
    'webex/contact-center#v3.12.0',
    'latest2',
    'https://registry.example.com/contact-center.tgz',
  ])('aborts before writing or publishing for forbidden root SDK resolution %s', (descriptor) => {
    setupWorkspaceManifests(
      [{dir: 'store', manifest: {name: '@webex/cc-store', version: '1.0.0'}}],
      {name: 'webex-widgets', resolutions: {'@webex/contact-center': descriptor}}
    );
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    runVersionAndPublish();

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it.each([
    'file:../../../vendor/contact-center-cc-summaries.tgz',
    'link:../contact-center',
    'portal:../contact-center',
    'workspace:*',
    './vendor/contact-center-cc-summaries.tgz',
    '../contact-center',
    '/tmp/contact-center',
    'vendor/contact-center-3.12.0.tgz',
    'webex/contact-center#v3.12.0',
    'latest2',
    'https://registry.example.com/contact-center.tgz',
  ])('aborts before writing or publishing for forbidden cc manifest SDK descriptor %s', (descriptor) => {
    setupWorkspaceManifests([
      {
        dir: 'store',
        manifest: {
          name: '@webex/cc-store',
          version: '1.0.0',
          dependencies: {'@webex/contact-center': descriptor},
        },
      },
    ]);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockExecFileSync.mockImplementation(() => {});

    runVersionAndPublish();

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('Throw error if there is no package.json', () => {
    mockFs.readdirSync.mockReturnValue([dirent('store'), dirent('station-login')]);
    mockFs.existsSync.mockImplementation((filePath) => {
      const normalizedPath = String(filePath);
      return (
        normalizedPath === ROOT_PACKAGE_PATH ||
        normalizedPath === CONTACT_CENTER_ROOT ||
        normalizedPath === `./${CONTACT_CENTER_ROOT}` ||
        normalizedPath === CONTACT_CENTER_ROOT_ABSOLUTE
      );
    });
    mockFs.readFileSync.mockImplementation((filePath) => {
      if (String(filePath) === ROOT_PACKAGE_PATH) {
        return JSON.stringify(CLEAN_ROOT_PACKAGE);
      }
      throw new Error('Error while reading from file');
    });

    runVersionAndPublish();

    expect(console.error).toHaveBeenCalledWith('Failed to process workspaces:', 'package.json not found in store');
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});

describe('verifyAISummaryPackages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFs.mkdtempSync.mockImplementation((prefix) =>
      String(prefix).includes('.ai-summary-pack-stage-')
        ? '/repo/.matrix/results/prog-mini-js/release/.ai-summary-pack-stage-xyz'
        : '/tmp/ai-summary-pack-abc'
    );
    mockFs.mkdirSync.mockImplementation(() => {});
    mockFs.copyFileSync.mockImplementation(() => {});
    mockFs.rmSync.mockImplementation(() => {});
    mockFs.renameSync.mockImplementation(() => {});
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.existsSync.mockReturnValue(true);
    mockExecFileSync.mockImplementation((command, args) => {
      if (command === 'tar' && args[0] === '-tf') {
        return 'package/package.json\npackage/dist/index.js\n';
      }
      return '';
    });
  });

  function setupPackReads(config = {}) {
    const normalizedConfig = typeof config === 'function' ? {packedManifestForWorkspace: config} : config;
    const {
      sourceManifestForWorkspace = defaultAISummaryManifest,
      packedManifestForWorkspace = defaultAISummaryManifest,
    } = normalizedConfig;

    mockFs.readFileSync.mockImplementation((filePath) => {
      const normalizedPath = String(filePath);
      const sourceWorkspace = AI_SUMMARY_PACKED_WORKSPACES.find((workspace) =>
        normalizedPath === path.join('/repo', workspace.packagePath)
      );
      if (sourceWorkspace) {
        return JSON.stringify(sourceManifestForWorkspace(sourceWorkspace));
      }

      const packedWorkspace = AI_SUMMARY_PACKED_WORKSPACES.find((workspace) =>
        normalizedPath.includes(`${workspaceTempName(workspace.name)}-extract`)
      );
      if (packedWorkspace && normalizedPath.endsWith(path.join('package', 'package.json'))) {
        return JSON.stringify(packedManifestForWorkspace(packedWorkspace));
      }

      if (normalizedPath.startsWith('/tmp/ai-summary-pack-abc/') && normalizedPath.endsWith('.tgz')) {
        return `tarball:${path.basename(normalizedPath)}`;
      }

      if (normalizedPath.startsWith('/repo/.matrix/results/prog-mini-js/release/packages/')) {
        return `tarball:${path.basename(normalizedPath)}`;
      }

      throw new Error(`Unexpected readFileSync for ${normalizedPath}`);
    });
  }

  it('packs AI Summary workspaces and records validated SDK descriptors', () => {
    setupPackReads();

    const receipt = verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'});
    const expectedWorkspaces = AI_SUMMARY_PACKED_WORKSPACES.map((workspace) => {
      const manifestBytes = JSON.stringify(defaultAISummaryManifest(workspace));
      const tarballName = tarballNameForWorkspace(workspace.name);
      const descriptors = expectedSDKDescriptors(workspace.name);

      return {
        name: workspace.name,
        packagePath: workspace.packagePath,
        sourceManifestSha256: sha256(manifestBytes),
        tarballPath: `.matrix/results/prog-mini-js/release/packages/${tarballName}`,
        tarballSha256: sha256(`tarball:${tarballName}`),
        packedManifestSha256: sha256(manifestBytes),
        contactCenterDescriptors: descriptors,
        sourceContactCenterDescriptors: descriptors,
        packlist: AI_SUMMARY_PACKED_PACKLIST,
      };
    });

    expect(receipt).toEqual({
      schemaVersion: 1,
      kind: 'ai-summary-packed-workspaces',
      generatedAt: expect.any(String),
      workspaces: expectedWorkspaces,
    });
    expect(new Date(receipt.generatedAt).toISOString()).toBe(receipt.generatedAt);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'corepack',
      ['yarn', 'workspace', '@webex/cc-store', 'pack', '--out', '/tmp/ai-summary-pack-abc/webex-cc-store.tgz'],
      {cwd: '/repo', stdio: 'ignore', env: expect.objectContaining({CI: '1'})}
    );
    expect(mockFs.copyFileSync).toHaveBeenCalledTimes(AI_SUMMARY_PACKED_WORKSPACES.length);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      '/repo/.matrix/results/prog-mini-js/release/.ai-summary-pack-stage-xyz/ai-summary.json',
      `${JSON.stringify(receipt, null, 2)}\n`,
      'utf-8'
    );
    expect(mockFs.renameSync).toHaveBeenCalledWith(
      '/repo/.matrix/results/prog-mini-js/release/.ai-summary-pack-stage-xyz/packages',
      '/repo/.matrix/results/prog-mini-js/release/packages'
    );
    expect(mockFs.renameSync).toHaveBeenCalledWith(
      '/repo/.matrix/results/prog-mini-js/release/.ai-summary-pack-stage-xyz/ai-summary.json',
      '/repo/receipts/ai-summary.json'
    );
  });

  it('requires an explicit receipt path before creating a transaction', () => {
    expect(() => verifyAISummaryPackages({repositoryRoot: '/repo'})).toThrow(
      'verify-ai-summary-packages requires --receipt'
    );
    expect(mockFs.mkdtempSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('strips ambient Yarn and Corepack configuration from every pack child', () => {
    setupPackReads();
    const keys = ['YARN_PROJECT_CWD', 'YARN_IGNORE_PATH', 'COREPACK_ENABLE_PROJECT_SPEC', 'npm_config_user_agent'];
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    try {
      for (const key of keys) process.env[key] = 'contaminated-test-setting';
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'});
      const packs = mockExecFileSync.mock.calls.filter(([command]) => command === 'corepack');
      expect(packs).toHaveLength(6);
      for (const [, , options] of packs) {
        expect(options.env.CI).toBe('1');
        for (const key of keys) expect(options.env[key]).toBeUndefined();
      }
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });

  it('rejects workspace identity mismatch before publishing artifacts', () => {
    setupPackReads({
      sourceManifestForWorkspace: (workspace) => ({
        ...defaultAISummaryManifest(workspace),
        name: `${workspace.name}-wrong`,
      }),
    });

    expect(() =>
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'})
    ).toThrow('Workspace identity mismatch for packages/contact-center/store/package.json');
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects packed workspace identity mismatch before publishing artifacts', () => {
    setupPackReads({
      packedManifestForWorkspace: (workspace) => ({
        ...defaultAISummaryManifest(workspace),
        name: `${workspace.name}-wrong`,
      }),
    });

    expect(() =>
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'})
    ).toThrow('Packed workspace identity mismatch for @webex/cc-store');
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects a local SDK descriptor in a source manifest before publishing artifacts', () => {
    setupPackReads({
      sourceManifestForWorkspace: (workspace) => ({
        ...defaultAISummaryManifest(workspace),
        dependencies:
          workspace.name === '@webex/cc-store'
            ? {'@webex/contact-center': 'file:./vendor/contact-center-cc-summaries.tgz'}
            : {},
      }),
    });

    expect(() =>
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'})
    ).toThrow(
      '@webex/cc-store source manifest dependencies @webex/contact-center must be a plain registry SemVer descriptor'
    );
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects a non-registry-SemVer SDK descriptor in a packed manifest', () => {
    setupPackReads((workspace) => ({
      name: workspace.name,
      dependencies:
        workspace.name === '@webex/cc-store'
          ? {'@webex/contact-center': 'vendor/contact-center-3.12.0.tgz'}
          : {},
    }));

    expect(() =>
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'})
    ).toThrow('@webex/cc-store packed manifest dependencies @webex/contact-center must be a plain registry SemVer descriptor');
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects packed SDK descriptor drift before publishing artifacts', () => {
    setupPackReads((workspace) => ({
      name: workspace.name,
      dependencies: workspace.name === '@webex/cc-store' ? {'@webex/contact-center': '^3.12.0'} : {},
    }));

    expect(() =>
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'})
    ).toThrow('@webex/cc-store packed SDK descriptors must match source manifest');
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects any vendored archive or vendor segment in a packlist', () => {
    setupPackReads();
    mockExecFileSync.mockImplementation((command, args) => {
      if (command === 'tar' && args[0] === '-tf') {
        return 'package/package.json\npackage/vendor/renamed-sdk.tgz\n';
      }
      return '';
    });

    expect(() =>
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'})
    ).toThrow('@webex/cc-store packlist contains a vendored archive or vendor segment');
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects a tarball with no packed manifest before publishing artifacts', () => {
    setupPackReads();
    mockFs.existsSync.mockImplementation((filePath) => {
      const normalizedPath = String(filePath);
      if (
        normalizedPath.includes(`${workspaceTempName('@webex/cc-store')}-extract`) &&
        normalizedPath.endsWith(path.join('package', 'package.json'))
      ) {
        return false;
      }
      return true;
    });

    expect(() =>
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'})
    ).toThrow('Packed manifest missing from /tmp/ai-summary-pack-abc/webex-cc-store.tgz');
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('propagates child process failures before publishing artifacts and cleans the transaction root', () => {
    setupPackReads();
    mockExecFileSync.mockImplementation((command) => {
      if (command === 'corepack') {
        throw new Error('pack subprocess failed');
      }
      return '';
    });

    expect(() =>
      verifyAISummaryPackages({repositoryRoot: '/repo', receiptPath: 'receipts/ai-summary.json'})
    ).toThrow('pack subprocess failed');
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockFs.rmSync).toHaveBeenCalledWith('/tmp/ai-summary-pack-abc', {recursive: true, force: true});
  });
});

describe('verifyAISummaryPackages atomic promotion', () => {
  const realFs = jest.requireActual('fs');
  const realOs = jest.requireActual('os');
  const realPath = jest.requireActual('path');
  const realChildProcess = jest.requireActual('child_process');
  const realCrypto = jest.requireActual('crypto');
  const roots = [];

  function realWriteJson(root, relativePath, value) {
    const absolutePath = realPath.join(root, relativePath);
    realFs.mkdirSync(realPath.dirname(absolutePath), {recursive: true});
    realFs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
  }

  function createPackedTarball(tarballPath, manifest) {
    const packRoot = realFs.mkdtempSync(realPath.join(realOs.tmpdir(), 'publish-pack-fixture-'));
    try {
      realFs.mkdirSync(realPath.join(packRoot, 'package/dist'), {recursive: true});
      realFs.writeFileSync(realPath.join(packRoot, 'package/package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
      realFs.writeFileSync(realPath.join(packRoot, 'package/dist/index.js'), 'module.exports = {};\n');
      realFs.mkdirSync(realPath.dirname(tarballPath), {recursive: true});
      realChildProcess.execFileSync('tar', ['-czf', tarballPath, '-C', packRoot, 'package']);
    } finally {
      realFs.rmSync(packRoot, {recursive: true, force: true});
    }
  }

  function snapshotTree(root) {
    const files = {};
    const walk = (directory) => {
      if (!realFs.existsSync(directory)) {
        return;
      }
      for (const name of realFs.readdirSync(directory).sort()) {
        const absolutePath = realPath.join(directory, name);
        const stat = realFs.lstatSync(absolutePath);
        if (stat.isDirectory()) {
          walk(absolutePath);
        } else if (stat.isFile()) {
          files[realPath.relative(root, absolutePath).split(realPath.sep).join('/')] = realCrypto
            .createHash('sha256')
            .update(realFs.readFileSync(absolutePath))
            .digest('hex');
        }
      }
    };
    walk(root);
    return files;
  }

  function writeWorkspaceManifests(root) {
    const manifestsByName = new Map();
    for (const workspace of AI_SUMMARY_PACKED_WORKSPACES) {
      const manifest = {
        ...defaultAISummaryManifest(workspace),
        version: '1.0.0',
      };
      manifestsByName.set(workspace.name, manifest);
      realWriteJson(root, workspace.packagePath, manifest);
    }
    return manifestsByName;
  }

  function createPackingExec(manifestsByName, options = {}) {
    let packCalls = 0;
    return jest.fn((command, args, execOptions) => {
      if (command === 'corepack') {
        packCalls += 1;
        if (packCalls === options.failOnPackCall) {
          throw new Error(options.failureMessage || 'workspace pack failed');
        }
        const workspaceName = args[2];
        const outputPath = args[args.indexOf('--out') + 1];
        createPackedTarball(outputPath, manifestsByName.get(workspaceName));
        return '';
      }
      return realChildProcess.execFileSync(command, args, execOptions);
    });
  }

  function loadPublishWithRealDependencies({fsImpl = realFs, execFileSync = realChildProcess.execFileSync} = {}) {
    jest.resetModules();
    jest.doMock('fs', () => fsImpl);
    jest.doMock('child_process', () => ({...realChildProcess, execFileSync}));
    return require('../src/publish');
  }

  function readTarEntries(tarballPath) {
    return realChildProcess
      .execFileSync('tar', ['-tf', tarballPath], {encoding: 'utf-8'})
      .split(/\r?\n/)
      .filter(Boolean);
  }

  afterEach(() => {
    for (const root of roots.splice(0)) {
      realFs.rmSync(root, {recursive: true, force: true});
    }
    jest.dontMock('fs');
    jest.dontMock('child_process');
    jest.resetModules();
  });

  it('publishes a valid six-workspace package set with hashed manifests, packlists, tarballs, and receipt', () => {
    const root = realFs.mkdtempSync(realPath.join(realOs.tmpdir(), 'publish-success-'));
    roots.push(root);
    const manifestsByName = writeWorkspaceManifests(root);
    const packagesRoot = realPath.join(root, '.matrix/results/prog-mini-js/release/packages');
    const receiptPath = realPath.join(root, '.matrix/results/prog-mini-js/release/ai-summary-packed-workspaces.json');
    const execFileSync = createPackingExec(manifestsByName);
    const {verifyAISummaryPackages: realVerifyAISummaryPackages} = loadPublishWithRealDependencies({
      execFileSync,
    });

    const receipt = realVerifyAISummaryPackages({repositoryRoot: root, receiptPath, execFileSync});
    const writtenReceipt = JSON.parse(realFs.readFileSync(receiptPath, 'utf-8'));

    expect(writtenReceipt).toEqual(receipt);
    expect(receipt).toEqual({
      schemaVersion: 1,
      kind: 'ai-summary-packed-workspaces',
      generatedAt: expect.any(String),
      workspaces: expect.any(Array),
    });
    expect(receipt.workspaces).toHaveLength(AI_SUMMARY_PACKED_WORKSPACES.length);

    for (const [index, entry] of receipt.workspaces.entries()) {
      const workspace = AI_SUMMARY_PACKED_WORKSPACES[index];
      const sourceManifestPath = realPath.join(root, workspace.packagePath);
      const sourceManifestBytes = realFs.readFileSync(sourceManifestPath);
      const tarballPath = realPath.join(root, entry.tarballPath);
      const extractRoot = realFs.mkdtempSync(realPath.join(realOs.tmpdir(), 'publish-verify-pack-'));
      roots.push(extractRoot);

      expect(entry.name).toBe(workspace.name);
      expect(entry.packagePath).toBe(workspace.packagePath);
      expect(entry.sourceManifestSha256).toBe(sha256(sourceManifestBytes));
      expect(entry.tarballPath).toBe(
        `.matrix/results/prog-mini-js/release/packages/${tarballNameForWorkspace(workspace.name)}`
      );
      expect(realPath.dirname(tarballPath)).toBe(packagesRoot);
      expect(entry.tarballSha256).toBe(sha256(realFs.readFileSync(tarballPath)));
      expect(entry.packlist).toEqual(readTarEntries(tarballPath));
      expect(entry.packlist).toEqual(expect.arrayContaining(AI_SUMMARY_PACKED_PACKLIST));
      expect(entry.sourceContactCenterDescriptors).toEqual(expectedSDKDescriptors(workspace.name));
      expect(entry.contactCenterDescriptors).toEqual(expectedSDKDescriptors(workspace.name));

      realChildProcess.execFileSync('tar', ['-xzf', tarballPath, '-C', extractRoot], {stdio: 'ignore'});
      const packedManifestBytes = realFs.readFileSync(realPath.join(extractRoot, 'package/package.json'));
      expect(entry.packedManifestSha256).toBe(sha256(packedManifestBytes));
      expect(JSON.parse(packedManifestBytes).name).toBe(workspace.name);
    }
  });

  it('leaves the old package directory and receipt byte-identical when workspace four fails', () => {
    const root = realFs.mkdtempSync(realPath.join(realOs.tmpdir(), 'publish-atomic-'));
    roots.push(root);
    const manifestsByName = writeWorkspaceManifests(root);

    const packagesRoot = realPath.join(root, '.matrix/results/prog-mini-js/release/packages');
    const receiptPath = realPath.join(root, '.matrix/results/prog-mini-js/release/ai-summary-packed-workspaces.json');
    realFs.mkdirSync(packagesRoot, {recursive: true});
    realFs.writeFileSync(realPath.join(packagesRoot, 'old-one.tgz'), 'old-one');
    realFs.writeFileSync(realPath.join(packagesRoot, 'stale-extra.tgz'), 'stale-extra');
    realFs.mkdirSync(realPath.dirname(receiptPath), {recursive: true});
    realFs.writeFileSync(receiptPath, '{"old":true}\n');
    const beforePackages = snapshotTree(packagesRoot);
    const beforeReceipt = realFs.readFileSync(receiptPath);
    const execFileSync = createPackingExec(manifestsByName, {
      failOnPackCall: 4,
      failureMessage: 'workspace four failed',
    });
    const {verifyAISummaryPackages: realVerifyAISummaryPackages} = loadPublishWithRealDependencies({
      execFileSync,
    });

    expect(() =>
      realVerifyAISummaryPackages({repositoryRoot: root, receiptPath, execFileSync})
    ).toThrow('workspace four failed');
    expect(snapshotTree(packagesRoot)).toEqual(beforePackages);
    expect(realFs.readFileSync(receiptPath).equals(beforeReceipt)).toBe(true);
  });

  it('rolls back the old package directory and receipt when receipt promotion fails after package replacement', () => {
    const root = realFs.mkdtempSync(realPath.join(realOs.tmpdir(), 'publish-promotion-failure-'));
    roots.push(root);
    const manifestsByName = writeWorkspaceManifests(root);
    const packagesRoot = realPath.join(root, '.matrix/results/prog-mini-js/release/packages');
    const receiptPath = realPath.join(root, '.matrix/results/prog-mini-js/release/ai-summary-packed-workspaces.json');
    realFs.mkdirSync(packagesRoot, {recursive: true});
    realFs.writeFileSync(realPath.join(packagesRoot, 'old-one.tgz'), 'old-one');
    realFs.writeFileSync(realPath.join(packagesRoot, 'stale-extra.tgz'), 'stale-extra');
    realFs.mkdirSync(realPath.dirname(receiptPath), {recursive: true});
    realFs.writeFileSync(receiptPath, '{"old":true}\n');
    const beforePackages = snapshotTree(packagesRoot);
    const beforeReceipt = realFs.readFileSync(receiptPath);
    const execFileSync = createPackingExec(manifestsByName);
    const fsWithFailingReceiptRename = Object.create(realFs);
    const renameSync = jest.fn((from, to) => {
      if (String(from).endsWith(realPath.basename(receiptPath)) && to === receiptPath) {
        throw new Error('receipt promotion failed');
      }
      return realFs.renameSync(from, to);
    });
    fsWithFailingReceiptRename.renameSync = renameSync;
    const {verifyAISummaryPackages: realVerifyAISummaryPackages} = loadPublishWithRealDependencies({
      fsImpl: fsWithFailingReceiptRename,
      execFileSync,
    });

    expect(() =>
      realVerifyAISummaryPackages({repositoryRoot: root, receiptPath, execFileSync})
    ).toThrow('receipt promotion failed');
    expect(renameSync).toHaveBeenCalledWith(expect.stringContaining('/packages'), packagesRoot);
    expect(snapshotTree(packagesRoot)).toEqual(beforePackages);
    expect(realFs.readFileSync(receiptPath).equals(beforeReceipt)).toBe(true);
  });
});
