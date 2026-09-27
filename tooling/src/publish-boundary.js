const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const semver = require('semver');
const {isDeepStrictEqual} = require('util');

const SDK_PACKAGE_NAME = '@webex/contact-center';
const EXPECTED_REPOSITORY_NAME = 'webex-widgets';
const CONTACT_CENTER_PACKAGE_ROOT = 'packages/contact-center';
const SDK_DESCRIPTOR_MAPS = Object.freeze(['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']);
const NON_REGISTRY_SEMVER_DESCRIPTOR_RE = /(?:[a-z][a-z0-9+.-]*:|[/\\#]|\.(?:tgz|tar\.gz)(?:$|[?#]))/i;
const SDK_TARBALL_RELATIVE_PATH = 'vendor/contact-center-cc-summaries.tgz';
const AI_SUMMARY_PACKED_WORKSPACES = Object.freeze([
  Object.freeze({name: '@webex/cc-store', packagePath: 'packages/contact-center/store/package.json'}),
  Object.freeze({name: '@webex/cc-components', packagePath: 'packages/contact-center/cc-components/package.json'}),
  Object.freeze({name: '@webex/cc-task', packagePath: 'packages/contact-center/task/package.json'}),
  Object.freeze({name: '@webex/cc-ai-assistant', packagePath: 'packages/contact-center/ai-assistant/package.json'}),
  Object.freeze({name: '@webex/cc-widgets', packagePath: 'packages/contact-center/cc-widgets/package.json'}),
  Object.freeze({name: '@webex/test-fixtures', packagePath: 'packages/contact-center/test-fixtures/package.json'}),
]);
const ARCHIVE_PACKLIST_RE = /\.(?:tgz|tar\.gz|tar)$/i;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function parseJsonBytes(bytes, context) {
  try {
    return JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString('utf-8') : String(bytes));
  } catch (error) {
    throw new Error(`${context} must contain valid JSON`);
  }
}

function assertInsideRoot(repositoryRoot, relativePath, context) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new Error(`${context} must be a non-empty path`);
  }
  const root = path.resolve(repositoryRoot);
  const absolutePath = path.isAbsolute(relativePath)
    ? path.resolve(relativePath)
    : path.resolve(root, relativePath);
  const relative = path.relative(root, absolutePath);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${context} escapes repository root`);
  }
  return absolutePath;
}

function sortedDescriptorMaps(descriptors) {
  return descriptors
    .map(({mapName, descriptor}) => ({mapName, descriptor}))
    .sort((left, right) => SDK_DESCRIPTOR_MAPS.indexOf(left.mapName) - SDK_DESCRIPTOR_MAPS.indexOf(right.mapName));
}

function isPlainRegistrySemverDescriptor(descriptor) {
  return (
    typeof descriptor === 'string' &&
    descriptor.trim() === descriptor &&
    descriptor.length > 0 &&
    !NON_REGISTRY_SEMVER_DESCRIPTOR_RE.test(descriptor) &&
    semver.validRange(descriptor, {loose: false}) !== null
  );
}

function assertPlainRegistrySemver(descriptor, context) {
  if (!isPlainRegistrySemverDescriptor(descriptor)) {
    throw new Error(`${context} must be a plain registry SemVer descriptor`);
  }
}

function collectSDKDescriptors(packageJson) {
  const descriptors = [];
  for (const mapName of SDK_DESCRIPTOR_MAPS) {
    const descriptor = packageJson[mapName]?.[SDK_PACKAGE_NAME];
    if (descriptor !== undefined) {
      descriptors.push({mapName, descriptor});
    }
  }
  return descriptors;
}

function assertSoleSDKWorkspaceDependency(repositoryRoot) {
  const rootManifest = readJson(path.join(repositoryRoot, 'package.json'));
  if (collectSDKDescriptors(rootManifest).length) {
    throw new Error('Only @webex/cc-store may directly declare the Contact Center SDK; root may use its private resolution');
  }
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      if (entry.isDirectory() && !['node_modules', 'dist', '.git', '.yarn'].includes(entry.name)) {
        visit(path.join(directory, entry.name));
      } else if (entry.isFile() && entry.name === 'package.json') {
        const manifestPath = path.join(directory, entry.name);
        const relative = toPosix(path.relative(repositoryRoot, manifestPath));
        const descriptors = collectSDKDescriptors(readJson(manifestPath));
        for (const {mapName, descriptor} of descriptors) {
          assertPlainRegistrySemver(descriptor, `${relative} ${mapName} ${SDK_PACKAGE_NAME}`);
        }
        // Sample hosts initialize their own authenticated SDK session. The
        // production widget boundary does not prohibit that existing bootstrap.
        if (relative.startsWith('packages/') && relative !== 'packages/contact-center/store/package.json' && descriptors.length) {
          throw new Error('Only @webex/cc-store may directly declare the SDK within production packages');
        }
      }
    }
  };
  visit(path.join(repositoryRoot, 'packages'));
  visit(path.join(repositoryRoot, 'widgets-samples'));
}

function assertPublishableSDKDescriptors(packageJson, context) {
  const descriptors = collectSDKDescriptors(packageJson);
  for (const {mapName, descriptor} of descriptors) {
    assertPlainRegistrySemver(descriptor, `${context} ${mapName} ${SDK_PACKAGE_NAME}`);
  }
  return sortedDescriptorMaps(descriptors);
}

function resolutionKeyTargetsSDKPackage(resolutionKey) {
  if (typeof resolutionKey !== 'string') {
    return false;
  }
  return (
    resolutionKey === SDK_PACKAGE_NAME ||
    resolutionKey.startsWith(`${SDK_PACKAGE_NAME}@`) ||
    resolutionKey.endsWith(`/${SDK_PACKAGE_NAME}`) ||
    resolutionKey.includes(`/${SDK_PACKAGE_NAME}@`)
  );
}

function collectSDKResolutions(resolutions) {
  if (!resolutions || typeof resolutions !== 'object') {
    return [];
  }
  return Object.entries(resolutions)
    .filter(([resolutionKey]) => resolutionKeyTargetsSDKPackage(resolutionKey))
    .map(([resolutionKey, descriptor]) => ({resolutionKey, descriptor}));
}

function assertNoSDKTargetingResolutions(packageJson, context) {
  const resolutions = collectSDKResolutions(packageJson.resolutions);
  if (resolutions.length > 0) {
    throw new Error(`${context} must not contain ${SDK_PACKAGE_NAME} resolutions`);
  }
}

function assertSDKDescriptorMapsMatch(sourceManifest, packedManifest, context) {
  const sourceDescriptors = assertPublishableSDKDescriptors(sourceManifest, `${context} source manifest`);
  const packedDescriptors = assertPublishableSDKDescriptors(packedManifest, `${context} packed manifest`);
  if (!isDeepStrictEqual(packedDescriptors, sourceDescriptors)) {
    throw new Error(`${context} packed SDK descriptors must match source manifest`);
  }
  if (sourceManifest.name === '@webex/cc-store' && sourceDescriptors.length === 0) {
    throw new Error(`${context} source manifest must declare ${SDK_PACKAGE_NAME}`);
  }
  return {sourceDescriptors, packedDescriptors};
}

function normalizePacklistEntry(entry, context) {
  if (typeof entry !== 'string' || entry.length === 0 || entry.includes('\\')) {
    throw new Error(`${context} packlist contains an unsafe path`);
  }
  const withoutTrailingSlash = entry.replace(/\/+$/, '');
  const normalized = path.posix.normalize(withoutTrailingSlash);
  if (
    normalized !== withoutTrailingSlash ||
    normalized === '.' ||
    normalized.startsWith('/') ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    throw new Error(`${context} packlist contains an unsafe path`);
  }
  return normalized;
}

function packlistEntryHasVendorSegment(entry) {
  return entry.split('/').includes('vendor');
}

function assertNoVendoredPacklistEntries(packlist, context) {
  if (!Array.isArray(packlist) || packlist.length === 0) {
    throw new Error(`${context} packlist must be present`);
  }
  const seen = new Set();
  for (const entry of packlist) {
    const normalized = normalizePacklistEntry(entry, context);
    if (seen.has(normalized)) {
      throw new Error(`${context} packlist contains duplicate paths`);
    }
    seen.add(normalized);
    if (ARCHIVE_PACKLIST_RE.test(normalized) || packlistEntryHasVendorSegment(normalized)) {
      throw new Error(`${context} packlist contains a vendored archive or vendor segment`);
    }
  }
}

function tarballNameForWorkspace(workspaceName) {
  return `${workspaceName.replace(/^@/, '').replace(/\//g, '-')}.tgz`;
}

function workspaceTempName(workspaceName) {
  return workspaceName.replace(/^@/, '').replace(/[^a-z0-9._-]+/gi, '-');
}

function listTarEntries(tarballPath, execFileSyncImpl = childProcess.execFileSync) {
  const output = execFileSyncImpl('tar', ['-tf', tarballPath], {encoding: 'utf-8'});
  return output.split(/\r?\n/).filter(Boolean);
}

function extractPackedManifest(tarballPath, extractRoot, execFileSyncImpl = childProcess.execFileSync) {
  fs.mkdirSync(extractRoot, {recursive: true});
  execFileSyncImpl('tar', ['-xzf', tarballPath, '-C', extractRoot], {stdio: 'ignore'});
  const manifestPath = path.join(extractRoot, 'package', 'package.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Packed manifest missing from ${tarballPath}`);
  }
  const manifestBytes = fs.readFileSync(manifestPath);
  return {
    manifest: parseJsonBytes(manifestBytes, `${tarballPath} package/package.json`),
    manifestBytes,
  };
}

function assertAISummaryWorkspaceConfig(workspaces = AI_SUMMARY_PACKED_WORKSPACES) {
  if (!Array.isArray(workspaces) || workspaces.length !== AI_SUMMARY_PACKED_WORKSPACES.length) {
    throw new Error('AI Summary packed boundary must contain exactly six workspaces');
  }
  const expectedByName = new Map(AI_SUMMARY_PACKED_WORKSPACES.map((workspace) => [workspace.name, workspace.packagePath]));
  const seenNames = new Set();
  const seenPaths = new Set();
  for (const workspace of workspaces) {
    if (!workspace || typeof workspace.name !== 'string' || typeof workspace.packagePath !== 'string') {
      throw new Error('AI Summary packed boundary workspace entry is invalid');
    }
    if (seenNames.has(workspace.name) || seenPaths.has(workspace.packagePath)) {
      throw new Error('AI Summary packed boundary workspace entries must be unique');
    }
    seenNames.add(workspace.name);
    seenPaths.add(workspace.packagePath);
    if (expectedByName.get(workspace.name) !== workspace.packagePath) {
      throw new Error(`AI Summary packed boundary has unexpected workspace ${workspace.name}`);
    }
  }
}

function inspectPackedWorkspaceBoundary({repositoryRoot, workspace, transactionRoot, execFileSyncImpl}) {
  const sourceManifestPath = assertInsideRoot(repositoryRoot, workspace.packagePath, `${workspace.name} packagePath`);
  const sourceManifestBytes = fs.readFileSync(sourceManifestPath);
  const sourceManifest = parseJsonBytes(sourceManifestBytes, `${workspace.name} source manifest`);
  if (sourceManifest.name !== workspace.name) {
    throw new Error(`Workspace identity mismatch for ${workspace.packagePath}`);
  }
  assertNoSDKTargetingResolutions(sourceManifest, `${workspace.name} source manifest`);

  const tarballName = tarballNameForWorkspace(workspace.name);
  const tempTarballPath = path.join(transactionRoot, tarballName);
  const env = {CI: '1'};
  // Yarn workspace scripts inject project/package-manager settings. Do not let
  // those settings redirect Corepack or change the package being packed.
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'USER', 'LOGNAME', 'SHELL', 'COREPACK_HOME']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  execFileSyncImpl('corepack', ['yarn', 'workspace', workspace.name, 'pack', '--out', tempTarballPath], {
    cwd: repositoryRoot,
    env,
    stdio: 'ignore',
  });

  const packlist = listTarEntries(tempTarballPath, execFileSyncImpl);
  assertNoVendoredPacklistEntries(packlist, workspace.name);
  const {manifest: packedManifest, manifestBytes: packedManifestBytes} = extractPackedManifest(
    tempTarballPath,
    path.join(transactionRoot, `${workspaceTempName(workspace.name)}-extract`),
    execFileSyncImpl
  );
  if (packedManifest.name !== workspace.name) {
    throw new Error(`Packed workspace identity mismatch for ${workspace.name}`);
  }
  assertNoSDKTargetingResolutions(packedManifest, `${workspace.name} packed manifest`);
  const {sourceDescriptors, packedDescriptors} = assertSDKDescriptorMapsMatch(
    sourceManifest,
    packedManifest,
    workspace.name
  );

  return {
    name: workspace.name,
    packagePath: workspace.packagePath,
    tarballName,
    tempTarballPath,
    tarballSha256: sha256(fs.readFileSync(tempTarballPath)),
    sourceManifest,
    sourceManifestBytes,
    sourceManifestSha256: sha256(sourceManifestBytes),
    packedManifest,
    packedManifestBytes,
    packedManifestSha256: sha256(packedManifestBytes),
    contactCenterDescriptors: packedDescriptors,
    sourceContactCenterDescriptors: sourceDescriptors,
    packlist,
  };
}

function inspectAISummaryPackedWorkspaceBoundary(options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot || process.cwd());
  const workspaces = options.workspaces || AI_SUMMARY_PACKED_WORKSPACES;
  assertAISummaryWorkspaceConfig(workspaces);
  const execFileSyncImpl = options.execFileSync || childProcess.execFileSync;
  const transactionRoot = options.transactionRoot || fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-pack-'));
  const ownsTransactionRoot = !options.transactionRoot;

  try {
    return {
      workspaces: workspaces.map((workspace) =>
        inspectPackedWorkspaceBoundary({repositoryRoot, workspace, transactionRoot, execFileSyncImpl})
      ),
      transactionRoot,
    };
  } finally {
    if (ownsTransactionRoot) {
      fs.rmSync(transactionRoot, {recursive: true, force: true});
    }
  }
}

function assertRootRepositoryIdentity(repositoryRoot, rootPackage) {
  if (rootPackage.name !== EXPECTED_REPOSITORY_NAME) {
    const foundName = rootPackage.name || '<missing name>';
    throw new Error(
      `publish preflight expected ${EXPECTED_REPOSITORY_NAME} repository root at ${repositoryRoot}; found ${foundName}`
    );
  }
}

function isPublishableContactCenterPackage(packageJson) {
  return packageJson.private !== true && packageJson.name?.startsWith('@webex/cc-');
}

function assertPublishableContactCenterSDKBoundary(repositoryRoot = process.cwd()) {
  const rootPackagePath = path.join(repositoryRoot, 'package.json');
  if (!fs.existsSync(rootPackagePath)) {
    throw new Error(`publish preflight requires ${EXPECTED_REPOSITORY_NAME} package.json at ${rootPackagePath}`);
  }

  const rootPackage = readJson(rootPackagePath);
  assertRootRepositoryIdentity(repositoryRoot, rootPackage);

  for (const {resolutionKey, descriptor} of collectSDKResolutions(rootPackage.resolutions)) {
    assertPlainRegistrySemver(descriptor, `root resolutions.${resolutionKey}`);
  }

  const contactCenterPath = path.join(repositoryRoot, CONTACT_CENTER_PACKAGE_ROOT);
  if (!fs.existsSync(contactCenterPath)) {
    throw new Error(`publish preflight requires Contact Center packages at ${contactCenterPath}`);
  }

  for (const dirent of fs.readdirSync(contactCenterPath, {withFileTypes: true})) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const packageJsonPath = path.join(contactCenterPath, dirent.name, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }
    const packageJson = readJson(packageJsonPath);
    if (isPublishableContactCenterPackage(packageJson)) {
      assertPublishableSDKDescriptors(packageJson, packageJson.name);
    }
  }
}

module.exports = {
  AI_SUMMARY_PACKED_WORKSPACES,
  CONTACT_CENTER_PACKAGE_ROOT,
  SDK_PACKAGE_NAME,
  SDK_TARBALL_RELATIVE_PATH,
  assertNoLocalSDKProtocolsForPublish: assertPublishableContactCenterSDKBoundary,
  assertNoSDKTargetingResolutions,
  assertNoVendoredPacklistEntries,
  assertAISummaryWorkspaceConfig,
  assertPlainRegistrySemver,
  assertPublishableContactCenterSDKBoundary,
  assertPublishableSDKDescriptors,
  assertSDKDescriptorMapsMatch,
  assertSoleSDKWorkspaceDependency,
  collectSDKDescriptors,
  collectSDKResolutions,
  extractPackedManifest,
  inspectAISummaryPackedWorkspaceBoundary,
  isPlainRegistrySemverDescriptor,
  listTarEntries,
  resolutionKeyTargetsSDKPackage,
  sha256,
  tarballNameForWorkspace,
  toPosix,
};
