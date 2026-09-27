const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const semver = require('semver');
const ts = require('typescript');
const {
  AI_SUMMARY_PACKED_WORKSPACES,
  SDK_TARBALL_RELATIVE_PATH,
  assertNoSDKTargetingResolutions,
  assertNoVendoredPacklistEntries,
  listTarEntries,
  collectSDKResolutions,
} = require('./publish-boundary');

const SDK_PACKAGE_NAME = '@webex/contact-center';
const LOCK_RECEIPT_RELATIVE_PATH = 'design/default/sdk_package_lock.json';
const PACKAGING_RECEIPT_RELATIVE_PATH = '.matrix/results/prog-mini-js/release/ai-summary-packed-workspaces.json';
const RELEASE_RECEIPT_RELATIVE_PATH = '.matrix/results/prog-mini-js/release/ai-assistant-summary.json';
const VISUAL_ROOT_RELATIVE_PATH = '.matrix/results/prog-mini-js/ux-visual/implementation';
const VISUAL_COMPARISON_RECEIPT_RELATIVE_PATH = '.matrix/results/prog-mini-js/ux_visual_comparison.json';
const UX_HARNESS_DESCRIPTOR_RELATIVE_PATH = 'playwright/visual/ai-summary-harness.json';
const UX007_CANONICAL_REGISTRY_KEY = 'S07/dl';
const UX007_DECLARED_REGISTRY_KEY = 'UX-007/S07-UX';
const UX007_SOURCE_PLAN_ID = 'UX-007--S07-UX';
const REQUIRED_RELEASE_GATES = Object.freeze(['D0', 'D8b', 'acceptance', 'verify', 'browser', 'visual', 'privacy', 'release']);
const HASH_BOUND_EVIDENCE_PATHS = Object.freeze([
  'requirement.md',
  'design/default/design_spec.md',
  'design/default/implementation_dag.json',
]);
const SDK_DESCRIPTOR_MAPS = Object.freeze(['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']);
const EXECUTABLE_SOURCE_RE = /\.(?:c|m)?(?:j|t)sx?$/;
const HEX40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const EXPECTED_VISUAL_COMPARISON_IDS = Object.freeze([
  'UX-001--S01',
  'UX-002--S02',
  'UX-003--S03',
  'UX-004--S04',
  'UX-005--S05',
  'UX-006--S06',
  UX007_SOURCE_PLAN_ID,
  'UX-008--S08',
  'UX-009--S09',
  'UX-010--S10',
]);
const SAMPLE_HOST_REACT_APP_PATH = 'widgets-samples/cc/samples-cc-react-app/src/App.tsx';
const SAMPLE_HOST_LOCAL_STORAGE_KEYS = Object.freeze([
  'accessToken',
  'allowInternationalDn',
  'conferenceEnabled',
  'currentTheme',
  'disableWebRTCRegistration',
  'enableWxBetterTogether',
  'hideDesktopLogin',
  'integrationEnv',
  'isMultiLoginEnabled',
  'selectedWidgets',
]);
const PRIVACY_FORBIDDEN_PATTERNS = Object.freeze([
  {api: 'localStorage', pattern: /\b(?:window\s*\.\s*)?localStorage\b/},
  {api: 'sessionStorage', pattern: /\b(?:window\s*\.\s*)?sessionStorage\b/},
  {api: 'IndexedDB', pattern: /\b(?:(?:window|self|globalThis)\s*\.\s*)?indexedDB\b/i},
  {api: 'document.cookie', pattern: /\bdocument\s*\.\s*cookie\b/},
  {api: 'history.pushState', pattern: /\b(?:window\s*\.\s*)?history\s*\.\s*pushState\b/},
  {api: 'history.replaceState', pattern: /\b(?:window\s*\.\s*)?history\s*\.\s*replaceState\b/},
]);

const PACKED_WORKSPACES = Object.freeze(AI_SUMMARY_PACKED_WORKSPACES.map((workspace) => workspace.name));
const PACKED_WORKSPACE_BY_NAME = new Map(
  AI_SUMMARY_PACKED_WORKSPACES.map((workspace) => [workspace.name, workspace.packagePath])
);

const ALLOWED_CHANGED_PATHS = Object.freeze([
  '.gitignore',
  'ai-summary.md',
  'design/default/design_spec.md',
  'design/default/implementation_dag.json',
  'design/default/sdk_package_lock.json',
  'package.json',
  'prog-mini-js.config.json',
  'yarn.lock',
  'vendor/contact-center-cc-summaries.tgz',
  'tooling/src/ai-summary-sdk-lock.js',
  'tooling/src/publish.js',
  'tooling/src/verify-ai-summary-release.js',
  'tooling/tests/ai-summary-sdk-lock.test.js',
  'tooling/tests/publish.js',
  'tooling/tests/verify-ai-summary-release.test.js',
  'widgets-samples/cc/samples-cc-react-app/package.json',
  'widgets-samples/cc/samples-cc-react-app/webpack.config.js',
  'widgets-samples/cc/samples-cc-react-app/src/AISummaryVisualFixture.tsx',
  'widgets-samples/cc/samples-cc-react-app/src/ai-summary-visual-content.ts',
  'widgets-samples/cc/samples-cc-react-app/src/aiSummaryE2E.ts',
  'widgets-samples/cc/samples-cc-react-app/src/App.tsx',
  'widgets-samples/cc/samples-cc-react-app/src/index.tsx',
  'playwright/Utils/aiSummaryUtils.ts',
  'playwright/suites/ai-summary-tests.spec.ts',
  'playwright/tests/ai-summary-test.spec.ts',
  'playwright/visual/ai-summary-harness.json',
  'playwright/visual/ai-summary-visual-cases.ts',
  'playwright.config.ts',
]);

class ReleaseVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReleaseVerificationError';
    this.code = code;
  }
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function hashFile(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function readJson(filePath, code = 'json-invalid') {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new ReleaseVerificationError(code, `Unable to read JSON: ${path.basename(filePath)}`);
  }
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function isSubPath(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function assertRelativePosixPath(relativePath, code) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    relativePath.includes('\\')
  ) {
    throw new ReleaseVerificationError(code, 'Path must be a relative POSIX path');
  }
  const normalized = path.posix.normalize(relativePath);
  if (
    normalized !== relativePath ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    throw new ReleaseVerificationError(code, 'Path escapes repository root');
  }
  return relativePath;
}

function assertInsideRoot(repositoryRoot, candidatePath, code) {
  assertRelativePosixPath(candidatePath, code);
  const root = path.resolve(repositoryRoot);
  const absolute = path.resolve(repositoryRoot, ...candidatePath.split('/'));
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new ReleaseVerificationError(code, 'Path escapes repository root');
  }
  return absolute;
}

function assertRealFileInsideRoot(repositoryRoot, relativePath, code) {
  const absolutePath = assertInsideRoot(repositoryRoot, relativePath, code);
  const rootRealPath = fs.realpathSync(repositoryRoot);
  const fileRealPath = fs.realpathSync(absolutePath);
  if (fileRealPath !== rootRealPath && !isSubPath(rootRealPath, fileRealPath)) {
    throw new ReleaseVerificationError(code, 'Path realpath escapes repository root');
  }
  const stats = fs.lstatSync(absolutePath);
  if (!stats.isFile()) {
    throw new ReleaseVerificationError(code, 'Expected a regular file');
  }
  return {absolutePath, stats};
}

function assertPlainRegistrySemver(descriptor, context) {
  if (
    typeof descriptor !== 'string' ||
    descriptor.trim() !== descriptor ||
    descriptor.length === 0 ||
    /(?:[a-z][a-z0-9+.-]*:|[/\\#]|\.(?:tgz|tar\.gz)(?:$|[?#]))/i.test(descriptor) ||
    semver.validRange(descriptor, {loose: false}) === null
  ) {
    throw new ReleaseVerificationError('publishable-sdk-descriptor-invalid', `${context} is not registry SemVer`);
  }
}

function assertNoSDKResolutions(packageJson, context) {
  try {
    assertNoSDKTargetingResolutions(packageJson, context);
  } catch (error) {
    throw new ReleaseVerificationError('packed-sdk-resolution-leak', error.message);
  }
}

function assertNoVendoredPacklist(packlist, context) {
  try {
    assertNoVendoredPacklistEntries(packlist, context);
  } catch (error) {
    throw new ReleaseVerificationError('packaging-vendor-tarball-leak', error.message);
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

function parseJsonBytes(bytes, code) {
  try {
    return JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes));
  } catch (error) {
    throw new ReleaseVerificationError(code, 'Unable to read JSON bytes');
  }
}

function assertNoRemoteFigmaProvenance(value, evidencePath) {
  const reject = (keyPath) => {
    const fieldPath = keyPath || '<root>';
    const error = new ReleaseVerificationError(
      'figma-mcp-provenance-detected',
      `Prohibited or ambiguous Figma acquisition provenance at ${evidencePath}:${fieldPath}`
    );
    // Report location, never remote URLs, tokens, or arbitrary evidence values.
    error.provenance = {evidence_path: evidencePath, field_path: fieldPath};
    throw error;
  };
  const inspect = (candidate, keyPath = '') => {
    if (typeof candidate === 'string') {
      // Local scene graphs legitimately contain node IDs and file keys. A field
      // name or explanatory mention of tool_call is not acquisition evidence.
      if (/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)*figma\.com(?=[/:?#\s]|$)/i.test(candidate)) {
        reject(keyPath);
      }
      return;
    }
    if (!candidate || typeof candidate !== 'object') {
      return;
    }
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => inspect(item, `${keyPath}[${index}]`));
      return;
    }
    for (const [key, nested] of Object.entries(candidate)) {
      const nestedPath = keyPath ? `${keyPath}.${key}` : key;
      if (key === 'figma_mcp_policy' || key === 'mcp_policy') {
        // Only the exact prohibition is admissible for this local-only release.
        // Do not exempt all policy-looking fields or hide nested use records.
        if (nested !== 'forbidden') reject(nestedPath);
      } else if ((key === 'mcp_used' || key === 'mcpUsed') && nested !== false) {
        reject(nestedPath);
      } else if (/mcp/i.test(key) && nested && nested !== false) {
        reject(nestedPath);
      }
      if (
        /^(?:provider|transport|acquisition_mode|figma_acquisition_mode|source_type|server|tool|tool_name)$/i.test(key) &&
        typeof nested === 'string' &&
        /^(?:(?:figma[-_: /])?mcp(?:[-_: /]figma)?|mcp__figma(?:__.*)?)$/i.test(nested)
      ) {
        reject(nestedPath);
      }
      inspect(nested, nestedPath);
    }
  };
  inspect(value);
}

function assertNoRemoteFigmaExecutableSource(repositoryRoot, changedFiles) {
  const executableFiles = changedFiles.filter((relativePath) => EXECUTABLE_SOURCE_RE.test(relativePath));
  const remoteURL = /^(?:https?:\/\/)(?:[a-z0-9-]+\.)*figma\.com(?=[/:?#\s]|$)/i;
  const remoteTool = /(?:^|\.)(?:mcp__figma(?:__\w+)?|get_design_context)$/i;
  for (const relativePath of executableFiles) {
    const {absolutePath} = assertRealFileInsideRoot(repositoryRoot, relativePath, 'changed-path-escape');
    const text = fs.readFileSync(absolutePath, 'utf8');
    const source = ts.createSourceFile(relativePath, text, ts.ScriptTarget.Latest, true,
      relativePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const constants = new Map();
    const collect = (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        constants.set(node.name.text, node.initializer);
      }
      ts.forEachChild(node, collect);
    };
    collect(source);
    const hasRemoteURL = (node, seen = new Set()) => {
      if (ts.isStringLiteralLike(node)) return remoteURL.test(node.text);
      if (ts.isIdentifier(node) && constants.has(node.text) && !seen.has(node.text)) {
        return hasRemoteURL(constants.get(node.text), new Set([...seen, node.text]));
      }
      if (ts.isTemplateExpression(node)) return remoteURL.test(node.head.text);
      return false;
    };
    let acquired = false;
    const inspect = (node) => {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const callee = node.expression.getText(source);
        if (remoteTool.test(callee) || (node.arguments || []).some((arg) => hasRemoteURL(arg))) acquired = true;
      }
      ts.forEachChild(node, inspect);
    };
    inspect(source);
    if (acquired) {
      const error = new ReleaseVerificationError(
        'figma-mcp-provenance-detected',
        `Prohibited or ambiguous Figma acquisition provenance at ${relativePath}:executable`
      );
      error.provenance = {evidence_path: relativePath, field_path: 'executable'};
      throw error;
    }
  }
}

function listFilesRecursive(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const entries = [];
  for (const dirent of fs.readdirSync(root, {withFileTypes: true})) {
    const absolutePath = path.join(root, dirent.name);
    if (dirent.isDirectory()) {
      entries.push(...listFilesRecursive(absolutePath));
    } else if (dirent.isFile()) {
      entries.push(absolutePath);
    }
  }
  return entries;
}

function assertSameRecord(actual, expected, code, message) {
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new ReleaseVerificationError(code, message);
  }
}


function getStringField(record, keys) {
  for (const key of keys) {
    if (typeof record[key] === 'string') {
      return record[key];
    }
  }
  return undefined;
}

function getArrayField(record, keys) {
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key];
    }
  }
  return undefined;
}

function getNestedRecord(record, pathParts) {
  let current = record;
  for (const pathPart of pathParts) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[pathPart];
  }
  return isRecord(current) ? current : undefined;
}

function readGitDir(repositoryRoot) {
  const dotGitPath = path.join(repositoryRoot, '.git');
  const dotGitStat = fs.lstatSync(dotGitPath);
  if (dotGitStat.isFile()) {
    const text = fs.readFileSync(dotGitPath, 'utf8').trim();
    if (!text.startsWith('gitdir:')) {
      throw new ReleaseVerificationError('gitdir-invalid', '.git file must contain gitdir');
    }
    return path.resolve(repositoryRoot, text.slice('gitdir:'.length).trim());
  }
  if (dotGitStat.isDirectory()) {
    return dotGitPath;
  }
  throw new ReleaseVerificationError('gitdir-invalid', '.git must be a file or directory');
}

function readCommonGitDir(gitDir) {
  const commondirPath = path.join(gitDir, 'commondir');
  if (!fs.existsSync(commondirPath)) {
    return gitDir;
  }
  const value = fs.readFileSync(commondirPath, 'utf8').trim();
  if (!value) {
    throw new ReleaseVerificationError('git-commondir-invalid', 'Git commondir is empty');
  }
  return path.resolve(gitDir, value);
}

function readPackedRef(gitDir, ref) {
  const packedRefsPath = path.join(gitDir, 'packed-refs');
  if (!fs.existsSync(packedRefsPath)) {
    return undefined;
  }
  for (const line of fs.readFileSync(packedRefsPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || line.startsWith('^')) {
      continue;
    }
    const [commit, name] = line.split(' ');
    if (name === ref) {
      return commit;
    }
  }
  return undefined;
}

function resolveGitRef(gitDir, commonGitDir, ref) {
  for (const root of [gitDir, commonGitDir]) {
    const looseRefPath = path.join(root, ...ref.split('/'));
    if (fs.existsSync(looseRefPath)) {
      return fs.readFileSync(looseRefPath, 'utf8').trim();
    }
  }
  return readPackedRef(gitDir, ref) || readPackedRef(commonGitDir, ref);
}

function readGitIdentity(repositoryRoot) {
  const gitDir = readGitDir(repositoryRoot);
  const commonGitDir = readCommonGitDir(gitDir);
  if (path.basename(commonGitDir) !== '.git') {
    throw new ReleaseVerificationError('git-commondir-invalid', 'Git common dir must be named .git');
  }
  const headText = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
  if (!headText.startsWith('ref: ')) {
    throw new ReleaseVerificationError('head-detached', 'HEAD must be symbolic for release validation');
  }
  const headRef = headText.slice('ref: '.length).trim();
  if (!headRef.startsWith('refs/heads/')) {
    throw new ReleaseVerificationError('head-ref-invalid', 'HEAD must point to a branch ref');
  }
  const headCommit = resolveGitRef(gitDir, commonGitDir, headRef);
  if (!HEX40_RE.test(headCommit || '')) {
    throw new ReleaseVerificationError('head-ref-unresolved', 'Unable to resolve HEAD to a 40-hex commit');
  }
  return {
    gitDir,
    commonGitDir,
    commonCheckoutRoot: path.dirname(commonGitDir),
    headRef,
    executionBranch: headRef.slice('refs/heads/'.length),
    headCommit,
  };
}

function parseRequirementBranch(repositoryRoot) {
  const requirementText = fs.readFileSync(path.join(repositoryRoot, 'requirement.md'), 'utf8');
  const lines = requirementText.split(/\r?\n/);
  const branchHeadingIndex = lines.findIndex((line) => /^##\s+Branch\s*$/.test(line.trim()));
  if (branchHeadingIndex < 0) {
    throw new ReleaseVerificationError('requirement-branch-missing', 'Requirement Branch heading is missing');
  }
  const values = [];
  for (let index = branchHeadingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line.trim())) {
      break;
    }
    if (line.trim()) {
      values.push(line.trim());
    }
  }
  if (values.length !== 1) {
    throw new ReleaseVerificationError('requirement-branch-invalid', 'Requirement Branch must contain exactly one value');
  }
  return values[0];
}

function resolveReleaseReceiptPath(repositoryRoot, gitIdentity, context = {}) {
  if (context.releaseReceiptPath) {
    return path.isAbsolute(context.releaseReceiptPath)
      ? context.releaseReceiptPath
      : path.resolve(gitIdentity.commonCheckoutRoot, context.releaseReceiptPath);
  }
  return path.join(gitIdentity.commonCheckoutRoot, RELEASE_RECEIPT_RELATIVE_PATH);
}

function withoutFlowHash(receipt) {
  const copy = {...receipt};
  delete copy.flowGateSha256;
  delete copy.flow_gate_sha256;
  delete copy.receiptSha256;
  delete copy.receipt_sha256;
  return copy;
}

function assertReleaseReceiptFlowHash(receipt) {
  const recordedHash = getStringField(receipt, [
    'flowGateSha256',
    'flow_gate_sha256',
    'receiptSha256',
    'receipt_sha256',
  ]);
  if (!SHA256_RE.test(recordedHash || '')) {
    throw new ReleaseVerificationError('release-flow-hash-missing', 'Release receipt flow hash is missing');
  }
  if (sha256(stableStringify(withoutFlowHash(receipt))) !== recordedHash) {
    throw new ReleaseVerificationError('release-flow-hash-mismatch', 'Release receipt flow hash mismatch');
  }
}

function extractManifestEntries(releaseReceipt, fieldNames, code) {
  const manifest = getNestedRecord(releaseReceipt, ['manifest']) || {};
  const entries =
    getArrayField(releaseReceipt, fieldNames) ||
    getArrayField(manifest, fieldNames) ||
    getArrayField(getNestedRecord(releaseReceipt, ['evidenceManifest']) || {}, fieldNames) ||
    getArrayField(getNestedRecord(releaseReceipt, ['changedEvidenceManifest']) || {}, fieldNames);
  if (!entries || entries.length === 0) {
    throw new ReleaseVerificationError(code, `Release receipt is missing ${fieldNames[0]}`);
  }
  const normalized = entries.map((entry) => {
    if (!isRecord(entry)) {
      throw new ReleaseVerificationError(code, 'Release manifest entries must be records');
    }
    const entryPath = entry.path || entry.relativePath || entry.relative_path;
    if (!SHA256_RE.test(entry.sha256 || '')) {
      throw new ReleaseVerificationError(code, 'Release manifest entry hash is missing');
    }
    return {
      path: assertRelativePosixPath(entryPath, code),
      sha256: entry.sha256,
      sizeBytes: entry.sizeBytes ?? entry.size_bytes,
    };
  });
  const sorted = [...normalized].sort((left, right) => left.path.localeCompare(right.path));
  if (stableStringify(normalized.map((entry) => entry.path)) !== stableStringify(sorted.map((entry) => entry.path))) {
    throw new ReleaseVerificationError('release-manifest-unsorted', 'Release manifest paths must be sorted');
  }
  const seen = new Set();
  for (const entry of normalized) {
    if (seen.has(entry.path)) {
      throw new ReleaseVerificationError('release-manifest-duplicate', 'Release manifest contains duplicate paths');
    }
    seen.add(entry.path);
  }
  return normalized;
}

function getRecordedHash(receipt, fieldNames, code) {
  const manifest = getNestedRecord(receipt, ['manifest']) || {};
  const hash = getStringField(receipt, fieldNames) || getStringField(manifest, fieldNames);
  if (!SHA256_RE.test(hash || '')) {
    throw new ReleaseVerificationError(code, `${fieldNames[0]} is missing`);
  }
  return hash;
}

function assertManifestEntryHashes(repositoryRoot, entries, code) {
  for (const entry of entries) {
    const {absolutePath, stats} = assertRealFileInsideRoot(repositoryRoot, entry.path, code);
    if (entry.sizeBytes !== undefined && entry.sizeBytes !== stats.size) {
      throw new ReleaseVerificationError('release-manifest-size-drift', 'Release manifest file size drift');
    }
    if (hashFile(absolutePath) !== entry.sha256) {
      throw new ReleaseVerificationError('release-manifest-hash-drift', 'Release manifest file hash drift');
    }
  }
}

function readChangedPathsSinceBase(repositoryRoot, baseCommit) {
  if (!HEX40_RE.test(baseCommit || '')) {
    throw new ReleaseVerificationError('release-base-commit-missing', 'Release baseline commit is required');
  }
  const env = {PATH: process.env.PATH, HOME: process.env.HOME};
  const git = (args) => childProcess.execFileSync('git', args, {
    cwd: repositoryRoot, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    git(['merge-base', '--is-ancestor', baseCommit, 'HEAD']);
    const tracked = git(['diff', '--name-only', '-z', baseCommit, '--']);
    const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']);
    return [...new Set(`${tracked}\0${untracked}`.split('\0').filter(Boolean))].sort();
  } catch (error) {
    throw new ReleaseVerificationError('release-git-scope-invalid', 'Unable to verify release changes against Git baseline');
  }
}

function loadReleaseContext(repositoryRoot, context = {}) {
  if (context.releaseContext) {
    return context.releaseContext;
  }
  const gitIdentity = readGitIdentity(repositoryRoot);
  const releaseReceiptPath = resolveReleaseReceiptPath(repositoryRoot, gitIdentity, context);
  if (!fs.existsSync(releaseReceiptPath)) {
    throw new ReleaseVerificationError('release-receipt-missing', 'Release receipt is missing');
  }
  const releaseReceipt = readJson(releaseReceiptPath, 'release-receipt-invalid');
  assertReleaseReceiptFlowHash(releaseReceipt);

  const requirementBranch = parseRequirementBranch(repositoryRoot);
  if (releaseReceipt.resolvedPromotionTarget !== requirementBranch) {
    throw new ReleaseVerificationError('promotion-target-invalid', 'Resolved promotion target is wrong');
  }
  if (releaseReceipt.executionBranch !== gitIdentity.executionBranch) {
    throw new ReleaseVerificationError('execution-branch-invalid', 'Execution branch does not match symbolic HEAD');
  }
  if (gitIdentity.executionBranch !== requirementBranch) {
    throw new ReleaseVerificationError('execution-branch-invalid', 'Release must run on the declared promotion branch');
  }
  if (!HEX40_RE.test(releaseReceipt.headCommit || '')) {
    throw new ReleaseVerificationError('head-commit-missing', 'Release receipt HEAD is missing or invalid');
  }
  if (releaseReceipt.headCommit !== gitIdentity.headCommit) {
    throw new ReleaseVerificationError('head-commit-mismatch', 'Release receipt HEAD does not match repository HEAD');
  }

  const coreHashes = {
    'requirement.md': getRecordedHash(releaseReceipt, ['requirementSha256', 'requirement_sha256'], 'requirement-hash-missing'),
    'design/default/design_spec.md': getRecordedHash(
      releaseReceipt,
      ['designSpecSha256', 'design_spec_sha256'],
      'design-hash-missing'
    ),
    'design/default/implementation_dag.json': getRecordedHash(
      releaseReceipt,
      ['implementationDagSha256', 'implementation_dag_sha256'],
      'dag-hash-missing'
    ),
  };
  for (const [relativePath, expectedHash] of Object.entries(coreHashes)) {
    const {absolutePath} = assertRealFileInsideRoot(repositoryRoot, relativePath, 'release-core-path-invalid');
    if (hashFile(absolutePath) !== expectedHash) {
      throw new ReleaseVerificationError('release-core-hash-drift', `${relativePath} hash drift`);
    }
  }

  const changedManifest = extractManifestEntries(
    releaseReceipt,
    ['changedFiles', 'changed_files', 'changed'],
    'release-changed-manifest-invalid'
  );
  const evidenceManifest = extractManifestEntries(
    releaseReceipt,
    ['evidenceFiles', 'evidence_files', 'evidence'],
    'release-evidence-manifest-invalid'
  );
  assertManifestEntryHashes(repositoryRoot, [...changedManifest, ...evidenceManifest], 'release-manifest-path-invalid');
  const observedChanges = (context.readChangedPathsSinceBase || readChangedPathsSinceBase)(
    repositoryRoot, releaseReceipt.baseCommit
  );
  const recordedChanges = changedManifest.map((entry) => entry.path).sort();
  if (stableStringify([...new Set(observedChanges)].sort()) !== stableStringify(recordedChanges)) {
    throw new ReleaseVerificationError('release-changed-scope-mismatch', 'Release changed-file manifest differs from Git');
  }

  return {
    releaseReceipt,
    releaseReceiptPath,
    gitIdentity,
    requirementBranch,
    changedFiles: changedManifest.map((entry) => entry.path),
    evidenceFiles: evidenceManifest.map((entry) => entry.path),
    manifestEntries: [...changedManifest, ...evidenceManifest],
  };
}

function readVisualComparisonReceipt(repositoryRoot) {
  const receiptPath = assertInsideRoot(
    repositoryRoot,
    VISUAL_COMPARISON_RECEIPT_RELATIVE_PATH,
    'ux-visual-path-escape'
  );
  if (!fs.existsSync(receiptPath)) {
    throw new ReleaseVerificationError('ux-visual-evidence-missing', 'UX visual comparison receipt is missing');
  }
  const receipt = readJson(receiptPath, 'ux-visual-evidence-invalid');
  return isRecord(receipt.visual_receipt) ? receipt.visual_receipt : receipt;
}

function expectedUX007Alias(sha256Value) {
  return {
    declared: {
      sourceId: 'UX-007',
      screenshotId: 'S07-UX',
      variantId: 'desktop-light',
    },
    canonical: {
      evidenceId: 'S07',
      variantId: 'dl',
    },
    sha256: sha256Value,
  };
}


function assertUX007AliasRecord(alias, sealedSha256, code, message) {
  if (!alias) {
    throw new ReleaseVerificationError('ux-visual-alias-missing', 'UX-007 sidecar alias is missing');
  }
  if (alias.declared?.sourceId !== 'UX-007') {
    throw new ReleaseVerificationError('ux-visual-alias-conflict', 'Only UX-007 may declare the S07/dl alias');
  }
  assertSameRecord(alias, expectedUX007Alias(sealedSha256), code, message);
}

function attemptRootForCaseRoot(caseRoot) {
  return path.dirname(path.dirname(caseRoot));
}

function comparisonIdentity(comparison) {
  return (
    comparison.source_id ||
    comparison.sourceId ||
    comparison.screen_id ||
    comparison.screenId ||
    comparison.declared_screen_id ||
    comparison.declaredScreenId ||
    comparison.registry_key ||
    comparison.registryKey
  );
}

function assertVisualComparisonStructure(repositoryRoot, receipt, sealedUxFiles) {
  if (!Array.isArray(receipt.comparisons)) {
    throw new ReleaseVerificationError('ux-visual-evidence-invalid', 'UX visual receipt comparisons are missing');
  }
  if (receipt.comparisons.length !== EXPECTED_VISUAL_COMPARISON_IDS.length) {
    throw new ReleaseVerificationError('ux-visual-comparison-count-invalid', 'UX visual receipt must contain exactly ten measured source comparisons, including diagnostic S10');
  }

  const expected = new Set(EXPECTED_VISUAL_COMPARISON_IDS);
  const seen = new Set();
  for (const comparison of receipt.comparisons) {
    if (!isRecord(comparison)) {
      throw new ReleaseVerificationError('ux-visual-evidence-invalid', 'UX visual comparison entry is invalid');
    }
    const identity = comparisonIdentity(comparison);
    if (typeof identity !== 'string') {
      throw new ReleaseVerificationError('ux-visual-evidence-invalid', 'UX visual comparison identity is missing');
    }
    if (!expected.has(identity)) {
      throw new ReleaseVerificationError('ux-visual-comparison-extra', `Unexpected UX visual comparison: ${identity}`);
    }
    if (seen.has(identity)) {
      throw new ReleaseVerificationError('ux-visual-comparison-duplicate', 'UX visual comparison is duplicated');
    }
    seen.add(identity);
    if (identity === 'UX-010--S10') {
      const measuredDiff = comparison.visual_analysis?.pixel_diff_percent;
      if (!Number.isFinite(measuredDiff) || measuredDiff < 0 || measuredDiff > 100) {
        throw new ReleaseVerificationError('ux-visual-s10-measurement-missing', 'S10 requires a real measured difference, not a fabricated score or automatic approval');
      }
    }
  }
  if (seen.size !== expected.size) {
    throw new ReleaseVerificationError('ux-visual-comparison-missing', 'UX visual comparison is missing');
  }

  const source = fs.readFileSync(path.join(repositoryRoot, 'playwright/visual/ai-summary-visual-cases.ts'), 'utf8');
  const s10Structural =
    /sourceId:\s*'UX-010'/.test(source) &&
    /screenshotId:\s*'S10'/.test(source) &&
    /'requirement-availability-override'/.test(source);
  if (!s10Structural) {
    throw new ReleaseVerificationError('ux-visual-s10-structural-missing', 'UX-010/S10 structural override is missing');
  }

  const sealedS10 = sealedUxFiles.find((entry) => entry.sourceId === 'UX-010' && entry.kind === 'screenshot');
  if (!sealedS10 || !SHA256_RE.test(sealedS10.sha256 || '')) {
    throw new ReleaseVerificationError('ux-visual-s10-structural-missing', 'UX-010 sealed screenshot evidence is missing');
  }
}

function verifyUX007EvidenceIdentity(repositoryRoot, ux) {
  const screenshotReceipt = ux.files.find((entry) => entry.sourceId === 'UX-007' && entry.kind === 'screenshot');
  if (!screenshotReceipt || typeof screenshotReceipt.sha256 !== 'string') {
    throw new ReleaseVerificationError('ux-visual-alias-missing', 'UX-007 sealed screenshot receipt is missing');
  }
  const sealedSha256 = screenshotReceipt.sha256;
  const receipt = readVisualComparisonReceipt(repositoryRoot);
  assertVisualComparisonStructure(repositoryRoot, receipt, ux.files);

  const comparisons = receipt.comparisons.filter((entry) => entry.source_id === UX007_SOURCE_PLAN_ID);
  const ux007Comparison = comparisons[0];
  if (comparisons.length !== 1 || !ux007Comparison) {
    throw new ReleaseVerificationError('ux-visual-alias-missing', 'UX-007 visual comparison is missing or duplicated');
  }
  // Final receipts have a closed flow-owned schema. Alias provenance belongs in
  // hash-bound sidecars, not additional properties on the comparison or raw record.
  if (ux007Comparison.source_capture_sha256 !== sealedSha256) {
    throw new ReleaseVerificationError('ux-visual-alias-conflict', 'UX-007 comparison target hash differs from the sealed source');
  }

  const renderedImage = getStringField(ux007Comparison, ['rendered_image', 'renderedImage']);
  if (!renderedImage) {
    throw new ReleaseVerificationError('ux-visual-evidence-invalid', 'UX-007 rendered image path is missing');
  }
  const renderedImagePath = assertInsideRoot(repositoryRoot, renderedImage, 'ux-visual-path-escape');
  const caseRoot = path.dirname(renderedImagePath);
  const registry = readJson(path.join(caseRoot, 'registry.json'), 'ux-visual-evidence-invalid');
  if (
    registry.registryKey !== UX007_CANONICAL_REGISTRY_KEY ||
    registry.sourceId !== 'UX-007' ||
    registry.screenshotId !== 'S07-UX'
  ) {
    throw new ReleaseVerificationError('ux-visual-alias-conflict', 'UX-007 registry identity is not canonical');
  }
  assertUX007AliasRecord(
    registry.declaredToCanonicalAlias,
    sealedSha256,
    'ux-visual-alias-hash-mismatch',
    'UX-007 registry alias hash mismatch'
  );
  if (registry.sourceHashes?.screenshot !== sealedSha256 || registry.canonicalIdentity?.sha256 !== sealedSha256) {
    throw new ReleaseVerificationError('ux-visual-alias-hash-mismatch', 'UX-007 registry hash equality failed');
  }

  const identityPath = path.join(caseRoot, 'comparison.identity.json');
  const comparisonReport = readJson(identityPath, 'ux-visual-evidence-invalid');
  if (
    comparisonReport.comparison_identity !== UX007_CANONICAL_REGISTRY_KEY ||
    comparisonReport.registry_key !== UX007_CANONICAL_REGISTRY_KEY ||
    comparisonReport.target_sha256 !== sealedSha256 ||
    comparisonReport.source_hashes?.screenshot !== sealedSha256
  ) {
    throw new ReleaseVerificationError('ux-visual-alias-conflict', 'UX-007 comparison report identity is not canonical');
  }
  assertUX007AliasRecord(
    comparisonReport.declared_to_canonical_alias,
    sealedSha256,
    'ux-visual-alias-hash-mismatch',
    'UX-007 comparison report alias hash mismatch'
  );
  const {record_sha256: identityRecordHash, ...identityRecord} = comparisonReport;
  const comparator = readJson(path.join(caseRoot, 'comparison.json'), 'ux-visual-evidence-invalid');
  if (
    identityRecordHash !== sha256(stableStringify(identityRecord)) ||
    registry.comparisonIdentitySha256 !== hashFile(identityPath) ||
    comparisonReport.rendered_sha256 !== hashFile(renderedImagePath) ||
    comparisonReport.diff_sha256 !== hashFile(path.join(caseRoot, 'diff.png')) ||
    ['target_sha256', 'rendered_sha256', 'diff_sha256', 'pixel_diff_percent'].some(
      (key) => comparator[key] !== comparisonReport[key]
    )
  ) {
    throw new ReleaseVerificationError('ux-visual-alias-hash-mismatch', 'UX-007 comparator and immutable identity disagree');
  }

  const rawRender = readJson(path.join(attemptRootForCaseRoot(caseRoot), 'raw-render.json'), 'ux-visual-evidence-invalid');
  if (!Array.isArray(rawRender.scenarios)) {
    throw new ReleaseVerificationError('ux-visual-evidence-invalid', 'UX raw-render scenarios are missing');
  }
  const rawCanonical = rawRender.scenarios.filter((entry) => isRecord(entry) && entry.scenario_id === UX007_CANONICAL_REGISTRY_KEY);
  const rawDeclared = rawRender.scenarios.filter((entry) => isRecord(entry) && entry.scenario_id === UX007_DECLARED_REGISTRY_KEY);
  if (rawDeclared.length !== 1 || rawCanonical.length > 0) {
    throw new ReleaseVerificationError('ux-visual-alias-conflict', 'UX-007 raw-render identity differs from the harness descriptor');
  }
  const raw = rawDeclared[0];
  if (
    JSON.stringify(raw.source_ids) !== JSON.stringify([UX007_SOURCE_PLAN_ID]) ||
    raw.rendered_image !== renderedImage ||
    raw.rendered_sha256 !== hashFile(renderedImagePath) ||
    ux007Comparison.rendered_sha256 !== raw.rendered_sha256 ||
    assertInsideRoot(repositoryRoot, raw.comparison_path, 'ux-visual-path-escape') !== identityPath ||
    raw.comparison_sha256 !== hashFile(identityPath)
  ) {
    throw new ReleaseVerificationError('ux-visual-alias-hash-mismatch', 'UX-007 raw observation and sidecar bindings disagree');
  }
}

async function verifySDKReceipt(context = {}) {
  const repositoryRoot = context.repositoryRoot || process.cwd();
  const verifySdkPackage =
    context.verifySdkPackage || require('./ai-summary-sdk-lock').verifySdkPackage;
  return verifySdkPackage({widgetsRoot: repositoryRoot, resolutionMode: 'development'});
}

function verifyUXEvidence(context = {}) {
  const repositoryRoot = context.repositoryRoot || process.cwd();
  const releaseContext = context.releaseContext || loadReleaseContext(repositoryRoot, context);
  const {UX_SOURCE_FILES, verifyUXSources: defaultVerifyUXSources} = require('./ai-summary-sdk-lock');
  const receipt = (context.verifyUXSources || defaultVerifyUXSources)({
    widgetsRoot: repositoryRoot,
    manifest: context.uxSourceFiles || UX_SOURCE_FILES,
    receiptPath: path.join(repositoryRoot, LOCK_RECEIPT_RELATIVE_PATH),
    execFileSync: context.execFileSync,
  });
  const ux = receipt.ux;
  if (!ux || ux.status !== 'sealed' || ux.resolutionRoot !== '.') {
    throw new ReleaseVerificationError('ux-receipt-unsealed', 'UX receipt must be sealed at resolutionRoot dot');
  }
  if (!Array.isArray(ux.files) || ux.files.length !== 30) {
    throw new ReleaseVerificationError('ux-file-count-invalid', 'UX receipt must contain exactly thirty files');
  }
  const seen = new Set();
  for (const entry of ux.files) {
    if (!entry.path || !entry.sha256 || !entry.sourceId || !entry.kind) {
      throw new ReleaseVerificationError('ux-file-entry-invalid', 'UX receipt file entry is incomplete');
    }
    const key = `${entry.sourceId}:${entry.kind}:${entry.path}`;
    if (seen.has(key)) {
      throw new ReleaseVerificationError('ux-file-duplicate', 'UX receipt contains duplicate file entries');
    }
    seen.add(key);
    const {absolutePath} = assertRealFileInsideRoot(repositoryRoot, entry.path, 'ux-path-escape');
    const stats = fs.lstatSync(absolutePath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new ReleaseVerificationError('ux-file-invalid', 'UX input must be a regular non-symlink file');
    }
    if (hashFile(absolutePath) !== entry.sha256) {
      throw new ReleaseVerificationError('ux-hash-drift', 'UX input hash drift');
    }
  }

  verifyUX007EvidenceIdentity(repositoryRoot, ux);

  const harnessConfig = readJson(path.join(repositoryRoot, 'prog-mini-js.config.json'), 'ux-harness-config-invalid');
  if (harnessConfig.ux_harness_descriptor !== UX_HARNESS_DESCRIPTOR_RELATIVE_PATH) {
    throw new ReleaseVerificationError('ux-harness-descriptor-invalid', 'Unexpected UX harness descriptor path');
  }
  const harnessDescriptor = readJson(
    path.join(repositoryRoot, UX_HARNESS_DESCRIPTOR_RELATIVE_PATH),
    'ux-harness-descriptor-invalid'
  );
  if (!Array.isArray(harnessDescriptor.input_paths) || !Array.isArray(harnessDescriptor.scenarios)) {
    throw new ReleaseVerificationError('ux-harness-descriptor-invalid', 'UX harness descriptor has unexpected shape');
  }
  const inputPaths = new Set();
  for (const inputPath of harnessDescriptor.input_paths) {
    if (typeof inputPath !== 'string' || inputPaths.has(inputPath)) {
      throw new ReleaseVerificationError('ux-harness-descriptor-invalid', 'UX harness input paths must be unique strings');
    }
    inputPaths.add(inputPath);
    const absoluteInputPath = assertInsideRoot(repositoryRoot, inputPath, 'ux-harness-path-escape');
    if (!fs.existsSync(absoluteInputPath) || !fs.statSync(absoluteInputPath).isFile()) {
      throw new ReleaseVerificationError('ux-harness-input-missing', `UX harness input is missing: ${inputPath}`);
    }
  }
  assertNoRemoteFigmaProvenance(harnessDescriptor, UX_HARNESS_DESCRIPTOR_RELATIVE_PATH);
  assertNoRemoteFigmaExecutableSource(repositoryRoot, releaseContext.changedFiles);

  const evidenceRoot = path.join(repositoryRoot, VISUAL_ROOT_RELATIVE_PATH);
  const activeEvidence = ['ux_visual_comparison_plan.json', 'ux_visual_comparison.json', 'ux_visual_comparison_draft.json']
    .map((name) => path.join(repositoryRoot, '.matrix/results/prog-mini-js', name))
    .filter((filePath) => fs.existsSync(filePath));
  // Retain historical evidence checks, and also inspect the active records which
  // live outside the render tree. Filenames alone do not establish provenance.
  for (const evidenceFile of [...activeEvidence, ...listFilesRecursive(evidenceRoot)]) {
    if (evidenceFile.endsWith('.json')) {
      assertNoRemoteFigmaProvenance(
        readJson(evidenceFile, 'ux-evidence-json-invalid'),
        path.relative(repositoryRoot, evidenceFile)
      );
    }
  }
  return {files: ux.files.length};
}

function readPackedManifestFromTarball(tarballPath, context = {}) {
  if (context.tarManifestReader) {
    const result = context.tarManifestReader(tarballPath);
    if (result && Buffer.isBuffer(result.manifestBytes) && isRecord(result.manifest)) {
      return result;
    }
    if (result && typeof result.manifestBytes === 'string' && isRecord(result.manifest)) {
      return {...result, manifestBytes: Buffer.from(result.manifestBytes)};
    }
    if (Buffer.isBuffer(result) || typeof result === 'string') {
      const manifestBytes = Buffer.isBuffer(result) ? result : Buffer.from(result);
      return {
        manifest: parseJsonBytes(manifestBytes, 'packed-manifest-invalid'),
        manifestBytes,
      };
    }
    if (isRecord(result)) {
      const manifestBytes = Buffer.from(JSON.stringify(result));
      return {manifest: result, manifestBytes};
    }
    throw new ReleaseVerificationError('packed-manifest-invalid', 'Packed manifest reader returned invalid data');
  }
  const packlist = listTarEntries(tarballPath);
  assertNoVendoredPacklist(packlist, 'actual tarball');
  // Read only the manifest to stdout: never extract untrusted archive paths to disk.
  const manifestBytes = childProcess.execFileSync('tar', ['-xOf', tarballPath, 'package/package.json']);
  return {manifest: parseJsonBytes(manifestBytes, 'packed-manifest-invalid'), manifestBytes, packlist};
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${pattern}$`);
}

function listPackageJsonFiles(root) {
  const results = [];
  const walk = (dir) => {
    for (const dirent of fs.readdirSync(dir, {withFileTypes: true})) {
      if (dirent.name === 'node_modules' || dirent.name === '.git') {
        continue;
      }
      const absolutePath = path.join(dir, dirent.name);
      if (!dirent.isDirectory()) {
        continue;
      }
      const manifestPath = path.join(absolutePath, 'package.json');
      if (fs.existsSync(manifestPath)) {
        results.push(manifestPath);
      }
      walk(absolutePath);
    }
  };
  if (fs.existsSync(root)) {
    walk(root);
  }
  return results;
}

function workspacePrefixes(workspaces) {
  return workspaces.map((workspaceGlob) => {
    const wildcardIndex = workspaceGlob.search(/[*]/);
    return wildcardIndex < 0 ? workspaceGlob : workspaceGlob.slice(0, wildcardIndex).replace(/\/+$/, '');
  });
}

function enumerateWorkspacePackageJsons(repositoryRoot, rootPackage) {
  const workspaces = Array.isArray(rootPackage.workspaces)
    ? rootPackage.workspaces
    : rootPackage.workspaces?.packages;
  if (!Array.isArray(workspaces) || workspaces.length === 0) {
    throw new ReleaseVerificationError('root-workspaces-invalid', 'Root workspaces are missing');
  }
  const regexes = workspaces.map(globToRegExp);
  const packagePaths = new Set();
  for (const prefix of workspacePrefixes(workspaces)) {
    const searchRoot = path.join(repositoryRoot, ...prefix.split('/').filter(Boolean));
    for (const packageJsonPath of listPackageJsonFiles(searchRoot)) {
      const relativeDir = toPosix(path.relative(repositoryRoot, path.dirname(packageJsonPath)));
      if (regexes.some((regex) => regex.test(relativeDir))) {
        packagePaths.add(toPosix(path.relative(repositoryRoot, packageJsonPath)));
      }
    }
  }
  return [...packagePaths].sort();
}

function verifyWorkspaceSDKDescriptors(repositoryRoot, rootPackage) {
  const packageJsonPaths = enumerateWorkspacePackageJsons(repositoryRoot, rootPackage);
  let checked = 0;
  for (const packageJsonPath of packageJsonPaths) {
    const manifest = readJson(path.join(repositoryRoot, ...packageJsonPath.split('/')), 'workspace-package-invalid');
    const descriptors = collectSDKDescriptors(manifest);
    for (const {mapName, descriptor} of descriptors) {
      assertPlainRegistrySemver(descriptor, `${manifest.name || packageJsonPath} ${mapName}`);
    }
    if (descriptors.length && packageJsonPath.startsWith('packages/') && packageJsonPath !== 'packages/contact-center/store/package.json') {
      throw new ReleaseVerificationError('sdk-workspace-owner-invalid', 'Only the store may directly declare the SDK within production packages');
    }
    if (manifest.private === true) {
      continue;
    }
    checked += 1;
  }
  return checked;
}

function verifyPublishableDependencies(context = {}) {
  const repositoryRoot = context.repositoryRoot || process.cwd();
  const rootPackage = readJson(path.join(repositoryRoot, 'package.json'), 'root-package-invalid');
  if (rootPackage.private !== true) {
    throw new ReleaseVerificationError('root-package-not-private', 'Root package must be private');
  }
  const rootResolution = rootPackage.resolutions?.[SDK_PACKAGE_NAME];
  if (rootResolution && rootResolution !== `file:./${SDK_TARBALL_RELATIVE_PATH}`) {
    throw new ReleaseVerificationError('root-sdk-resolution-invalid', 'Unexpected root SDK resolution');
  }
  for (const {resolutionKey, descriptor} of collectSDKResolutions(rootPackage.resolutions)) {
    if (resolutionKey !== SDK_PACKAGE_NAME) assertPlainRegistrySemver(descriptor, `root resolutions.${resolutionKey}`);
  }
  for (const {mapName, descriptor} of collectSDKDescriptors(rootPackage)) {
    assertPlainRegistrySemver(descriptor, `root ${mapName}`);
  }
  const nonPrivateWorkspaceCount = verifyWorkspaceSDKDescriptors(repositoryRoot, rootPackage);

  const receiptPath = path.join(repositoryRoot, context.packagingReceiptPath || PACKAGING_RECEIPT_RELATIVE_PATH);
  const receipt = readJson(receiptPath, 'packaging-receipt-invalid');
  if (receipt.kind !== 'ai-summary-packed-workspaces' || !Array.isArray(receipt.workspaces)) {
    throw new ReleaseVerificationError('packaging-receipt-invalid', 'Packaging receipt has unexpected shape');
  }
  if (receipt.workspaces.length !== PACKED_WORKSPACES.length) {
    throw new ReleaseVerificationError('packaging-workspace-count-invalid', 'Packaging receipt must contain exactly six workspaces');
  }

  const workspaceNames = new Set();
  const workspacePaths = new Set();
  const tarballPaths = new Set();
  for (const entry of receipt.workspaces) {
    if (!isRecord(entry) || typeof entry.name !== 'string' || typeof entry.packagePath !== 'string') {
      throw new ReleaseVerificationError('packaging-receipt-invalid', 'Packaging workspace entry has unexpected shape');
    }
    if (workspaceNames.has(entry.name) || workspacePaths.has(entry.packagePath)) {
      throw new ReleaseVerificationError('packaging-workspace-duplicate', 'Packaging receipt contains duplicate workspaces');
    }
    workspaceNames.add(entry.name);
    workspacePaths.add(entry.packagePath);
    const expectedPackagePath = PACKED_WORKSPACE_BY_NAME.get(entry.name);
    if (!expectedPackagePath) {
      throw new ReleaseVerificationError('packaging-workspace-extra', `Unexpected packed workspace ${entry.name}`);
    }
    if (entry.packagePath !== expectedPackagePath) {
      throw new ReleaseVerificationError('packaging-workspace-path-mismatch', 'Packaging workspace package path mismatch');
    }
    if (
      typeof entry.tarballPath !== 'string' ||
      typeof entry.tarballSha256 !== 'string' ||
      typeof entry.sourceManifestSha256 !== 'string' ||
      typeof entry.packedManifestSha256 !== 'string'
    ) {
      throw new ReleaseVerificationError('packaging-receipt-invalid', 'Packaging receipt hashes are incomplete');
    }
    if (tarballPaths.has(entry.tarballPath)) {
      throw new ReleaseVerificationError('packaging-tarball-duplicate', 'Packaging receipt contains duplicate tarball paths');
    }
    tarballPaths.add(entry.tarballPath);
  }
  for (const workspace of PACKED_WORKSPACES) {
    if (!workspaceNames.has(workspace)) {
      throw new ReleaseVerificationError('packaging-workspace-missing', `Missing packed workspace ${workspace}`);
    }
  }

  for (const entry of receipt.workspaces) {
    const sourceManifestPath = assertInsideRoot(repositoryRoot, entry.packagePath, 'packaging-source-path-escape');
    const tarballPath = assertInsideRoot(repositoryRoot, entry.tarballPath, 'packaging-tarball-path-escape');
    if (hashFile(tarballPath) !== entry.tarballSha256) {
      throw new ReleaseVerificationError('packaging-tarball-drift', 'Packed tarball hash drift');
    }
    if (!Array.isArray(entry.packlist)) {
      throw new ReleaseVerificationError('packaging-packlist-missing', 'Packaging receipt packlist is missing');
    }
    assertNoVendoredPacklist(entry.packlist, entry.name);

    const packed = readPackedManifestFromTarball(tarballPath, context);
    assertNoVendoredPacklist(packed.packlist, entry.name);
    if (stableStringify([...packed.packlist].sort()) !== stableStringify([...entry.packlist].sort())) {
      throw new ReleaseVerificationError('packaging-packlist-drift', 'Packed file list differs from receipt');
    }
    if (sha256(packed.manifestBytes) !== entry.packedManifestSha256) {
      throw new ReleaseVerificationError('packed-manifest-drift', 'Packed manifest hash drift');
    }
    const packedManifest = packed.manifest;
    if (packedManifest.name !== entry.name) {
      throw new ReleaseVerificationError('packed-manifest-name-mismatch', 'Packed manifest name mismatch');
    }

    const sourceManifestBytes = fs.readFileSync(sourceManifestPath);
    if (sha256(sourceManifestBytes) !== entry.sourceManifestSha256) {
      throw new ReleaseVerificationError('source-manifest-drift', 'Source manifest hash drift');
    }
    const sourceManifest = parseJsonBytes(sourceManifestBytes, 'workspace-package-invalid');
    if (sourceManifest.name !== entry.name) {
      throw new ReleaseVerificationError('source-manifest-name-mismatch', 'Source manifest name mismatch');
    }
    assertNoSDKResolutions(packedManifest, `${entry.name} packed manifest`);

    const sourceDescriptors = collectSDKDescriptors(sourceManifest);
    const packedDescriptors = collectSDKDescriptors(packedManifest);
    for (const {mapName, descriptor} of sourceDescriptors) {
      assertPlainRegistrySemver(descriptor, `${sourceManifest.name} ${mapName}`);
    }
    for (const {mapName, descriptor} of packedDescriptors) {
      assertPlainRegistrySemver(descriptor, `${packedManifest.name} packed ${mapName}`);
    }
    if (entry.name === '@webex/cc-store' && sourceDescriptors.length === 0) {
      throw new ReleaseVerificationError('store-sdk-descriptor-missing', 'Store SDK descriptor is missing');
    }
    if (stableStringify(packedDescriptors) !== stableStringify(sourceDescriptors)) {
      throw new ReleaseVerificationError('packed-sdk-descriptor-drift', 'Packed SDK descriptor drift');
    }
    if (stableStringify(entry.sourceContactCenterDescriptors || []) !== stableStringify(sourceDescriptors)) {
      throw new ReleaseVerificationError('source-sdk-descriptor-receipt-drift', 'Source SDK descriptor receipt drift');
    }
    if (stableStringify(entry.contactCenterDescriptors || []) !== stableStringify(packedDescriptors)) {
      throw new ReleaseVerificationError('packed-sdk-descriptor-receipt-drift', 'Packed SDK descriptor receipt drift');
    }
  }
  const releaseContext = context.releaseContext || loadReleaseContext(repositoryRoot, context);
  const gate = getGateRecord(releaseContext.releaseReceipt.gates, 'D8b');
  assertGatePassed(gate, 'D8b');
  const {absolutePath: gatePath} = assertRealFileInsideRoot(repositoryRoot, gate.path, 'release-gate-path-invalid');
  if (hashFile(gatePath) !== gate.sha256) {
    throw new ReleaseVerificationError('release-gate-hash-mismatch', 'D8b gate evidence hash mismatch');
  }
  const evidence = readJson(gatePath, 'gate-receipt-invalid');
  assertGatePassed(evidence, 'D8b');
  if (evidence.headCommit !== releaseContext.releaseReceipt.headCommit) {
    throw new ReleaseVerificationError('release-gate-head-mismatch', 'D8b gate evidence HEAD mismatch');
  }
  if (evidence.packagingReceiptSha256 !== hashFile(receiptPath)) {
    throw new ReleaseVerificationError('packaging-gate-binding-mismatch', 'D8b gate does not bind the packaging receipt');
  }
  return {workspaces: PACKED_WORKSPACES.length, nonPrivateWorkspaces: nonPrivateWorkspaceCount};
}

function shouldScanPrivacySource(relativePath) {
  if (!EXECUTABLE_SOURCE_RE.test(relativePath)) {
    return false;
  }
  if (relativePath.startsWith('packages/contact-center/') && relativePath.includes('/src/')) {
    return true;
  }
  return relativePath === SAMPLE_HOST_REACT_APP_PATH;
}

function isAllowedSampleHostPersistenceLine(relativePath, line) {
  if (relativePath !== SAMPLE_HOST_REACT_APP_PATH) {
    return false;
  }
  const storageCall = /\bwindow\s*\.\s*localStorage\s*\.\s*(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/.exec(
    line
  );
  if (storageCall && SAMPLE_HOST_LOCAL_STORAGE_KEYS.includes(storageCall[1])) {
    return true;
  }
  return /\bwindow\s*\.\s*history\s*\.\s*replaceState\(\s*\{\s*\}\s*,\s*document\s*\.\s*title\s*,\s*window\s*\.\s*location\s*\.\s*pathname\s*\+\s*window\s*\.\s*location\s*\.\s*search\s*\)\s*;?\s*$/.test(
    line
  );
}

function assertNoForbiddenPersistenceApis(relativePath, text) {
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isAllowedSampleHostPersistenceLine(relativePath, line)) {
      continue;
    }
    const violation = PRIVACY_FORBIDDEN_PATTERNS.find(({pattern}) => pattern.test(line));
    if (violation) {
      throw new ReleaseVerificationError(
        'privacy-persistence-api',
        `Forbidden ${violation.api} use in ${relativePath}:${index + 1}`
      );
    }
  }
}

function verifyPrivacyAllowlist(context = {}) {
  const repositoryRoot = context.repositoryRoot || process.cwd();
  const releaseContext = context.releaseContext || loadReleaseContext(repositoryRoot, context);
  const files = context.changedFiles || releaseContext.changedFiles.filter((relativePath) => {
    if (!fs.existsSync(path.join(repositoryRoot, relativePath))) {
      return false;
    }
    if (
      relativePath.includes('/tests/') ||
      relativePath.startsWith('design/') ||
      relativePath.startsWith('tooling/') ||
      relativePath.endsWith('.md')
    ) {
      return false;
    }
    return shouldScanPrivacySource(relativePath);
  });
  for (const relativePath of files) {
    const absolutePath = assertInsideRoot(repositoryRoot, relativePath, 'changed-path-escape');
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      continue;
    }
    const text = fs.readFileSync(absolutePath, 'utf8');
    if (shouldScanPrivacySource(relativePath)) {
      assertNoForbiddenPersistenceApis(relativePath, text);
    }
    const source = ts.createSourceFile(relativePath, text, ts.ScriptTarget.Latest, true,
      relativePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    let sensitiveLogging = false;
    const containsSensitiveValue = (node) => {
      if (ts.isIdentifier(node) && /^(?:rawError|summaryText|adaptiveCard|customerText|summary)$/.test(node.text)) return true;
      return ts.forEachChild(node, containsSensitiveValue) || false;
    };
    const inspect = (node) => {
      if (ts.isCallExpression(node) && /(?:^|\.)(?:logger|metricsLogger|console)(?:\.|$)/.test(node.expression.getText(source)) &&
          node.arguments.some(containsSensitiveValue)) sensitiveLogging = true;
      ts.forEachChild(node, inspect);
    };
    inspect(source);
    if (sensitiveLogging) {
      throw new ReleaseVerificationError('privacy-forbidden-value', `Forbidden privacy sentinel in ${relativePath}`);
    }
  }
  return {scanned: files.length};
}

function verifyDAGTraceability(context = {}) {
  const repositoryRoot = context.repositoryRoot || process.cwd();
  const releaseContext = context.releaseContext || loadReleaseContext(repositoryRoot, context);
  const changedFiles = context.changedFiles || releaseContext.changedFiles;
  const dag = readJson(path.join(repositoryRoot, 'design/default/implementation_dag.json'), 'dag-invalid');
  const allowed = new Set();
  if (Array.isArray(dag.tasks)) {
    for (const task of dag.tasks) {
      if (Array.isArray(task.files)) {
        for (const relativePath of task.files) {
          if (typeof relativePath === 'string') {
            allowed.add(relativePath);
          }
        }
      }
    }
  }
  for (const relativePath of HASH_BOUND_EVIDENCE_PATHS) {
    allowed.add(relativePath);
  }
  for (const relativePath of changedFiles) {
    if (!allowed.has(relativePath)) {
      throw new ReleaseVerificationError('changed-path-out-of-dag', `Changed path is not traced by the implementation DAG: ${relativePath}`);
    }
  }

  const componentFiles = changedFiles.filter((relativePath) =>
    relativePath.startsWith('packages/contact-center/cc-components/src/')
  );
  for (const relativePath of componentFiles) {
    const absolutePath = path.join(repositoryRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    const text = fs.readFileSync(absolutePath, 'utf8');
    if (/@webex\/cc-task|@webex\/cc-ai-assistant/.test(text)) {
      throw new ReleaseVerificationError('dependency-direction-violation', 'cc-components imported an upstream package');
    }
  }

  const changedSet = new Set(changedFiles);
  const touchedModules = new Set();
  for (const relativePath of changedFiles) {
    const match = /^packages\/contact-center\/([^/]+)\/(?:src|package\.json|tests)\//.exec(relativePath);
    if (match) {
      touchedModules.add(match[1]);
    }
  }
  for (const moduleName of touchedModules) {
    const specPath = `packages/contact-center/${moduleName}/ai-docs/${moduleName}-spec.md`;
    if (!changedSet.has(specPath) && fs.existsSync(path.join(repositoryRoot, specPath))) {
      throw new ReleaseVerificationError('module-spec-stale', `Stale module spec: ${specPath}`);
    }
  }

  const staleSpecs = context.staleSpecs || [];
  if (staleSpecs.length > 0) {
    throw new ReleaseVerificationError('module-spec-stale', `Stale module specs: ${staleSpecs.join(', ')}`);
  }
  return {changedFiles: changedFiles.length};
}

function readHeadCommit(repositoryRoot) {
  return readGitIdentity(repositoryRoot).headCommit;
}

function statusIsPassed(record) {
  return record.passed === true || record.status === 'passed' || record.result === 'passed';
}

function assertGatePassed(record, label) {
  if (!isRecord(record)) {
    throw new ReleaseVerificationError('gate-receipt-invalid', `${label} gate receipt is invalid`);
  }
  if (record.pending || record.skipped || record.status === 'pending' || record.status === 'skipped') {
    throw new ReleaseVerificationError('gate-receipt-not-passed', `${label} gate receipt is pending or skipped`);
  }
  if (record.failed === true || (typeof record.failed === 'number' && record.failed > 0)) {
    throw new ReleaseVerificationError('gate-receipt-not-passed', `${label} gate receipt failed`);
  }
  if (record.metrics && (record.metrics.pending > 0 || record.metrics.skipped > 0 || record.metrics.failed > 0)) {
    throw new ReleaseVerificationError('gate-receipt-not-passed', `${label} gate receipt has pending, skipped, or failed metrics`);
  }
  if (!statusIsPassed(record) || record.passed === false ||
      (record.status !== undefined && record.status !== 'passed') ||
      (record.result !== undefined && record.result !== 'passed')) {
    throw new ReleaseVerificationError('gate-receipt-not-passed', `${label} gate receipt is not passed`);
  }
}

function getGateRecord(gates, gateName) {
  if (!isRecord(gates)) {
    return undefined;
  }
  return gates[gateName] || gates[gateName.toLowerCase()] || gates[gateName.replace(/([A-Z])/g, '_$1').toLowerCase()];
}

function validateReleaseGateEvidence(releaseReceipt, repositoryRoot) {
  const gates = releaseReceipt.gates || releaseReceipt.gateReceipts || releaseReceipt.receipts;
  if (!isRecord(gates)) {
    throw new ReleaseVerificationError('release-gates-missing', 'Release receipt gate evidence is missing');
  }
  for (const gateName of REQUIRED_RELEASE_GATES) {
    const gate = getGateRecord(gates, gateName);
    if (!gate) {
      throw new ReleaseVerificationError('release-gate-missing', `Release receipt is missing ${gateName} gate`);
    }
    assertGatePassed(gate, gateName);
    const gateHash = gate.sha256 || gate.receiptSha256 || gate.receipt_sha256 || gate.hash;
    if (!SHA256_RE.test(gateHash || '')) {
      throw new ReleaseVerificationError('release-gate-hash-missing', `${gateName} gate hash is missing`);
    }
    const gatePath = gate.path || gate.receiptPath || gate.receipt_path;
    const {absolutePath} = assertRealFileInsideRoot(repositoryRoot, gatePath, 'release-gate-path-invalid');
    if (hashFile(absolutePath) !== gateHash) {
      throw new ReleaseVerificationError('release-gate-hash-mismatch', `${gateName} gate evidence hash mismatch`);
    }
    const evidence = readJson(absolutePath, 'gate-receipt-invalid');
    assertGatePassed(evidence, gateName);
    if (evidence.headCommit !== releaseReceipt.headCommit) {
      throw new ReleaseVerificationError('release-gate-head-mismatch', `${gateName} gate evidence HEAD mismatch`);
    }
  }
  const d0 = getGateRecord(gates, 'D0');
  const postWrapUpProbe =
    d0.postWrapUpSameTaskProbe ||
    d0.post_wrap_up_same_task_probe ||
    d0.sameTaskPostWrapUpProbe ||
    d0.same_task_post_wrap_up_probe;
  if (postWrapUpProbe !== 'fulfilled' && postWrapUpProbe !== true) {
    throw new ReleaseVerificationError('d0-post-wrap-up-probe-missing', 'D0 same-Task post-wrap-up probe is missing');
  }
}

function releaseTypeIsMajor(record) {
  return record.releaseType === 'major' || record.type === 'major' || record.major === true || record.semver === 'major';
}

function recordHasBreakingMetadata(record) {
  const text = stableStringify(record);
  return record.breaking === true || record.isBreaking === true || /BREAKING[ -]CHANGE/i.test(text);
}

function verifySemanticReleaseEvidence(releaseReceipt) {
  const semantic =
    releaseReceipt.semanticRelease ||
    releaseReceipt.semantic_release ||
    getNestedRecord(releaseReceipt, ['release', 'semanticRelease']);
  if (!isRecord(semantic)) {
    throw new ReleaseVerificationError('semantic-release-evidence-missing', 'Semantic-release evidence is missing');
  }
  const packages = Array.isArray(semantic.packages) ? semantic.packages : [];
  const byName = new Map(packages.filter(isRecord).map((entry) => [entry.name, entry]));
  for (const packageName of ['@webex/cc-task', '@webex/cc-components']) {
    const entry = byName.get(packageName);
    if (!entry || !releaseTypeIsMajor(entry) || !recordHasBreakingMetadata(entry)) {
      throw new ReleaseVerificationError('semantic-release-major-missing', `${packageName} is not classified as a breaking major release`);
    }
  }
  const implementationCommit = semantic.implementationCommit || semantic.implementation_commit || releaseReceipt.implementationCommit;
  if (!isRecord(implementationCommit) || !recordHasBreakingMetadata(implementationCommit)) {
    throw new ReleaseVerificationError(
      'semantic-release-breaking-metadata-missing',
      'Implementation commit breaking-change metadata is missing'
    );
  }
  if (implementationCommit.hash !== releaseReceipt.headCommit) {
    throw new ReleaseVerificationError('semantic-release-head-mismatch', 'Implementation commit must match release HEAD');
  }
}

function verifyGateReceipts(context = {}) {
  const repositoryRoot = context.repositoryRoot || process.cwd();
  const releaseContext = context.releaseContext || loadReleaseContext(repositoryRoot, context);
  const releaseReceipt = releaseContext.releaseReceipt;
  validateReleaseGateEvidence(releaseReceipt, repositoryRoot);
  verifySemanticReleaseEvidence(releaseReceipt);

  for (const relativePath of [
    '.matrix/results/prog-mini-js/gate_verify.json',
    '.matrix/results/prog-mini-js/gate_ux_visual_comparison.json',
    '.matrix/results/prog-mini-js/gate_ux_visual_comparison_prepare_implementation.json',
    '.matrix/results/prog-mini-js/gate_ux_visual_cycle_implementation.json',
  ]) {
    const gatePath = path.join(repositoryRoot, relativePath);
    if (!fs.existsSync(gatePath)) {
      continue;
    }
    const gate = readJson(gatePath, 'gate-receipt-invalid');
    assertGatePassed(gate, relativePath);
  }
  return {releaseReceiptPresent: true, gates: REQUIRED_RELEASE_GATES.length};
}

async function runReleaseVerification(context = {}) {
  const repositoryRoot = context.repositoryRoot || process.cwd();
  const releaseContext = loadReleaseContext(repositoryRoot, context);
  const scopedContext = {...context, repositoryRoot, releaseContext};
  await verifySDKReceipt(scopedContext);
  const ux = verifyUXEvidence(scopedContext);
  const publishable = verifyPublishableDependencies(scopedContext);
  const privacy = verifyPrivacyAllowlist(scopedContext);
  const traceability = verifyDAGTraceability(scopedContext);
  const gates = verifyGateReceipts(scopedContext);
  return {ux, publishable, privacy, traceability, gates};
}

async function runCli(context = {repositoryRoot: process.cwd()}) {
  try {
    await runReleaseVerification(context);
  } catch (error) {
    const code = error instanceof ReleaseVerificationError ? error.code : 'internal-error';
    const detail = error instanceof ReleaseVerificationError && error.provenance
      ? ` ${JSON.stringify(error.provenance)}` : '';
    process.stderr.write(`verify-ai-summary-release:${code}${detail}${os.EOL}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  ALLOWED_CHANGED_PATHS,
  PACKED_WORKSPACES,
  ReleaseVerificationError,
  runCli,
  runReleaseVerification,
  loadReleaseContext,
  verifyDAGTraceability,
  verifyGateReceipts,
  verifyPrivacyAllowlist,
  verifyPublishableDependencies,
  verifySDKReceipt,
  verifyUXEvidence,
};
