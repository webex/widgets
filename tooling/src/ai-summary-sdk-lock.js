const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');
const {isDeepStrictEqual} = require('util');
const zlib = require('zlib');
const {assertSoleSDKWorkspaceDependency, inspectAISummaryPackedWorkspaceBoundary} = require('./publish-boundary');

const RECEIPT_RELATIVE_PATH = 'design/default/sdk_package_lock.json';
const ROOT_PACKAGE_RELATIVE_PATH = 'package.json';
const ROOT_LOCK_RELATIVE_PATH = 'yarn.lock';
const STORE_PACKAGE_RELATIVE_PATH = 'packages/contact-center/store/package.json';
const SDK_PACKAGE_NAME = '@webex/contact-center';
const SDK_SOURCE_PACKAGE_RELATIVE_PATH = 'packages/@webex/contact-center';
const SDK_TARBALL_RELATIVE_PATH = 'vendor/contact-center-cc-summaries.tgz';
const EXPECTED_SDK_BRANCH = 'cc-summaries';
const SDK_SUMMARY_TIMEOUT_MS = 15000;
const DEFAULT_CHILD_TIMEOUT_MS = 10 * 60 * 1000;
const SDK_CONTRACT_ROOT_ENV = 'AI_SUMMARY_SDK_EXTRACT_ROOT';
const STORE_CONTRACT_TEST_RELATIVE_PATH = 'tests/ai-summary-contract.ts';
const REQUIRED_NODE_VERSION_PREFIX = '22.14.';
const REQUIRED_NODE_VERSION_DISPLAY = 'v22.14.x';
const REQUIRED_TASK_SUMMARY_EVENTS = Object.freeze([
  ['TASK_MID_CALL_SUMMARY_RECEIVED', 'task:midCallSummaryReceived'],
  ['TASK_FEATURE_ENABLEMENT', 'task:featureEnablement'],
]);
const SDK_INSTALL_YARN_ARGS = Object.freeze(['install', '--immutable']);
const SDK_BUILD_YARN_ARGV = Object.freeze([
  Object.freeze(['build:tools']),
  Object.freeze(['workspace', SDK_PACKAGE_NAME, 'run', 'compile']),
]);
const WIDGET_LOCK_YARN_ARGS = Object.freeze(['install']);
const WIDGET_INSTALL_YARN_ARGS = Object.freeze(['install', '--immutable']);
const STORE_CONTRACT_YARN_ARGS = Object.freeze([
  'workspace',
  '@webex/cc-store',
  'test:unit',
  '--runInBand',
  '--runTestsByPath',
  STORE_CONTRACT_TEST_RELATIVE_PATH,
]);

const UX_AGGREGATES = Object.freeze({
  manifestSha256: '58d925e6d12c377589120f39fc170f1d80692d1901522fce0959b70e17f8c1b4',
  sourceManifestSha256: 'a266410383fc773812cd0a3352313d8db5e3e3828d5e584aaeee1df42709f162',
  sourceIdentitySha256: '50073d2c12591ac4c682e8599c1ecae9f2797cae9ed85542bfebf068b5ebfecb',
  requirementSha256: '31061b7752dfc3e786905ee3a370527144aed1dc68641d641646dff0c1cf4c46',
});

const UX_SOURCE_FILES = Object.freeze([
  {
    sourceId: 'UX-001',
    kind: 'sceneGraph',
    path: '.ccwidgets/midcall/figma_target_8061_880455_compact.json',
    sha256: '7183f1b874339e30a7c820179d63fabc500a1721f2206194a3fe9c4317880603',
  },
  {
    sourceId: 'UX-001',
    kind: 'textContent',
    path: '.ccwidgets/midcall/figma_target_8061_880455_text.json',
    sha256: '804b66441dcd6a1ae3c43d3907bd255c3db2a1457539b3f7e3888d593320d666',
  },
  {
    sourceId: 'UX-001',
    kind: 'screenshot',
    path: '.ccwidgets/midcall/midcall.png',
    sha256: '5fee49d4111bb9b5a950e441821abc001aa99a39fdd6607b7169e2754654db0f',
  },
  {
    sourceId: 'UX-002',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_generating/figma_target_5669_263180_compact.json',
    sha256: '2c1ade086aaf3bea8f9719f37b6e3a06ca1d7e93737cea58b368bd49efbffd4a',
  },
  {
    sourceId: 'UX-002',
    kind: 'textContent',
    path: '.ccwidgets/postcall_generating/figma_target_5669_263180_text.json',
    sha256: '42921d9839a89fa948acd22563579a62472b14a8cc6121b2d0c7883d5b71f3ce',
  },
  {
    sourceId: 'UX-002',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_generating/postcall_generating.png',
    sha256: '0de0aeb692ae83a922898009577b11d9d027b21c8653b05c947ba03e64bc8a21',
  },
  {
    sourceId: 'UX-003',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_summary_edit/figma_target_5669_263754_compact.json',
    sha256: '9e9378e384df92e816a3c05e7faff8c800da2e1f6334e149a9522e24c837aa66',
  },
  {
    sourceId: 'UX-003',
    kind: 'textContent',
    path: '.ccwidgets/postcall_summary_edit/figma_target_5669_263754_text.json',
    sha256: '58457c269bf1c9efff9f43e63a92f33a7b08f8f18ad43653403084b5cb46fc50',
  },
  {
    sourceId: 'UX-003',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_summary_edit/postcall_summary_edit.png',
    sha256: '92b2ef6fe8473c96f422ebcfece7699d5e3360503921ff40e36b281e355ba6f1',
  },
  {
    sourceId: 'UX-004',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_summary_hover_thumbsup/figma_target_5669_264384_compact.json',
    sha256: 'e084f1942b911286d4eb58e7db3082130e808e12c5197fba565d069860966e13',
  },
  {
    sourceId: 'UX-004',
    kind: 'textContent',
    path: '.ccwidgets/postcall_summary_hover_thumbsup/figma_target_5669_264384_text.json',
    sha256: 'c4e6025190ce7f9f6b0b81fabb3eb80c4686f69f5fb4b2ac3769896d203000b1',
  },
  {
    sourceId: 'UX-004',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_summary_hover_thumbsup/postcall_summary_hover_thumbsup.png',
    sha256: '3f9013a7a0772aeef98b55bf8e301957c74dca912d500e87dfeaf12f55fc50ca',
  },
  {
    sourceId: 'UX-005',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_summary_selected_thumbsup/figma_target_5669_264503_compact.json',
    sha256: '4330bf697349d52df2493b1675343d5d27c60075eddc0a6a96258b29f0fa79fb',
  },
  {
    sourceId: 'UX-005',
    kind: 'textContent',
    path: '.ccwidgets/postcall_summary_selected_thumbsup/figma_target_5669_264503_text.json',
    sha256: '6a08810d6325a5cb7290712373047c61ed1044e7ca6f708d3ab202f80ad4ba00',
  },
  {
    sourceId: 'UX-005',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_summary_selected_thumbsup/postcall_summary_selected_thumbsup.png',
    sha256: '3628b688d6d84ee61ed1c22e1b77ee6aabb7026656ff8d9d15739b549bdeeeca',
  },
  {
    sourceId: 'UX-006',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_summary_hover_thumbsdown/figma_target_5669_264622_compact.json',
    sha256: '41f147d96db6b2133f0f6994561cc577b0ae121ad9cf966cfdcc300f8b6d9f8e',
  },
  {
    sourceId: 'UX-006',
    kind: 'textContent',
    path: '.ccwidgets/postcall_summary_hover_thumbsdown/figma_target_5669_264622_text.json',
    sha256: 'f22fa4cce01a2cc8cb9d7ce334c261176fce196116ea190ef06d5f9c26242268',
  },
  {
    sourceId: 'UX-006',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_summary_hover_thumbsdown/postcall_summary_hover_thumbsdown.png',
    sha256: '098c803e608ce2cc2f8c79ec12208a41ce5ba8ee2ffc66f2071801e2b4872641',
  },
  {
    sourceId: 'UX-007',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_summary_selected_thumbsdown/figma_target_5669_264860_compact.json',
    sha256: 'd78d2465ad40c21102a167d5cce976f1541e9a26e415f45069f91297c2ca6550',
  },
  {
    sourceId: 'UX-007',
    kind: 'textContent',
    path: '.ccwidgets/postcall_summary_selected_thumbsdown/figma_target_5669_264860_text.json',
    sha256: '5dfe180ec35e38af7df336bbe1acba5b6a5e58c7c476a5fa7d60aacf96e1cc6d',
  },
  {
    sourceId: 'UX-007',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_summary_selected_thumbsdown/postcall_summary_selected_thumbsdown.png',
    sha256: '7510c740d754cd9e612fc0cfb8ec080682f66a927e941c705cfe13d167920203',
  },
  {
    sourceId: 'UX-008',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_summary_hover_copy/figma_target_4920_216835_compact.json',
    sha256: '40d15e6e6e951c6ff05d451add94cde1e2a6ed1517489ba3c7153d104631eb61',
  },
  {
    sourceId: 'UX-008',
    kind: 'textContent',
    path: '.ccwidgets/postcall_summary_hover_copy/figma_target_4920_216835_text.json',
    sha256: '15756650eb613cc81bfdc0d5aaa8f75f7e2009c66a79c28dd108ad39aab0caf7',
  },
  {
    sourceId: 'UX-008',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_summary_hover_copy/postcall_summary_hover_copy.png',
    sha256: '3b1e78288b4316b4c1575f38112d924c319431f8f07bdcd88a11343a9fee6e21',
  },
  {
    sourceId: 'UX-009',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_summary_selected_copy/figma_target_4920_216954_compact.json',
    sha256: '7b8b3f8148adb46ae59cf36ffdb63e9f81f0035f7d14a433840183df46926a7a',
  },
  {
    sourceId: 'UX-009',
    kind: 'textContent',
    path: '.ccwidgets/postcall_summary_selected_copy/figma_target_4920_216954_text.json',
    sha256: '059a61503ef5c9eb452b7c03478bb94387143f9d2d84bc0bb433e18b8e003e33',
  },
  {
    sourceId: 'UX-009',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_summary_selected_copy/postcall_summary_selected_copy.png',
    sha256: '71e19e3be8da9045fce78e674006cd8963bd95f15642ff6a3884686db5c5e4b1',
  },
  {
    sourceId: 'UX-010',
    kind: 'sceneGraph',
    path: '.ccwidgets/postcall_summary_error/figma_target_5669_264979_compact.json',
    sha256: '3ab596f96b5a49eb56822816be31f9d4f739bf79f4a50ad09521ccfc491b8de7',
  },
  {
    sourceId: 'UX-010',
    kind: 'textContent',
    path: '.ccwidgets/postcall_summary_error/figma_target_5669_264979_text.json',
    sha256: '90de99f4579e9eacadf068fa6fb48eff70eadad76e97d342094363b22fe0dbaa',
  },
  {
    sourceId: 'UX-010',
    kind: 'screenshot',
    path: '.ccwidgets/postcall_summary_error/postcall_summary_error.png',
    sha256: '6d54cafe81f3693a16017e19adff9aaaf4a1adbae67b779a3f49d6c1fda15ff5',
  },
]);

class LockToolError extends Error {
  constructor(code, message, details) {
    super(message || code);
    this.name = 'LockToolError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

const toPosix = (value) => value.split(path.sep).join('/');

const stableStringify = (value) => JSON.stringify(value, null, 2) + '\n';

function compareManifestPath(left, right) {
  if (left.path === right.path) {
    return 0;
  }
  return left.path < right.path ? -1 : 1;
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function hashFile(filePath) {
  return hashBuffer(fs.readFileSync(filePath));
}

function readJson(filePath, code = 'json-read-failed') {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new LockToolError(code, 'JSON file is missing or invalid');
  }
}

function assertAbsoluteRoot(root, label) {
  if (!root || typeof root !== 'string' || !path.isAbsolute(root)) {
    throw new LockToolError(`${label}-not-absolute`, `${label} must be an absolute path`);
  }
}

function canonicalRoot(root, label) {
  assertAbsoluteRoot(root, label);
  let stat;
  try {
    stat = fs.statSync(root);
  } catch (error) {
    throw new LockToolError(`${label}-missing`, `${label} does not exist`);
  }
  if (!stat.isDirectory()) {
    throw new LockToolError(`${label}-not-directory`, `${label} must be a directory`);
  }
  return fs.realpathSync(root);
}

function canonicalRootFrom(root, baseRoot, label) {
  if (typeof root !== 'string' || root.length === 0) {
    return canonicalRoot(root, label);
  }
  return canonicalRoot(path.isAbsolute(root) ? root : path.resolve(baseRoot, root), label);
}

function isSubPath(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function assertNoOverlappingRoots(sourceRoot, targetRoot) {
  if (sourceRoot === targetRoot) {
    return;
  }
  if (isSubPath(sourceRoot, targetRoot) || isSubPath(targetRoot, sourceRoot)) {
    throw new LockToolError('root-overlap', 'source and target roots must not overlap');
  }
}

function runGit(root, args, execFileSyncImpl = childProcess.execFileSync) {
  try {
    return execFileSyncImpl('git', ['-C', root, ...args], {
      cwd: root,
      env: makeChildEnv(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    throw new LockToolError('git-root-invalid', 'git root validation failed');
  }
}

function validateGitRelationship(sourceRoot, targetRoot, execFileSyncImpl) {
  const gitTop = canonicalRoot(runGit(targetRoot, ['rev-parse', '--show-toplevel'], execFileSyncImpl), 'target-git-root');
  if (gitTop !== targetRoot) {
    throw new LockToolError('target-root-mismatch', 'target root must be the git toplevel');
  }

  const commonGitDir = canonicalRoot(
    runGit(targetRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir'], execFileSyncImpl),
    'target-git-common-dir'
  );
  if (path.basename(commonGitDir) !== '.git') {
    throw new LockToolError('git-common-dir-invalid', 'git common dir must be named .git');
  }
  const expectedSourceRoot = canonicalRoot(path.dirname(commonGitDir), 'source-root');
  if (sourceRoot !== expectedSourceRoot) {
    throw new LockToolError('source-root-mismatch', 'source root must match the git common checkout root');
  }
}

function assertSafeManifest(manifest) {
  const paths = new Set();
  for (const entry of manifest) {
    if (!entry || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string') {
      throw new LockToolError('manifest-invalid', 'UX manifest entries must include path and sha256');
    }
    if (path.isAbsolute(entry.path) || entry.path.includes('\\')) {
      throw new LockToolError('manifest-path-invalid', 'UX manifest paths must be relative POSIX paths');
    }
    const normalized = path.posix.normalize(entry.path);
    if (normalized !== entry.path || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) {
      throw new LockToolError('manifest-path-escape', 'UX manifest path escapes root');
    }
    if (paths.has(entry.path)) {
      throw new LockToolError('manifest-duplicate', 'UX manifest contains duplicate paths');
    }
    paths.add(entry.path);
  }
}

function resolveUnder(root, relativePath) {
  const resolved = path.resolve(root, ...relativePath.split('/'));
  if (resolved !== root && !isSubPath(root, resolved)) {
    throw new LockToolError('path-escape', 'resolved path escapes root');
  }
  return resolved;
}

function assertNoSymlinkPath(root, relativePath, allowMissingLeaf = false) {
  const parts = relativePath.split('/');
  let current = root;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (allowMissingLeaf && error.code === 'ENOENT') {
        return;
      }
      throw new LockToolError('path-missing', 'manifest path is missing');
    }
    if (stat.isSymbolicLink()) {
      throw new LockToolError('symlink-rejected', 'symlink paths are not admissible');
    }
  }
}

function ensureTargetParentDirectory(root, relativePath) {
  const parts = relativePath.split('/');
  let current = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    current = path.join(current, parts[index]);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      fs.mkdirSync(current);
      stat = fs.lstatSync(current);
    }
    if (stat.isSymbolicLink()) {
      throw new LockToolError('symlink-rejected', 'symlink paths are not admissible');
    }
    if (!stat.isDirectory()) {
      throw new LockToolError('path-parent-not-directory', 'manifest parent path must be a directory');
    }
  }
}

function readManifestFile(root, entry) {
  assertNoSymlinkPath(root, entry.path);
  const filePath = resolveUnder(root, entry.path);
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile()) {
    throw new LockToolError('non-regular-file', 'manifest path must be a regular file');
  }
  const bytes = fs.readFileSync(filePath);
  const sha256 = hashBuffer(bytes);
  if (sha256 !== entry.sha256) {
    throw new LockToolError('hash-mismatch', 'manifest file hash mismatch');
  }
  return {filePath, bytes, sizeBytes: stat.size, sha256};
}

function removePathQuietly(targetPath) {
  try {
    fs.rmSync(targetPath, {recursive: true, force: true});
  } catch (error) {
    // Best-effort cleanup only; never mask the original failure.
  }
}

function copyManifestToTemp(sourceRoot, targetRoot, manifest) {
  const tempRoot = fs.mkdtempSync(path.join(targetRoot, '.ai-summary-ux-stage-'));
  try {
    for (const entry of manifest) {
      const source = readManifestFile(sourceRoot, entry);
      const tempPath = resolveUnder(tempRoot, entry.path);
      fs.mkdirSync(path.dirname(tempPath), {recursive: true});
      fs.writeFileSync(tempPath, source.bytes);
      const staged = readManifestFile(tempRoot, entry);
      if (staged.sha256 !== source.sha256) {
        throw new LockToolError('stage-hash-mismatch', 'staged bytes do not match source bytes');
      }
    }
    return tempRoot;
  } catch (error) {
    removePathQuietly(tempRoot);
    throw error;
  }
}

function promoteStagedFiles(tempRoot, targetRoot, manifest) {
  const backupRoot = path.join(tempRoot, '.promotion-backup');
  const transactions = [];
  const restoreTransactions = () => {
    for (const transaction of transactions.slice().reverse()) {
      if (transaction.backupPath) {
        removePathQuietly(transaction.targetPath);
        fs.mkdirSync(path.dirname(transaction.targetPath), {recursive: true});
        fs.renameSync(transaction.backupPath, transaction.targetPath);
      } else {
        removePathQuietly(transaction.targetPath);
      }
    }
  };

  try {
    for (const entry of manifest) {
      assertNoSymlinkPath(targetRoot, entry.path, true);
      ensureTargetParentDirectory(targetRoot, entry.path);
      const targetPath = resolveUnder(targetRoot, entry.path);
      const tempPath = resolveUnder(tempRoot, entry.path);
      let backupPath = null;

      if (fs.existsSync(targetPath)) {
        assertNoSymlinkPath(targetRoot, entry.path);
        const targetStat = fs.lstatSync(targetPath);
        if (!targetStat.isFile()) {
          throw new LockToolError('non-regular-file', 'manifest path must be a regular file');
        }
        if (hashFile(targetPath) === entry.sha256) {
          continue;
        }
        backupPath = resolveUnder(backupRoot, entry.path);
        fs.mkdirSync(path.dirname(backupPath), {recursive: true});
        fs.renameSync(targetPath, backupPath);
      }

      transactions.push({targetPath, backupPath});
      fs.renameSync(tempPath, targetPath);
      const promoted = readManifestFile(targetRoot, entry);
      if (promoted.sha256 !== entry.sha256) {
        throw new LockToolError('promote-hash-mismatch', 'promoted file hash mismatch');
      }
    }
  } catch (error) {
    restoreTransactions();
    throw error;
  }
}

function stageUXSources(options) {
  const manifest = options.manifest || UX_SOURCE_FILES;
  assertSafeManifest(manifest);
  const sourceRoot = canonicalRoot(options.sourceRoot, 'source-root');
  const targetRoot = canonicalRoot(options.targetRoot, 'target-root');
  assertNoOverlappingRoots(sourceRoot, targetRoot);
  validateGitRelationship(sourceRoot, targetRoot, options.execFileSync);

  const tempRoot = copyManifestToTemp(sourceRoot, targetRoot, manifest);
  try {
    promoteStagedFiles(tempRoot, targetRoot, manifest);
  } finally {
    removePathQuietly(tempRoot);
  }

  return {
    copied: manifest.map((entry) => entry.path),
    sourceRoot,
    targetRoot,
  };
}

function buildUXReceipt(widgetsRoot, manifest, now = new Date()) {
  const files = manifest.map((entry) => {
    const current = readManifestFile(widgetsRoot, entry);
    return {
      sourceId: entry.sourceId,
      kind: entry.kind,
      path: entry.path,
      sha256: current.sha256,
      sizeBytes: current.sizeBytes,
    };
  });

  return {
    status: 'sealed',
    resolutionRoot: '.',
    sealedAt: now.toISOString(),
    manifestSha256: UX_AGGREGATES.manifestSha256,
    sourceManifestSha256: UX_AGGREGATES.sourceManifestSha256,
    sourceIdentitySha256: UX_AGGREGATES.sourceIdentitySha256,
    requirementSha256: UX_AGGREGATES.requirementSha256,
    files,
  };
}

function assertUXReceiptMatchesTarget(widgetsRoot, manifest, uxReceipt) {
  if (uxReceipt?.status !== 'sealed' || uxReceipt?.resolutionRoot !== '.') {
    throw new LockToolError('ux-receipt-unsealed', 'UX receipt is not sealed to the target root');
  }
  if (!Array.isArray(uxReceipt.files) || uxReceipt.files.length !== manifest.length) {
    throw new LockToolError('ux-receipt-file-count', 'UX receipt file set is incomplete');
  }
  if (typeof uxReceipt.sealedAt !== 'string' || !Number.isFinite(Date.parse(uxReceipt.sealedAt))) {
    throw new LockToolError('ux-receipt-drift', 'UX receipt no longer matches target files');
  }
  const expected = buildUXReceipt(widgetsRoot, manifest);
  if (!isDeepStrictEqual(uxReceipt, {...expected, sealedAt: uxReceipt.sealedAt})) {
    throw new LockToolError('ux-receipt-drift', 'UX receipt no longer matches target files');
  }
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  try {
    fs.writeFileSync(tempPath, stableStringify(data), {encoding: 'utf8', mode: 0o644});
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    removePathQuietly(tempPath);
    throw error;
  }
}

function readReceipt(receiptPath) {
  try {
    return JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  } catch (error) {
    throw new LockToolError('receipt-missing', 'receipt is missing or unreadable');
  }
}

function assertWidgetsRoot(widgetsRoot, execFileSyncImpl) {
  const targetRoot = canonicalRootFrom(widgetsRoot, process.cwd(), 'widgets-root');
  const gitTop = canonicalRoot(runGit(targetRoot, ['rev-parse', '--show-toplevel'], execFileSyncImpl), 'widgets-git-root');
  if (gitTop !== targetRoot) {
    throw new LockToolError('widgets-root-mismatch', 'widgets root must be the git toplevel');
  }
  return targetRoot;
}

function receiptPathForRoot(widgetsRoot, override) {
  return override || path.join(widgetsRoot, RECEIPT_RELATIVE_PATH);
}

function sealUXSources(options) {
  if (options.sourceRoot || options.targetRoot) {
    throw new LockToolError('target-only-required', 'seal-ux accepts only the target widgets root');
  }
  const manifest = options.manifest || UX_SOURCE_FILES;
  assertSafeManifest(manifest);
  const widgetsRoot = assertWidgetsRoot(options.widgetsRoot, options.execFileSync);
  const receiptPath = receiptPathForRoot(widgetsRoot, options.receiptPath);
  const previousReceipt = fs.existsSync(receiptPath) ? fs.readFileSync(receiptPath) : undefined;
  const uxReceipt = buildUXReceipt(widgetsRoot, manifest, options.now || new Date());
  let sdkReceipt = {status: 'pending'};
  if (previousReceipt !== undefined) {
    let parsed;
    try {
      parsed = JSON.parse(previousReceipt.toString('utf8'));
    } catch (error) {
      throw new LockToolError('receipt-schema-invalid', 'existing receipt is invalid');
    }
    if (
      parsed.schemaVersion !== 1 ||
      (parsed.sdk?.status !== 'pending' && parsed.sdk?.status !== 'sealed')
    ) {
      throw new LockToolError('receipt-schema-invalid', 'existing receipt is invalid');
    }
    sdkReceipt = parsed.sdk;
    if (parsed.ux?.status === 'sealed') {
      // assertUXReceiptMatchesTarget independently reopens and hashes every target input.
      // Rechecking unchanged evidence must not invalidate downstream visual receipts
      // by refreshing sealedAt or reserializing the existing lock file.
      assertUXReceiptMatchesTarget(widgetsRoot, manifest, parsed.ux);
      return parsed;
    }
  }
  const nextReceipt = {
    schemaVersion: 1,
    sdk: sdkReceipt,
    ux: uxReceipt,
  };

  try {
    (options.writeJsonAtomic || writeJsonAtomic)(receiptPath, nextReceipt);
  } catch (error) {
    if (previousReceipt === undefined) {
      removePathQuietly(receiptPath);
    } else {
      fs.writeFileSync(receiptPath, previousReceipt);
    }
    throw new LockToolError('receipt-write-failed', 'receipt write failed');
  }

  return nextReceipt;
}

function verifyUXSources(options) {
  if (options.sourceRoot || options.targetRoot) {
    throw new LockToolError('target-only-required', 'verify-ux accepts only the target widgets root');
  }
  const manifest = options.manifest || UX_SOURCE_FILES;
  assertSafeManifest(manifest);
  const widgetsRoot = assertWidgetsRoot(options.widgetsRoot, options.execFileSync);
  const receiptPath = receiptPathForRoot(widgetsRoot, options.receiptPath);
  const receipt = readReceipt(receiptPath);
  if (
    !receipt ||
    receipt.schemaVersion !== 1 ||
    (receipt.sdk?.status !== 'pending' && receipt.sdk?.status !== 'sealed')
  ) {
    throw new LockToolError('receipt-schema-invalid', 'receipt schema is invalid');
  }
  assertUXReceiptMatchesTarget(widgetsRoot, manifest, receipt.ux);
  return receipt;
}

function assertPlainRegistrySemver(descriptor, label = 'sdk dependency') {
  if (typeof descriptor !== 'string' || descriptor.length === 0) {
    throw new LockToolError('sdk-dependency-invalid', `${label} must be a registry semver descriptor`);
  }
  if (/^(?:file|portal|link|workspace|patch|exec|git|https?):/i.test(descriptor) || descriptor.includes('/')) {
    throw new LockToolError('sdk-dependency-local', `${label} must not use a local or remote protocol`);
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(descriptor)) {
    throw new LockToolError('sdk-dependency-invalid', `${label} must be an exact semver version`);
  }
}

function getStoreSdkDescriptor(widgetsRoot) {
  try {
    assertSoleSDKWorkspaceDependency(widgetsRoot);
  } catch (error) {
    throw new LockToolError('sdk-workspace-owner-invalid', 'Production SDK ownership or registry descriptors are invalid');
  }
  const storePackagePath = path.join(widgetsRoot, STORE_PACKAGE_RELATIVE_PATH);
  const storePackage = readJson(storePackagePath, 'store-package-invalid');
  const descriptor = storePackage.dependencies?.[SDK_PACKAGE_NAME];
  assertPlainRegistrySemver(descriptor, 'store SDK dependency');
  return descriptor;
}

function stripPrerelease(version) {
  const match = /^(\d+\.\d+\.\d+)/.exec(version);
  if (!match) {
    throw new LockToolError('sdk-version-invalid', 'SDK dependency version must start with a semver core');
  }
  return match[1];
}

function deriveSdkVersion(registryDescriptor, commit) {
  return `${stripPrerelease(registryDescriptor)}-cc-summaries.${commit.slice(0, 12)}`;
}

function assertWidgetsNodeLinker(widgetsRoot, execFileSyncImpl = childProcess.execFileSync) {
  const yarnrcPath = path.join(widgetsRoot, '.yarnrc.yml');
  const yarnrc = fs.readFileSync(yarnrcPath, 'utf8');
  if (!/^nodeLinker:\s*node-modules\s*$/m.test(yarnrc)) {
    throw new LockToolError('node-linker-invalid', 'repository .yarnrc.yml must use node-modules');
  }
  let resolved;
  try {
    resolved = execFileSyncImpl('corepack', ['yarn', 'config', 'get', 'nodeLinker'], {
      cwd: widgetsRoot,
      env: makeChildEnv(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    throw new LockToolError('node-linker-unresolved', 'failed to resolve active Yarn nodeLinker');
  }
  if (resolved !== 'node-modules') {
    throw new LockToolError('node-linker-invalid', 'active Yarn nodeLinker must be node-modules');
  }
  return resolved;
}

function assertCleanGitSource(sourceRoot, execFileSyncImpl = childProcess.execFileSync) {
  const branch = runGit(sourceRoot, ['rev-parse', '--abbrev-ref', 'HEAD'], execFileSyncImpl);
  if (branch !== EXPECTED_SDK_BRANCH) {
    throw new LockToolError('sdk-branch-invalid', 'SDK source must be on the cc-summaries branch');
  }
  const commit = runGit(sourceRoot, ['rev-parse', 'HEAD'], execFileSyncImpl);
  const status = runGit(sourceRoot, ['status', '--porcelain=v1', '--untracked-files=all'], execFileSyncImpl);
  if (status.length > 0) {
    throw new LockToolError('sdk-source-dirty', 'SDK source checkout must be clean');
  }
  return {branch, commit};
}

function readSdkPackageManager(stageRoot) {
  return readPackageManagerPin(stageRoot, 'sdk');
}

function readPackageManagerPin(root, label) {
  const rootPackage = readJson(
    path.join(root, ROOT_PACKAGE_RELATIVE_PATH),
    label === 'sdk' ? 'sdk-root-package-invalid' : 'root-package-invalid'
  );
  const code = `${label}-package-manager-invalid`;
  if (typeof rootPackage.packageManager !== 'string' || !/^yarn@\d+\.\d+\.\d+$/.test(rootPackage.packageManager)) {
    throw new LockToolError(code, `${label} root must declare an exact Yarn packageManager pin`);
  }
  return rootPackage.packageManager;
}

function yarnVersionFromPackageManager(packageManager, label) {
  const match = /^yarn@(\d+\.\d+\.\d+)$/.exec(packageManager);
  if (!match) {
    throw new LockToolError(`${label}-package-manager-invalid`, `${label} packageManager must be an exact Yarn pin`);
  }
  return match[1];
}

function assertNodeVersion(nodeVersion = process.versions.node) {
  if (typeof nodeVersion !== 'string' || !nodeVersion.startsWith(REQUIRED_NODE_VERSION_PREFIX)) {
    throw new LockToolError('node-version-invalid', 'Node.js 22.14.x is required for SDK admission');
  }
  return nodeVersion.startsWith('v') ? nodeVersion : `v${nodeVersion}`;
}

function makeChildEnv(extra = {}) {
  const allowed = {};
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'USER', 'LOGNAME', 'SHELL', 'COREPACK_HOME']) {
    if (process.env[key]) {
      allowed[key] = process.env[key];
    }
  }
  return {
    ...allowed,
    CI: '1',
    ...extra,
  };
}

function runCommand(command, args, options = {}) {
  const execFileSyncImpl = options.execFileSync || childProcess.execFileSync;
  try {
    return execFileSyncImpl(command, args, {
      cwd: options.cwd,
      env: options.env || makeChildEnv(),
      encoding: options.encoding === undefined ? 'utf8' : options.encoding,
      stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
      maxBuffer: options.maxBuffer || 1024 * 1024 * 32,
      timeout: options.timeoutMs || DEFAULT_CHILD_TIMEOUT_MS,
    });
  } catch (error) {
    throw new LockToolError(options.errorCode || 'child-command-failed', 'child command failed');
  }
}

function runCorepackYarn(cwd, args, options = {}) {
  return (options.runCommand || runCommand)('corepack', ['yarn', ...args], {
    cwd,
    env: makeChildEnv(options.env),
    execFileSync: options.execFileSync,
    errorCode: options.errorCode || 'yarn-command-failed',
    maxBuffer: options.maxBuffer,
  });
}

function assertCorepackYarnVersion(root, packageManager, label, options = {}) {
  const expectedVersion = yarnVersionFromPackageManager(packageManager, label);
  const actualVersion = runCorepackYarn(root, ['--version'], {
    ...options,
    errorCode: `${label}-yarn-version-unresolved`,
  }).trim();
  if (actualVersion !== expectedVersion) {
    throw new LockToolError(`${label}-yarn-version-mismatch`, `${label} Corepack Yarn version must match packageManager`);
  }
  return {
    packageManager,
    version: actualVersion,
  };
}

function corepackYarnArgv(args) {
  return ['corepack', 'yarn', ...args];
}

function assertSdkContractPackageRoot(packageRoot) {
  const canonicalPackageRoot = canonicalRoot(packageRoot, 'sdk-contract-root');
  const packageJson = readJson(
    path.join(canonicalPackageRoot, ROOT_PACKAGE_RELATIVE_PATH),
    'sdk-contract-package-invalid'
  );
  if (packageJson.name !== SDK_PACKAGE_NAME) {
    throw new LockToolError('sdk-contract-package-invalid', 'SDK contract root is not @webex/contact-center');
  }

  for (const relativePath of [
    'dist/services/task/Task.js',
    'dist/services/ApiAiAssistant.js',
    'dist/services/task/types.js',
    'dist/types/index.d.ts',
    'dist/types/services/task/types.d.ts',
  ]) {
    if (!fs.existsSync(path.join(canonicalPackageRoot, ...relativePath.split('/')))) {
      throw new LockToolError('sdk-contract-package-invalid', 'SDK contract root is missing runtime contract files');
    }
  }

  return canonicalPackageRoot;
}

function runPackedSdkContractSuite({widgetsRoot, packageRoot}, options = {}) {
  const canonicalWidgetsRoot = assertWidgetsRoot(widgetsRoot, options.execFileSync);
  const canonicalPackageRoot = assertSdkContractPackageRoot(packageRoot);
  return runCorepackYarn(canonicalWidgetsRoot, STORE_CONTRACT_YARN_ARGS, {
    ...options,
    env: {
      [SDK_CONTRACT_ROOT_ENV]: canonicalPackageRoot,
    },
    errorCode: 'sdk-contract-suite-failed',
  });
}

function linkInstalledSdkDependencies(widgetsRoot, packageRoot) {
  const installedNodeModules = path.join(widgetsRoot, 'node_modules/@webex/contact-center/node_modules');
  const contractNodeModules = path.join(packageRoot, 'node_modules');
  if (fs.existsSync(contractNodeModules) || !fs.existsSync(installedNodeModules)) {
    return;
  }
  fs.symlinkSync(installedNodeModules, contractNodeModules, 'dir');
}

function buildStagedSdk(stageRoot, options = {}) {
  runCorepackYarn(stageRoot, SDK_BUILD_YARN_ARGV[0], {
    ...options,
    errorCode: 'sdk-build-failed',
  });
  return runCorepackYarn(stageRoot, SDK_BUILD_YARN_ARGV[1], {
    ...options,
    errorCode: 'sdk-build-failed',
  });
}

function installSealedSdk(widgetsRoot, options = {}) {
  return runCorepackYarn(widgetsRoot, WIDGET_LOCK_YARN_ARGS, {
    ...options,
    env: {
      ...(options.env || {}),
      YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
    },
    errorCode: 'widgets-install-failed',
  });
}

function installLockedSdk(widgetsRoot, options = {}) {
  return runCorepackYarn(widgetsRoot, WIDGET_INSTALL_YARN_ARGS, {
    ...options,
    errorCode: 'widgets-immutable-install-failed',
  });
}

function archiveSourceToStage(sourceRoot, commit, stageRoot, options = {}) {
  fs.mkdirSync(stageRoot, {recursive: true});
  const archivePath = path.join(path.dirname(stageRoot), 'source.tar');
  runGit(sourceRoot, ['archive', `--output=${archivePath}`, commit], options.execFileSync);
  runCommand('tar', ['-xf', archivePath, '-C', stageRoot], {
    execFileSync: options.execFileSync,
    errorCode: 'sdk-archive-extract-failed',
  });
}

function writeStagedSdkVersion(stageRoot, version) {
  const packagePath = path.join(stageRoot, SDK_SOURCE_PACKAGE_RELATIVE_PATH, ROOT_PACKAGE_RELATIVE_PATH);
  const packageJson = readJson(packagePath, 'sdk-package-invalid');
  if (packageJson.name !== SDK_PACKAGE_NAME) {
    throw new LockToolError('sdk-package-invalid', 'staged package root is not @webex/contact-center');
  }
  packageJson.version = version;
  writeJsonAtomic(packagePath, packageJson);
}

function readLockedRegistryDependencies(widgetsRoot, registryDescriptor) {
  const lockText = fs.readFileSync(path.join(widgetsRoot, ROOT_LOCK_RELATIVE_PATH), 'utf8');
  const lines = lockText.split(/\r?\n/);
  const registrySelector = `${SDK_PACKAGE_NAME}@npm:${registryDescriptor}`;
  const sealedSelectorPrefix = `${SDK_PACKAGE_NAME}@file:./${SDK_TARBALL_RELATIVE_PATH}::locator=`;
  const entryIndex = lines.findIndex((line) => {
    if (!line || /^\s/.test(line) || !line.endsWith(':')) {
      return false;
    }
    return line
      .slice(0, -1)
      .split(',')
      .map((item) => item.trim().replace(/^"|"$/g, ''))
      .some((item) => item === registrySelector || item.startsWith(sealedSelectorPrefix));
  });
  if (entryIndex < 0) {
    throw new LockToolError('sdk-registry-baseline-invalid', 'registry SDK baseline is missing from yarn.lock');
  }

  const dependencies = {};
  let inDependencies = false;
  for (let index = entryIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line && !/^\s/.test(line)) {
      break;
    }
    if (line === '  dependencies:') {
      inDependencies = true;
      continue;
    }
    if (!inDependencies) {
      continue;
    }
    if (line && !/^    /.test(line)) {
      break;
    }
    const match = /^    ("[^"]+"|[^:]+):\s+"?npm:([^"\s]+)"?\s*$/.exec(line);
    if (match) {
      dependencies[match[1].replace(/^"|"$/g, '')] = match[2];
    }
  }
  return dependencies;
}

function writeStagedSdkRegistryDependencies(stageRoot, widgetsRoot, registryDescriptor) {
  const packagePath = path.join(stageRoot, SDK_SOURCE_PACKAGE_RELATIVE_PATH, ROOT_PACKAGE_RELATIVE_PATH);
  const packageJson = readJson(packagePath, 'sdk-package-invalid');
  if (packageJson.name !== SDK_PACKAGE_NAME) {
    throw new LockToolError('sdk-package-invalid', 'staged package root is not @webex/contact-center');
  }
  const lockedDependencies = readLockedRegistryDependencies(widgetsRoot, registryDescriptor);
  const dependencies = {...(packageJson.dependencies || {})};
  for (const [dependencyName, descriptor] of Object.entries(dependencies)) {
    if (typeof descriptor !== 'string' || !descriptor.startsWith('workspace:')) {
      continue;
    }
    const registryDependency = lockedDependencies[dependencyName];
    assertPlainRegistrySemver(registryDependency, `locked SDK dependency ${dependencyName}`);
    dependencies[dependencyName] = registryDependency;
  }
  packageJson.dependencies = dependencies;
  writeJsonAtomic(packagePath, packageJson);
}

function snapshotFiles(paths) {
  return paths.map((filePath) => {
    if (!fs.existsSync(filePath)) {
      return {filePath, exists: false};
    }
    const stat = fs.statSync(filePath);
    return {
      filePath,
      exists: true,
      bytes: fs.readFileSync(filePath),
      mode: stat.mode & 0o777,
    };
  });
}

function restoreSnapshot(snapshot) {
  const failures = [];
  for (const entry of snapshot) {
    try {
      if (!entry.exists) {
        fs.rmSync(entry.filePath, {recursive: true, force: true});
        continue;
      }
      fs.mkdirSync(path.dirname(entry.filePath), {recursive: true});
      const tempPath = path.join(
        path.dirname(entry.filePath),
        `.${path.basename(entry.filePath)}.restore.${process.pid}.${Date.now()}.${crypto
          .randomBytes(6)
          .toString('hex')}.tmp`
      );
      try {
        fs.writeFileSync(tempPath, entry.bytes, {mode: entry.mode});
        fs.renameSync(tempPath, entry.filePath);
        fs.chmodSync(entry.filePath, entry.mode);
      } catch (error) {
        removePathQuietly(tempPath);
        throw error;
      }
    } catch (error) {
      failures.push({phase: 'restore'});
    }
  }

  for (const entry of snapshot) {
    try {
      assertSnapshotEntryUnchanged(entry, 'snapshot-restore-drift');
    } catch (error) {
      failures.push({phase: 'verify'});
    }
  }

  return failures;
}

function assertSnapshotEntryUnchanged(entry, code) {
  if (!entry) {
    throw new LockToolError(code, 'transaction snapshot entry is missing');
  }
  const exists = fs.existsSync(entry.filePath);
  if (exists !== entry.exists) {
    throw new LockToolError(code, 'transaction snapshot existence changed');
  }
  if (!entry.exists) {
    return;
  }
  const stat = fs.statSync(entry.filePath);
  if (!stat.isFile() || (stat.mode & 0o777) !== entry.mode || !fs.readFileSync(entry.filePath).equals(entry.bytes)) {
    throw new LockToolError(code, 'transaction snapshot bytes changed');
  }
}

function findSnapshotEntry(snapshot, filePath) {
  return snapshot.find((entry) => entry.filePath === filePath);
}

function normalizeOriginalError(error) {
  return error instanceof LockToolError ? error : new LockToolError('sdk-build-failed', 'SDK build failed');
}

function makeRollbackFailedError(originalError, failures) {
  return new LockToolError('sdk-rollback-failed', 'SDK rollback failed', {
    originalCode: normalizeOriginalError(originalError).code,
    failureCount: failures.length,
  });
}

function readTarString(buffer, offset, length) {
  const value = buffer.subarray(offset, offset + length);
  const terminator = value.indexOf(0);
  return value.subarray(0, terminator < 0 ? value.length : terminator).toString('utf8');
}

function readTarOctal(buffer, offset, length) {
  const value = readTarString(buffer, offset, length).trim();
  if (!value) {
    return 0;
  }
  if (!/^[0-7]+$/.test(value)) {
    throw new LockToolError('sdk-tarball-unreadable', 'SDK tarball contains an invalid tar header');
  }
  return Number.parseInt(value, 8);
}

function parseTarballEntries(tarballPath) {
  let archive;
  try {
    archive = zlib.gunzipSync(fs.readFileSync(tarballPath));
  } catch (error) {
    throw new LockToolError('sdk-tarball-unreadable', 'SDK tarball is missing or unreadable');
  }

  const entries = [];
  for (let offset = 0; offset + 512 <= archive.length; offset += 512) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const size = readTarOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] || 48);
    const entryPath = prefix ? `${prefix}/${name}` : name;
    if (!entryPath) {
      throw new LockToolError('sdk-tarball-unreadable', 'SDK tarball contains an unnamed entry');
    }
    entries.push({
      path: entryPath,
      size,
      typeflag,
      linkName: readTarString(header, 157, 100),
    });

    offset += Math.ceil(size / 512) * 512;
  }
  return entries;
}

function listTarEntries(tarballPath) {
  return parseTarballEntries(tarballPath);
}

function normalizeTarEntryPath(entry) {
  if (typeof entry.path !== 'string' || entry.path.length === 0 || entry.path.includes('\\')) {
    throw new LockToolError('sdk-tarball-unsafe-entry', 'SDK tarball contains an unsafe entry');
  }
  const withoutTrailingSlash = entry.typeflag === '5' ? entry.path.replace(/\/+$/, '') : entry.path;
  const normalized = path.posix.normalize(withoutTrailingSlash);
  if (
    withoutTrailingSlash !== normalized ||
    normalized === '.' ||
    normalized.startsWith('/') ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    throw new LockToolError('sdk-tarball-unsafe-entry', 'SDK tarball contains an unsafe entry');
  }
  return normalized;
}

function assertSafeTarballEntries(entries) {
  if (entries.length === 0) {
    throw new LockToolError('sdk-tarball-empty', 'SDK tarball must contain package files');
  }
  const seen = new Set();
  const files = [];
  let hasPackageMember = false;
  for (const entry of entries) {
    const normalized = normalizeTarEntryPath(entry);
    if (seen.has(normalized)) {
      throw new LockToolError('sdk-tarball-duplicate-entry', 'SDK tarball contains duplicate entries');
    }
    seen.add(normalized);

    if (normalized !== 'package' && !normalized.startsWith('package/')) {
      throw new LockToolError('sdk-tarball-root-invalid', 'SDK tarball must contain exactly one package root');
    }
    if (normalized !== 'package') {
      hasPackageMember = true;
    }

    if (entry.typeflag === '1' || entry.typeflag === '2') {
      throw new LockToolError('sdk-tarball-linked-entry', 'SDK tarball must not contain linked entries');
    }
    if (entry.typeflag !== '0' && entry.typeflag !== '\0' && entry.typeflag !== '5') {
      throw new LockToolError('sdk-tarball-special-entry', 'SDK tarball must contain only files and directories');
    }
    if (normalized === 'package' && entry.typeflag !== '5') {
      throw new LockToolError('sdk-tarball-root-invalid', 'SDK tarball package root must be a directory');
    }
    if (entry.typeflag === '0' || entry.typeflag === '\0') {
      files.push({
        path: normalized.slice('package/'.length),
        sizeBytes: entry.size,
      });
    }
  }
  if (!hasPackageMember || files.length === 0) {
    throw new LockToolError('sdk-tarball-empty', 'SDK tarball must contain package files');
  }
  return {files: files.sort(compareManifestPath)};
}

function extractTarball(tarballPath, extractRoot, options = {}) {
  fs.mkdirSync(extractRoot, {recursive: true});
  const archiveManifest = assertSafeTarballEntries(listTarEntries(tarballPath, options));
  runCommand('tar', ['-xzf', tarballPath, '-C', extractRoot], {
    execFileSync: options.execFileSync,
    errorCode: 'sdk-tarball-extract-failed',
  });
  const packageRoot = path.join(extractRoot, 'package');
  if (!fs.existsSync(packageRoot) || !fs.lstatSync(packageRoot).isDirectory()) {
    throw new LockToolError('sdk-tarball-root-invalid', 'SDK tarball package root is missing after extraction');
  }
  const extractedFiles = findRegularFiles(packageRoot)
    .map((entry) => ({
      path: entry.path,
      sizeBytes: entry.sizeBytes,
    }))
    .sort(compareManifestPath);
  if (stableStringify(extractedFiles) !== stableStringify(archiveManifest.files)) {
    throw new LockToolError('sdk-tarball-extract-drift', 'extracted SDK files do not match tarball headers');
  }
  return packageRoot;
}

function runPackedSdkContractSuiteFromTarball({widgetsRoot, tarballPath}, options = {}) {
  const canonicalWidgetsRoot = assertWidgetsRoot(widgetsRoot, options.execFileSync);
  const transactionRoot = fs.mkdtempSync(path.join(canonicalWidgetsRoot, '.ai-summary-sdk-contract-'));
  try {
    const packageRoot = extractTarball(tarballPath, transactionRoot, options);
    // Validate the candidate's declarations before resolving any installed dependencies.
    assertSdkDeclarationContract(packageRoot);
    linkInstalledSdkDependencies(canonicalWidgetsRoot, packageRoot);
    return (options.runPackedSdkContractSuite || runPackedSdkContractSuite)(
      {widgetsRoot: canonicalWidgetsRoot, packageRoot},
      options
    );
  } finally {
    removePathQuietly(transactionRoot);
  }
}

function findRegularFiles(root, options = {}) {
  const files = [];
  const ignoredDirectories = new Set(options.ignoredDirectories || []);
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const fullPath = path.join(dir, name);
      const stat = fs.lstatSync(fullPath);
      if (stat.isSymbolicLink()) {
        throw new LockToolError(
          options.symlinkCode || 'sdk-file-symlink',
          `package files must not be symlinks: ${toPosix(path.relative(root, fullPath))}`
        );
      }
      if (stat.isDirectory()) {
        if (ignoredDirectories.has(name)) {
          continue;
        }
        walk(fullPath);
        continue;
      }
      if (!stat.isFile()) {
        throw new LockToolError(options.nonRegularCode || 'sdk-file-non-regular', 'package files must be regular files');
      }
      files.push({
        path: toPosix(path.relative(root, fullPath)),
        sha256: hashFile(fullPath),
        sizeBytes: stat.size,
      });
    }
  };
  walk(root);
  return files;
}

function getDeclarationHashes(packageRoot) {
  const typeRoot = path.join(packageRoot, 'dist/types');
  if (!fs.existsSync(typeRoot)) {
    throw new LockToolError('sdk-declarations-missing', 'packed SDK declarations are missing');
  }
  const declarations = findRegularFiles(typeRoot)
    .filter((entry) => entry.path.endsWith('.d.ts'))
    .map((entry) => ({
      ...entry,
      path: toPosix(path.join('dist/types', entry.path)),
    }));
  if (declarations.length === 0) {
    throw new LockToolError('sdk-declarations-missing', 'packed SDK declarations are missing');
  }
  return declarations;
}

function readInstalledDeclaration(packageRoot, relativePath) {
  const declarationPath = path.join(packageRoot, ...relativePath.split('/'));
  if (!fs.existsSync(declarationPath)) {
    throw new LockToolError('sdk-declaration-missing', `missing ${relativePath}`);
  }
  return fs.readFileSync(declarationPath, 'utf8');
}

function normalizeTypeText(value) {
  return value.replace(/\s+/g, ' ').replace(/\s*([<>{}()[\]|&,:;])\s*/g, '$1').trim();
}

function declarationContractError(message) {
  throw new LockToolError('sdk-declaration-contract-invalid', message);
}

function resolveRelativeDeclaration(fromPath, specifier, typeRoot) {
  const fromDir = path.dirname(fromPath);
  const targetBase = path.resolve(fromDir, specifier);
  if (targetBase !== typeRoot && !isSubPath(typeRoot, targetBase)) {
    throw new LockToolError('sdk-declaration-graph-escape', 'SDK declaration graph escapes dist/types');
  }
  const extensionless = targetBase.replace(/\.(?:js|ts)$/, '');
  const candidates = specifier.endsWith('.d.ts')
    ? [targetBase]
    : [`${extensionless}.d.ts`, path.join(extensionless, 'index.d.ts')];
  for (const candidate of candidates) {
    if (candidate !== typeRoot && !isSubPath(typeRoot, candidate)) {
      throw new LockToolError('sdk-declaration-graph-escape', 'SDK declaration graph escapes dist/types');
    }
    if (fs.existsSync(candidate) && fs.lstatSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }
  throw new LockToolError('sdk-declaration-graph-unresolved', `unresolved declaration edge: ${specifier}`);
}

function getRelativeDeclarationSpecifier(node) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text.startsWith('.')
  ) {
    return node.moduleSpecifier.text;
  }
  if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteral(node.argument.literal) &&
    node.argument.literal.text.startsWith('.')
  ) {
    return node.argument.literal.text;
  }
  return null;
}

function readReachableDeclarationGraph(packageRoot) {
  const typeRoot = path.join(packageRoot, 'dist/types');
  const entryPath = path.join(typeRoot, 'index.d.ts');
  if (!fs.existsSync(entryPath)) {
    throw new LockToolError('declaration-entrypoint-missing', 'SDK declaration entrypoint is missing');
  }

  const sources = new Map();
  const visit = (filePath) => {
    const resolvedPath = path.resolve(filePath);
    if (sources.has(resolvedPath)) {
      return;
    }
    if (resolvedPath !== typeRoot && !isSubPath(typeRoot, resolvedPath)) {
      throw new LockToolError('sdk-declaration-graph-escape', 'SDK declaration graph escapes dist/types');
    }
    if (!fs.existsSync(resolvedPath) || !fs.lstatSync(resolvedPath).isFile()) {
      throw new LockToolError('sdk-declaration-graph-unresolved', 'SDK declaration graph has an unresolved file');
    }
    const source = ts.createSourceFile(
      resolvedPath,
      fs.readFileSync(resolvedPath, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    sources.set(resolvedPath, source);
    const walk = (node) => {
      const specifier = getRelativeDeclarationSpecifier(node);
      if (specifier) {
        visit(resolveRelativeDeclaration(resolvedPath, specifier, typeRoot));
      }
      ts.forEachChild(node, walk);
    };
    ts.forEachChild(source, walk);
  };
  visit(entryPath);
  return {entryPath: path.resolve(entryPath), sources, typeRoot};
}

function hasExportModifier(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function collectDeclaredExportNames(source) {
  const names = new Set();
  for (const statement of source.statements) {
    if (!hasExportModifier(statement)) {
      continue;
    }
    if (
      (ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isFunctionDeclaration(statement)) &&
      statement.name
    ) {
      names.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.add(declaration.name.text);
        }
      }
    }
  }
  return names;
}

function collectPublicExportNames(graph) {
  const seen = new Set();
  const collectFrom = (filePath) => {
    const source = graph.sources.get(filePath);
    if (!source) {
      return new Set();
    }
    if (seen.has(filePath)) {
      return collectDeclaredExportNames(source);
    }
    seen.add(filePath);
    const names = collectDeclaredExportNames(source);
    for (const statement of source.statements) {
      if (!ts.isExportDeclaration(statement)) {
        continue;
      }
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          names.add(element.name.text);
        }
        continue;
      }
      if (!statement.exportClause && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        if (!statement.moduleSpecifier.text.startsWith('.')) {
          continue;
        }
        const childPath = resolveRelativeDeclaration(filePath, statement.moduleSpecifier.text, graph.typeRoot);
        for (const name of collectFrom(childPath)) {
          names.add(name);
        }
      }
    }
    return names;
  };
  return collectFrom(graph.entryPath);
}

function findNamedDeclaration(graph, name, predicate) {
  const matches = [];
  for (const source of graph.sources.values()) {
    for (const statement of source.statements) {
      if (statement.name?.text === name && predicate(statement)) {
        matches.push(statement);
      }
    }
  }
  if (matches.length !== 1) {
    declarationContractError(`SDK public declaration contract is missing or ambiguous: ${name}`);
  }
  return matches[0];
}

function readStructuredMembers(graph, typeName) {
  const node = findNamedDeclaration(
    graph,
    typeName,
    (statement) => ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)
  );
  if (ts.isInterfaceDeclaration(node)) {
    return {node, members: node.members};
  }
  if (!ts.isTypeLiteralNode(node.type)) {
    declarationContractError(`SDK public declaration contract must keep ${typeName} as an object type`);
  }
  return {node, members: node.type.members};
}

function memberName(member) {
  if (member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))) {
    return member.name.text;
  }
  return null;
}

function assertProperty(members, containerName, propertyName, options) {
  const matches = members.filter((member) => ts.isPropertySignature(member) && memberName(member) === propertyName);
  if (matches.length !== 1) {
    declarationContractError(`SDK public declaration contract is missing ${containerName}.${propertyName}`);
  }
  const member = matches[0];
  if (Boolean(member.questionToken) !== Boolean(options.optional)) {
    declarationContractError(`SDK public declaration contract changed optionality for ${containerName}.${propertyName}`);
  }
  if (Boolean(member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)) !== Boolean(options.readonly)) {
    declarationContractError(`SDK public declaration contract changed readonly status for ${containerName}.${propertyName}`);
  }
  const actualType = member.type ? normalizeTypeText(member.type.getText(member.getSourceFile())) : '';
  if (actualType !== normalizeTypeText(options.type)) {
    declarationContractError(`SDK public declaration contract changed type for ${containerName}.${propertyName}`);
  }
}

function assertNoProperty(members, containerName, propertyName) {
  if (members.some((member) => ts.isPropertySignature(member) && memberName(member) === propertyName)) {
    throw new LockToolError('sdk-response-contract-invalid', `${containerName} must not carry ${propertyName}`);
  }
}

function assertIndexSignature(members, containerName) {
  const hasIndexSignature = members.some((member) => {
    if (!ts.isIndexSignatureDeclaration(member) || member.parameters.length !== 1) {
      return false;
    }
    const parameter = member.parameters[0];
    return (
      parameter.type &&
      normalizeTypeText(parameter.type.getText(member.getSourceFile())) === 'string' &&
      member.type &&
      normalizeTypeText(member.type.getText(member.getSourceFile())) === 'unknown'
    );
  });
  if (!hasIndexSignature) {
    declarationContractError(`SDK public declaration contract is missing ${containerName} string index signature`);
  }
}

function assertTypeAliasText(graph, typeName, expectedText) {
  const node = findNamedDeclaration(graph, typeName, ts.isTypeAliasDeclaration);
  const actualType = normalizeTypeText(node.type.getText(node.getSourceFile()));
  if (actualType !== normalizeTypeText(expectedText)) {
    declarationContractError(`SDK public declaration contract changed ${typeName}`);
  }
}

function assertStringUnion(graph, typeName, expectedValues) {
  const node = findNamedDeclaration(graph, typeName, ts.isTypeAliasDeclaration);
  if (!ts.isUnionTypeNode(node.type)) {
    declarationContractError(`SDK public declaration contract changed ${typeName} union`);
  }
  const actualValues = node.type.types.map((typeNode) => {
    if (!ts.isLiteralTypeNode(typeNode) || !ts.isStringLiteral(typeNode.literal)) {
      declarationContractError(`SDK public declaration contract changed ${typeName} union`);
    }
    return typeNode.literal.text;
  });
  if (!isDeepStrictEqual(actualValues, expectedValues)) {
    declarationContractError(`SDK public declaration contract changed ${typeName} values`);
  }
}

function assertEnumStringMember(graph, enumName, memberNameValue, expectedValue) {
  const node = findNamedDeclaration(graph, enumName, ts.isEnumDeclaration);
  const member = node.members.find((candidate) => memberName(candidate) === memberNameValue);
  if (!member || !member.initializer || !ts.isStringLiteral(member.initializer) || member.initializer.text !== expectedValue) {
    declarationContractError(`SDK public declaration contract is missing ${enumName}.${memberNameValue}`);
  }
}

function assertMethod(members, containerName, methodName, expectedParameters, expectedReturnType) {
  const matches = members.filter((member) => ts.isMethodSignature(member) && memberName(member) === methodName);
  if (matches.length !== 1) {
    declarationContractError(`SDK public declaration contract is missing ${containerName}.${methodName}`);
  }
  const method = matches[0];
  if (method.parameters.length !== expectedParameters.length) {
    declarationContractError(`SDK public declaration contract changed parameters for ${containerName}.${methodName}`);
  }
  for (const [index, expected] of expectedParameters.entries()) {
    const parameter = method.parameters[index];
    if (!ts.isIdentifier(parameter.name) || parameter.name.text !== expected.name || Boolean(parameter.questionToken)) {
      declarationContractError(`SDK public declaration contract changed parameter ${index} for ${containerName}.${methodName}`);
    }
    const actualType = parameter.type ? normalizeTypeText(parameter.type.getText(method.getSourceFile())) : '';
    if (actualType !== normalizeTypeText(expected.type)) {
      declarationContractError(`SDK public declaration contract changed parameter type for ${containerName}.${methodName}`);
    }
  }
  const actualReturnType = method.type ? normalizeTypeText(method.type.getText(method.getSourceFile())) : '';
  if (actualReturnType !== normalizeTypeText(expectedReturnType)) {
    declarationContractError(`SDK public declaration contract changed return type for ${containerName}.${methodName}`);
  }
}

function assertSdkDeclarationContract(packageRoot) {
  readInstalledDeclaration(packageRoot, 'dist/types/index.d.ts');
  const graph = readReachableDeclarationGraph(packageRoot);
  const publicExports = collectPublicExportNames(graph);
  const requiredIndexExports = [
    'TASK_EVENTS',
    'AISummaryAction',
    'AISummaryFeedback',
    'AISummaryState',
    'AISummarySections',
    'AISummary',
    'AISummaryFeatureEnablement',
    'AISummaryResponse',
    'WrapupPayLoad',
    'ITask',
  ];
  for (const exportName of requiredIndexExports) {
    if (!publicExports.has(exportName)) {
      declarationContractError(`SDK public declaration export is missing: ${exportName}`);
    }
  }

  for (const [memberNameValue, eventName] of REQUIRED_TASK_SUMMARY_EVENTS) {
    assertEnumStringMember(graph, 'TASK_EVENTS', memberNameValue, eventName);
  }
  assertStringUnion(graph, 'AISummaryAction', ['CONSULT', 'TRANSFER']);
  assertStringUnion(graph, 'AISummaryFeedback', ['none', 'thumbs_up', 'thumbs_down']);
  assertStringUnion(graph, 'AISummaryState', ['DEFAULT', 'EXCLUDED', 'IGNORED', 'MID_CALL_CANCELLED', 'NOT_RECEIVED']);

  const {members: sectionMembers} = readStructuredMembers(graph, 'AISummarySections');
  for (const propertyName of [
    'initialContactReason',
    'additionalContactReasons',
    'additionalContext',
    'keyActionsTaken',
    'nextSteps',
    'reasonForTransferOrConsult',
  ]) {
    assertProperty(sectionMembers, 'AISummarySections', propertyName, {optional: true, type: 'string'});
  }

  const {members: summaryMembers} = readStructuredMembers(graph, 'AISummary');
  assertProperty(summaryMembers, 'AISummary', 'conversationId', {optional: false, type: 'string'});
  assertProperty(summaryMembers, 'AISummary', 'adaptiveCard', {optional: true, type: 'Record<string, unknown>'});
  assertProperty(summaryMembers, 'AISummary', 'adaptiveCardId', {optional: true, type: 'string'});
  assertProperty(summaryMembers, 'AISummary', 'editAdaptiveCard', {optional: true, type: 'Record<string, unknown>'});
  assertProperty(summaryMembers, 'AISummary', 'editAdaptiveCardId', {optional: true, type: 'string'});
  assertProperty(summaryMembers, 'AISummary', 'areTranscriptsAvailable', {optional: true, type: 'boolean'});
  assertProperty(summaryMembers, 'AISummary', 'languageCode', {optional: true, type: 'string'});
  assertProperty(summaryMembers, 'AISummary', 'resolution', {optional: true, type: 'string'});
  assertProperty(summaryMembers, 'AISummary', 'sections', {optional: true, type: 'AISummarySections'});
  assertProperty(summaryMembers, 'AISummary', 'suggestedWrapUpCodesMessage', {optional: true, type: 'string'});
  assertProperty(summaryMembers, 'AISummary', 'summaryText', {optional: true, type: 'string'});
  assertProperty(summaryMembers, 'AISummary', 'timestamp', {optional: true, type: 'number'});
  assertIndexSignature(summaryMembers, 'AISummary');

  const {members: featureEnablementMembers} = readStructuredMembers(graph, 'AISummaryFeatureEnablement');
  assertProperty(featureEnablementMembers, 'AISummaryFeatureEnablement', 'interactionId', {
    optional: false,
    type: 'string',
  });
  assertProperty(featureEnablementMembers, 'AISummaryFeatureEnablement', 'midCallEnabled', {
    optional: true,
    type: 'boolean',
  });
  assertProperty(featureEnablementMembers, 'AISummaryFeatureEnablement', 'postCallEnabled', {
    optional: true,
    type: 'boolean',
  });
  assertProperty(featureEnablementMembers, 'AISummaryFeatureEnablement', 'actionTimestamp', {
    optional: true,
    type: 'number',
  });
  assertIndexSignature(featureEnablementMembers, 'AISummaryFeatureEnablement');
  assertTypeAliasText(
    graph,
    'AISummaryCapabilities',
    "Required<Pick<AISummaryFeatureEnablement, 'midCallEnabled' | 'postCallEnabled'>>"
  );

  const {members: responseMembers} = readStructuredMembers(graph, 'AISummaryResponse');
  assertProperty(responseMembers, 'AISummaryResponse', 'summary', {optional: false, type: 'AISummarySections | string'});
  assertProperty(responseMembers, 'AISummaryResponse', 'feedback', {optional: false, type: 'AISummaryFeedback'});
  assertProperty(responseMembers, 'AISummaryResponse', 'state', {optional: false, type: 'AISummaryState'});
  assertProperty(responseMembers, 'AISummaryResponse', 'numberOfTimesViewed', {optional: false, type: 'number'});
  assertProperty(responseMembers, 'AISummaryResponse', 'numberOfTimesEdited', {optional: false, type: 'number'});
  assertProperty(responseMembers, 'AISummaryResponse', 'numberOfTimesCopied', {optional: false, type: 'number'});
  assertProperty(responseMembers, 'AISummaryResponse', 'summaryReceived', {optional: true, type: 'boolean'});
  assertProperty(responseMembers, 'AISummaryResponse', 'wrapUpCode', {optional: true, type: 'string'});
  assertNoProperty(responseMembers, 'AISummaryResponse', 'timestamp');

  const {members: wrapupMembers} = readStructuredMembers(graph, 'WrapupPayLoad');
  assertProperty(wrapupMembers, 'WrapupPayLoad', 'wrapUpReason', {optional: false, type: 'string'});
  assertProperty(wrapupMembers, 'WrapupPayLoad', 'auxCodeId', {optional: false, type: 'string'});

  const {members: taskMembers} = readStructuredMembers(graph, 'ITask');
  assertProperty(taskMembers, 'ITask', 'aiSummaryCapabilities', {
    optional: false,
    readonly: true,
    type: 'Readonly<AISummaryCapabilities>',
  });
  assertMethod(taskMembers, 'ITask', 'requestPostCallSummary', [], 'Promise<AISummary>');
  assertMethod(
    taskMembers,
    'ITask',
    'sendPostCallSummaryResponse',
    [{name: 'response', type: 'AISummaryResponse'}],
    'Promise<void>'
  );
  assertMethod(
    taskMembers,
    'ITask',
    'requestMidCallSummary',
    [{name: 'action', type: 'AISummaryAction'}],
    'Promise<AISummary>'
  );
  assertMethod(
    taskMembers,
    'ITask',
    'sendMidCallSummaryResponse',
    [
      {name: 'response', type: 'AISummaryResponse'},
      {name: 'action', type: 'AISummaryAction'},
    ],
    'Promise<void>'
  );

  return {
    event: 'task:featureEnablement',
    timeoutMs: SDK_SUMMARY_TIMEOUT_MS,
  };
}

function assertSdkAdmissionUxSealed(widgetsRoot, options = {}) {
  const receiptPath = receiptPathForRoot(widgetsRoot, options.receiptPath);
  const receipt = readReceipt(receiptPath);
  if (!receipt || receipt.schemaVersion !== 1 || receipt.ux?.status !== 'sealed' || receipt.ux?.resolutionRoot !== '.') {
    throw new LockToolError('ux-seal-required', 'SDK admission requires a sealed UX receipt');
  }
  return receipt.ux;
}

function updateRootSdkResolution(widgetsRoot, registryDescriptor, options = {}) {
  const packagePath = path.join(widgetsRoot, ROOT_PACKAGE_RELATIVE_PATH);
  const rootPackage = readJson(packagePath, 'root-package-invalid');
  const nextPackage = {
    ...rootPackage,
    resolutions: {
      ...(rootPackage.resolutions || {}),
      [SDK_PACKAGE_NAME]: `file:./${SDK_TARBALL_RELATIVE_PATH}`,
    },
  };
  (options.writeJsonAtomic || writeJsonAtomic)(packagePath, nextPackage);
  if (options.afterRootSdkResolution) {
    options.afterRootSdkResolution({widgetsRoot, packagePath});
  }
  const storeDescriptor = getStoreSdkDescriptor(widgetsRoot);
  if (storeDescriptor !== registryDescriptor) {
    throw new LockToolError('store-sdk-dependency-drift', 'store SDK dependency changed during admission');
  }
}

function unquoteLockValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

function splitLockDescriptors(value) {
  const descriptors = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"' && value[index - 1] !== '\\') {
      quoted = !quoted;
    }
    if (character === ',' && !quoted) {
      descriptors.push(unquoteLockValue(current));
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim()) {
    descriptors.push(unquoteLockValue(current));
  }
  return descriptors.filter(Boolean);
}

function parseYarnLockEntries(lockText) {
  const lines = lockText.split(/\r?\n/);
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#') || /^\s/.test(line) || !line.endsWith(':')) {
      continue;
    }
    const entry = {
      descriptors: splitLockDescriptors(line.slice(0, -1)),
      fields: {},
    };
    for (index += 1; index < lines.length; index += 1) {
      const fieldLine = lines[index];
      if (fieldLine && !/^\s/.test(fieldLine)) {
        index -= 1;
        break;
      }
      const fieldMatch = /^  ([^:\s]+):(?:\s+(.*))?$/.exec(fieldLine);
      if (fieldMatch) {
        entry.fields[fieldMatch[1]] = fieldMatch[2] === undefined ? '' : unquoteLockValue(fieldMatch[2]);
      }
    }
    entries.push(entry);
  }
  return entries;
}

function lockPathMatchesTarball(lockPath, tarballRelativePath) {
  return lockPath === `./${tarballRelativePath}`;
}

function descriptorMatchesLocalTarball(descriptor, tarballRelativePath) {
  const prefix = `${SDK_PACKAGE_NAME}@file:`;
  if (!descriptor.startsWith(prefix)) {
    return false;
  }
  const locatorIndex = descriptor.indexOf('::');
  const descriptorPath = descriptor.slice(prefix.length, locatorIndex < 0 ? undefined : locatorIndex);
  return lockPathMatchesTarball(descriptorPath, tarballRelativePath);
}

function resolutionMatchesLocalTarball(resolution, tarballRelativePath) {
  const prefix = `${SDK_PACKAGE_NAME}@file:`;
  if (!resolution.startsWith(prefix)) {
    return false;
  }
  const withoutPrefix = resolution.slice(prefix.length);
  const [resolutionPath, fragmentAndParams = ''] = withoutPrefix.split('#');
  if (!lockPathMatchesTarball(resolutionPath.split('::')[0], tarballRelativePath)) {
    return false;
  }
  if (!fragmentAndParams) {
    return true;
  }
  return lockPathMatchesTarball(fragmentAndParams.split('::')[0], tarballRelativePath);
}

function entryMentionsSdk(entry) {
  return (
    entry.descriptors.some((descriptor) => descriptor.startsWith(`${SDK_PACKAGE_NAME}@`)) ||
    (typeof entry.fields.resolution === 'string' && entry.fields.resolution.startsWith(`${SDK_PACKAGE_NAME}@`))
  );
}

function parseSdkLockRecord(lockText, tarballRelativePath, expectedVersion) {
  const sdkEntries = parseYarnLockEntries(lockText).filter(entryMentionsSdk);
  if (sdkEntries.length === 0) {
    throw new LockToolError('sdk-lock-entry-missing', 'local SDK tarball lock entry is missing');
  }
  if (sdkEntries.length !== 1) {
    throw new LockToolError('sdk-lock-entry-ambiguous', 'yarn.lock must contain exactly one SDK lock entry');
  }
  const [entry] = sdkEntries;
  if (
    entry.descriptors.length === 0 ||
    !entry.descriptors.every((descriptor) => descriptorMatchesLocalTarball(descriptor, tarballRelativePath))
  ) {
    throw new LockToolError('sdk-lock-entry-invalid', 'SDK lock descriptors must point only at the sealed tarball');
  }
  if (!resolutionMatchesLocalTarball(entry.fields.resolution || '', tarballRelativePath)) {
    throw new LockToolError('sdk-lock-resolution-invalid', 'SDK lock resolution must point at the sealed tarball');
  }
  if (expectedVersion && entry.fields.version !== expectedVersion) {
    throw new LockToolError('sdk-lock-version-drift', 'SDK lock version does not match receipt');
  }
  if (!entry.fields.checksum) {
    throw new LockToolError('sdk-lock-checksum-missing', 'local SDK tarball checksum is missing');
  }
  return {
    checksum: entry.fields.checksum,
    descriptors: entry.descriptors,
    resolution: entry.fields.resolution,
    version: entry.fields.version,
  };
}

function parseLockChecksum(lockText, tarballRelativePath, expectedVersion) {
  return parseSdkLockRecord(lockText, tarballRelativePath, expectedVersion).checksum;
}

function assertInstalledSdkMatchesReceipt(widgetsRoot, sdkReceipt, options = {}) {
  const installedRoot = path.join(widgetsRoot, 'node_modules/@webex/contact-center');
  const packageJson = readJson(path.join(installedRoot, ROOT_PACKAGE_RELATIVE_PATH), 'installed-sdk-package-invalid');
  if (packageJson.name !== SDK_PACKAGE_NAME || packageJson.version !== sdkReceipt.version) {
    throw new LockToolError('installed-sdk-package-invalid', 'installed SDK package identity does not match receipt');
  }

  // Yarn's node-modules linker may place dependency artifacts below the
  // installed package. They are not package-owned bytes from the sealed
  // tarball and must not participate in the package manifest comparison.
  const installedFiles = findRegularFiles(installedRoot, {ignoredDirectories: ['node_modules']});
  const expectedFiles = sdkReceipt.package.files;
  if (stableStringify(installedFiles) !== stableStringify(expectedFiles)) {
    throw new LockToolError('installed-sdk-file-drift', 'installed SDK files do not match the sealed tarball');
  }
  if (options.validateDeclarationContract) {
    assertSdkDeclarationContract(installedRoot);
  }
}

function cleanSourceAudit(sourceState) {
  return {
    branch: sourceState.branch,
    commit: sourceState.commit,
    status: 'clean',
  };
}

function assertMatchingCleanSource(before, after) {
  if (before.branch !== after.branch || before.commit !== after.commit) {
    throw new LockToolError('sdk-source-drift', 'SDK source branch or commit changed during admission');
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}

function sdkPackYarnArgs(packedPath) {
  return ['workspace', SDK_PACKAGE_NAME, 'pack', '--out', packedPath];
}

function buildCommandAudit(packedPath) {
  return deepFreeze({
    install: {
      cwd: 'sdk-stage',
      argv: corepackYarnArgv(SDK_INSTALL_YARN_ARGS),
    },
    build: SDK_BUILD_YARN_ARGV.map((args) => ({
      cwd: 'sdk-stage',
      argv: corepackYarnArgv(args),
    })),
    pack: {
      cwd: 'sdk-stage',
      argv: corepackYarnArgv(sdkPackYarnArgs(packedPath)),
    },
    widgetLock: {
      cwd: 'widgets-root',
      argv: corepackYarnArgv(WIDGET_LOCK_YARN_ARGS),
    },
    widgetInstall: {
      cwd: 'widgets-root',
      argv: corepackYarnArgv(WIDGET_INSTALL_YARN_ARGS),
    },
    probe: {
      cwd: 'widgets-root',
      argv: corepackYarnArgv(STORE_CONTRACT_YARN_ARGS),
    },
  });
}

function makeBuildAudit({sourceRoot, cleanBefore, cleanAfter, nodeVersion, sdkYarn, widgetsYarn, commands}) {
  return deepFreeze({
    source: {
      repositoryPath: sourceRoot,
      cleanBefore: cleanSourceAudit(cleanBefore),
      cleanAfter: cleanSourceAudit(cleanAfter),
    },
    toolchain: {
      node: {
        version: nodeVersion,
        required: REQUIRED_NODE_VERSION_DISPLAY,
      },
      yarn: {
        sdk: sdkYarn,
        widgets: widgetsYarn,
      },
    },
    commands,
  });
}

function assertRecordedSourceRoot(widgetsRoot, sourceRoot, options = {}) {
  const receiptPath = receiptPathForRoot(widgetsRoot, options.receiptPath);
  if (!fs.existsSync(receiptPath)) {
    return;
  }
  let receipt;
  try {
    receipt = readReceipt(receiptPath);
  } catch (error) {
    return;
  }
  const recordedPath = receipt.sdk?.source?.audit?.repositoryPath;
  if (typeof recordedPath !== 'string' || recordedPath.length === 0) {
    return;
  }
  if (path.resolve(recordedPath) !== sourceRoot) {
    throw new LockToolError('sdk-source-root-drift', 'SDK source root differs from the previous sealed receipt');
  }
}

function assertReceiptCommandRecord(record, expectedArgv, code) {
  if (
    !record ||
    typeof record.cwd !== 'string' ||
    !Array.isArray(record.argv) ||
    record.argv.length !== expectedArgv.length ||
    record.argv.some((part, index) => part !== expectedArgv[index])
  ) {
    throw new LockToolError(code, 'SDK receipt command provenance is incomplete');
  }
}

function assertReceiptPackCommand(record) {
  const expectedPrefix = corepackYarnArgv(['workspace', SDK_PACKAGE_NAME, 'pack', '--out']);
  if (
    !record ||
    typeof record.cwd !== 'string' ||
    !Array.isArray(record.argv) ||
    record.argv.length !== expectedPrefix.length + 1 ||
    expectedPrefix.some((part, index) => record.argv[index] !== part) ||
    typeof record.argv[expectedPrefix.length] !== 'string' ||
    record.argv[expectedPrefix.length].length === 0
  ) {
    throw new LockToolError('sdk-receipt-provenance-missing', 'SDK receipt pack command provenance is incomplete');
  }
}

function assertReceiptProvenance(sdkReceipt) {
  const hasProvenance =
    sdkReceipt.source?.audit !== undefined ||
    sdkReceipt.toolchain !== undefined ||
    sdkReceipt.commands !== undefined;
  if (!hasProvenance) {
    throw new LockToolError('sdk-receipt-provenance-missing', 'SDK receipt has no verified build provenance');
  }

  const audit = sdkReceipt.source?.audit;
  if (
    !audit ||
    typeof audit.repositoryPath !== 'string' ||
    !path.isAbsolute(audit.repositoryPath) ||
    audit.cleanBefore?.status !== 'clean' ||
    audit.cleanAfter?.status !== 'clean' ||
    audit.cleanBefore?.branch !== sdkReceipt.source?.branch ||
    audit.cleanAfter?.branch !== sdkReceipt.source?.branch ||
    audit.cleanBefore?.commit !== sdkReceipt.source?.commit ||
    audit.cleanAfter?.commit !== sdkReceipt.source?.commit
  ) {
    throw new LockToolError('sdk-receipt-provenance-missing', 'SDK receipt source provenance is incomplete');
  }

  const nodeVersion = sdkReceipt.toolchain?.node?.version;
  if (
    typeof nodeVersion !== 'string' ||
    !nodeVersion.startsWith('v22.14.') ||
    sdkReceipt.toolchain.node.required !== REQUIRED_NODE_VERSION_DISPLAY
  ) {
    throw new LockToolError('sdk-receipt-provenance-missing', 'SDK receipt Node provenance is incomplete');
  }

  for (const label of ['sdk', 'widgets']) {
    const yarn = sdkReceipt.toolchain?.yarn?.[label];
    if (
      !yarn ||
      typeof yarn.packageManager !== 'string' ||
      typeof yarn.version !== 'string' ||
      yarnVersionFromPackageManager(yarn.packageManager, label) !== yarn.version
    ) {
      throw new LockToolError('sdk-receipt-provenance-missing', 'SDK receipt Yarn provenance is incomplete');
    }
  }

  const commands = sdkReceipt.commands;
  assertReceiptCommandRecord(commands?.install, corepackYarnArgv(SDK_INSTALL_YARN_ARGS), 'sdk-receipt-provenance-missing');
  if (!Array.isArray(commands?.build) || commands.build.length !== SDK_BUILD_YARN_ARGV.length) {
    throw new LockToolError('sdk-receipt-provenance-missing', 'SDK receipt build command provenance is incomplete');
  }
  SDK_BUILD_YARN_ARGV.forEach((args, index) => {
    assertReceiptCommandRecord(commands.build[index], corepackYarnArgv(args), 'sdk-receipt-provenance-missing');
  });
  assertReceiptPackCommand(commands?.pack);
  assertReceiptCommandRecord(
    commands?.widgetLock,
    corepackYarnArgv(WIDGET_LOCK_YARN_ARGS),
    'sdk-receipt-provenance-missing'
  );
  assertReceiptCommandRecord(
    commands?.widgetInstall,
    corepackYarnArgv(WIDGET_INSTALL_YARN_ARGS),
    'sdk-receipt-provenance-missing'
  );
  assertReceiptCommandRecord(commands?.probe, corepackYarnArgv(STORE_CONTRACT_YARN_ARGS), 'sdk-receipt-provenance-missing');
}

function assertSdkReceiptIdentity(sdkReceipt, registryDescriptor) {
  const source = sdkReceipt.source;
  if (source?.branch !== EXPECTED_SDK_BRANCH) {
    throw new LockToolError('sdk-source-identity-invalid', 'SDK receipt source branch must be cc-summaries');
  }
  if (typeof source.commit !== 'string' || !/^[0-9a-f]{40}$/.test(source.commit)) {
    throw new LockToolError('sdk-source-identity-invalid', 'SDK receipt source commit must be a 40-character SHA');
  }
  const expectedVersion = deriveSdkVersion(registryDescriptor, source.commit);
  if (sdkReceipt.version !== expectedVersion) {
    throw new LockToolError('sdk-version-drift', 'SDK receipt version does not match source commit');
  }
}

function shouldVerifyPackedSdkContract(sdkReceipt) {
  const harness = sdkReceipt.contract?.packedRuntimeHarness;
  if (harness !== undefined && harness !== 'store-child') {
    throw new LockToolError('sdk-receipt-contract-invalid', 'SDK receipt packed runtime harness is invalid');
  }
  return true;
}

function buildSdkReceipt(options) {
  const {
    branch,
    commit,
    registryDescriptor,
    version,
    tarballPath,
    tarballSha256,
    tarballSizeBytes,
    packageManifest,
    declarationHashes,
    lockChecksum,
    nodeLinker,
    audit,
    now,
  } = options;
  return {
    status: 'sealed',
    sealedAt: (now || new Date()).toISOString(),
    packageName: SDK_PACKAGE_NAME,
    registryDescriptor,
    version,
    source: {
      branch,
      commit,
      treeSha256: packageManifest.treeSha256,
      audit: audit.source,
    },
    toolchain: audit.toolchain,
    commands: audit.commands,
    tarball: {
      path: SDK_TARBALL_RELATIVE_PATH,
      sha256: tarballSha256,
      sizeBytes: tarballSizeBytes,
    },
    yarn: {
      nodeLinker,
      resolution: `${SDK_PACKAGE_NAME}: file:./${SDK_TARBALL_RELATIVE_PATH}`,
      checksum: lockChecksum,
    },
    package: {
      files: packageManifest.files,
    },
    declarations: declarationHashes,
    contract: {
      taskSummaryEvents: Object.fromEntries(REQUIRED_TASK_SUMMARY_EVENTS),
      taskFeatureEnablementEvent: 'task:featureEnablement',
      timeoutMs: SDK_SUMMARY_TIMEOUT_MS,
      packedRuntimeHarness: 'store-child',
      midCallCorrelationProbe: 'consult-transfer',
      sendStatusProbe: 'http-202-and-503',
      postWrapUpSameTaskProbe: 'fulfilled',
    },
  };
}

function replaceSdkReceipt(widgetsRoot, sdkReceipt, options = {}) {
  const receiptPath = receiptPathForRoot(widgetsRoot, options.receiptPath);
  const previousReceipt = fs.existsSync(receiptPath) ? fs.readFileSync(receiptPath) : undefined;
  const receipt = previousReceipt ? JSON.parse(previousReceipt.toString('utf8')) : undefined;
  if (!receipt || receipt.schemaVersion !== 1 || receipt.ux?.status !== 'sealed' || receipt.ux?.resolutionRoot !== '.') {
    throw new LockToolError('ux-seal-required', 'SDK admission requires a sealed UX receipt');
  }
  const nextReceipt = {
    ...receipt,
    sdk: sdkReceipt,
  };
  try {
    (options.writeJsonAtomic || writeJsonAtomic)(receiptPath, nextReceipt);
  } catch (error) {
    if (previousReceipt === undefined) {
      removePathQuietly(receiptPath);
    } else {
      fs.writeFileSync(receiptPath, previousReceipt);
    }
    throw new LockToolError('receipt-write-failed', 'receipt write failed');
  }
  return nextReceipt;
}

function buildPackageManifest(packageRoot) {
  const files = findRegularFiles(packageRoot);
  return {
    files,
    treeSha256: hashBuffer(Buffer.from(stableStringify(files))),
  };
}

function reuseSealedSdkPackage(widgetsRoot, identity, options = {}) {
  const receiptPath = receiptPathForRoot(widgetsRoot, options.receiptPath);
  if (!fs.existsSync(receiptPath)) {
    return null;
  }
  try {
    const receipt = readReceipt(receiptPath);
    if (
      receipt.sdk?.status !== 'sealed' ||
      receipt.sdk.registryDescriptor !== identity.registryDescriptor ||
      receipt.sdk.version !== identity.version ||
      receipt.sdk.source?.branch !== identity.branch ||
      receipt.sdk.source?.commit !== identity.commit
    ) {
      return null;
    }
    return (options.verifySdkPackage || verifySdkPackage)({widgetsRoot, receiptPath});
  } catch (error) {
    if (error instanceof LockToolError) {
      return null;
    }
    throw error;
  }
}

async function buildSdkPackage(options = {}) {
  const widgetsRoot = assertWidgetsRoot(options.widgetsRoot || process.cwd(), options.execFileSync);
  const nodeVersion = assertNodeVersion(options.nodeVersion || process.versions.node);
  const nodeLinker = assertWidgetsNodeLinker(widgetsRoot, options.execFileSync);
  const widgetsPackageManager = readPackageManagerPin(widgetsRoot, 'widgets');
  const widgetsYarn = assertCorepackYarnVersion(widgetsRoot, widgetsPackageManager, 'widgets', options);
  const sourceRoot = canonicalRootFrom(options.sourceRoot || process.env.WEBEX_JS_SDK_DIR, widgetsRoot, 'sdk-source-root');
  assertRecordedSourceRoot(widgetsRoot, sourceRoot, options);
  const cleanBefore = assertCleanGitSource(sourceRoot, options.execFileSync);
  const {branch, commit} = cleanBefore;
  assertSdkAdmissionUxSealed(widgetsRoot, options);
  const registryDescriptor = getStoreSdkDescriptor(widgetsRoot);
  const version = deriveSdkVersion(registryDescriptor, commit);
  const reusable = reuseSealedSdkPackage(
    widgetsRoot,
    {branch, commit, registryDescriptor, version},
    options
  );
  if (reusable) {
    return reusable;
  }
  const tarballPath = path.join(widgetsRoot, SDK_TARBALL_RELATIVE_PATH);
  const rootPackagePath = path.join(widgetsRoot, ROOT_PACKAGE_RELATIVE_PATH);
  const lockPath = path.join(widgetsRoot, ROOT_LOCK_RELATIVE_PATH);
  const receiptPath = path.join(widgetsRoot, RECEIPT_RELATIVE_PATH);
  const storePackagePath = path.join(widgetsRoot, STORE_PACKAGE_RELATIVE_PATH);
  const transactionPaths = [rootPackagePath, lockPath, tarballPath, receiptPath, storePackagePath];
  let snapshot = null;
  const transactionRoot = fs.mkdtempSync(path.join(options.transactionParentDir || os.tmpdir(), 'ai-summary-sdk-build-'));

  try {
    const stageRoot = path.join(transactionRoot, 'source');
    archiveSourceToStage(sourceRoot, commit, stageRoot, options);
    const sdkPackageRoot = path.join(stageRoot, SDK_SOURCE_PACKAGE_RELATIVE_PATH);
    writeStagedSdkVersion(stageRoot, version);
    const packageManager = readSdkPackageManager(stageRoot);
    if (!packageManager.startsWith('yarn@')) {
      throw new LockToolError('sdk-package-manager-invalid', 'SDK packageManager must be Yarn');
    }
    const sdkYarn = assertCorepackYarnVersion(stageRoot, packageManager, 'sdk', options);

    runCorepackYarn(stageRoot, SDK_INSTALL_YARN_ARGS, {
      ...options,
      errorCode: 'sdk-install-failed',
    });
    buildStagedSdk(stageRoot, options);
    writeStagedSdkRegistryDependencies(stageRoot, widgetsRoot, registryDescriptor);

    const packedPath = path.join(transactionRoot, 'contact-center-cc-summaries.tgz');
    runCorepackYarn(stageRoot, sdkPackYarnArgs(packedPath), {
      ...options,
      errorCode: 'sdk-pack-failed',
    });
    const cleanAfter = assertCleanGitSource(sourceRoot, options.execFileSync);
    assertMatchingCleanSource(cleanBefore, cleanAfter);
    const audit = makeBuildAudit({
      sourceRoot,
      cleanBefore,
      cleanAfter,
      nodeVersion,
      sdkYarn,
      widgetsYarn,
      commands: buildCommandAudit(packedPath),
    });
    assertSafeTarballEntries(listTarEntries(packedPath, options));
    const extractRoot = path.join(transactionRoot, 'packed');
    const packedPackageRoot = extractTarball(packedPath, extractRoot, options);
    const packedPackageJson = readJson(
      path.join(packedPackageRoot, ROOT_PACKAGE_RELATIVE_PATH),
      'sdk-packed-package-invalid'
    );
    if (packedPackageJson.name !== SDK_PACKAGE_NAME || packedPackageJson.version !== version) {
      throw new LockToolError('sdk-packed-package-invalid', 'packed SDK package identity is invalid');
    }

    const packageManifest = buildPackageManifest(packedPackageRoot);
    const declarationHashes = getDeclarationHashes(packedPackageRoot);
    assertSdkDeclarationContract(packedPackageRoot);

    await (options.runPackedSdkContractSuiteFromTarball || runPackedSdkContractSuiteFromTarball)(
      {widgetsRoot, tarballPath: packedPath},
      options
    );

    snapshot = snapshotFiles(transactionPaths);
    const storePackageSnapshot = findSnapshotEntry(snapshot, storePackagePath);
    fs.mkdirSync(path.dirname(tarballPath), {recursive: true});
    fs.copyFileSync(packedPath, tarballPath);
    const tarballSha256 = hashFile(tarballPath);
    const tarballSizeBytes = fs.statSync(tarballPath).size;

    updateRootSdkResolution(widgetsRoot, registryDescriptor, options);
    installSealedSdk(widgetsRoot, options);
    installLockedSdk(widgetsRoot, options);
    assertSnapshotEntryUnchanged(storePackageSnapshot, 'store-manifest-drift');

    const lockText = fs.readFileSync(lockPath, 'utf8');
    const lockChecksum = parseLockChecksum(lockText, SDK_TARBALL_RELATIVE_PATH, version);
    const sdkReceipt = buildSdkReceipt({
      branch,
      commit,
      registryDescriptor,
      version,
      tarballPath,
      tarballSha256,
      tarballSizeBytes,
      packageManifest,
      declarationHashes,
      lockChecksum,
      nodeLinker,
      audit,
      now: options.now,
    });
    assertInstalledSdkMatchesReceipt(widgetsRoot, sdkReceipt, {validateDeclarationContract: true});
    return replaceSdkReceipt(widgetsRoot, sdkReceipt, options);
  } catch (error) {
    const originalError = normalizeOriginalError(error);
    if (snapshot) {
      const restoreFailures = restoreSnapshot(snapshot);
      if (restoreFailures.length > 0) {
        throw makeRollbackFailedError(originalError, restoreFailures);
      }
    }
    throw originalError;
  } finally {
    removePathQuietly(transactionRoot);
  }
}

function verifySdkPackage(options = {}) {
  const widgetsRoot = assertWidgetsRoot(options.widgetsRoot || process.cwd(), options.execFileSync);
  const receipt = readReceipt(receiptPathForRoot(widgetsRoot, options.receiptPath));
  const sdkReceipt = receipt.sdk;
  if (!sdkReceipt || sdkReceipt.status !== 'sealed') {
    throw new LockToolError('sdk-receipt-unsealed', 'SDK receipt is not sealed');
  }
  const registryDescriptor = getStoreSdkDescriptor(widgetsRoot);
  if (registryDescriptor !== sdkReceipt.registryDescriptor) {
    throw new LockToolError('store-sdk-dependency-drift', 'store SDK dependency does not match receipt');
  }
  assertSdkReceiptIdentity(sdkReceipt, registryDescriptor);
  assertReceiptProvenance(sdkReceipt);
  const rootPackage = readJson(path.join(widgetsRoot, ROOT_PACKAGE_RELATIVE_PATH), 'root-package-invalid');
  const resolution = rootPackage.resolutions?.[SDK_PACKAGE_NAME];
  if (resolution !== `file:./${SDK_TARBALL_RELATIVE_PATH}`) {
    throw new LockToolError('sdk-root-resolution-missing', 'root SDK development resolution is missing');
  }
  const tarballPath = path.join(widgetsRoot, SDK_TARBALL_RELATIVE_PATH);
  if (!fs.existsSync(tarballPath) || hashFile(tarballPath) !== sdkReceipt.tarball.sha256) {
    throw new LockToolError('sdk-tarball-drift', 'vendored SDK tarball does not match receipt');
  }
  shouldVerifyPackedSdkContract(sdkReceipt);
  (options.runPackedSdkContractSuiteFromTarball || runPackedSdkContractSuiteFromTarball)(
    {widgetsRoot, tarballPath},
    options
  );
  const lockText = fs.readFileSync(path.join(widgetsRoot, ROOT_LOCK_RELATIVE_PATH), 'utf8');
  const checksum = parseLockChecksum(lockText, SDK_TARBALL_RELATIVE_PATH, sdkReceipt.version);
  if (checksum !== sdkReceipt.yarn.checksum) {
    throw new LockToolError('sdk-lock-checksum-drift', 'SDK lock checksum does not match receipt');
  }
  assertInstalledSdkMatchesReceipt(widgetsRoot, sdkReceipt, {validateDeclarationContract: true});
  return receipt;
}

function verifyLock(options = {}) {
  const widgetsRoot = assertWidgetsRoot(options.widgetsRoot || process.cwd(), options.execFileSync);
  const uxReceipt = verifyUXSources({...options, widgetsRoot});
  const sdkReceipt = verifySdkPackage({...options, widgetsRoot});
  const publishable = (options.verifyPublishableSdkBoundary || verifyPublishableSdkBoundary)({...options, widgetsRoot});
  return {
    sdk: sdkReceipt.sdk,
    ux: uxReceipt.ux,
    publishable,
  };
}

function verifyPublishableSdkBoundary(options = {}) {
  const widgetsRoot = assertWidgetsRoot(options.widgetsRoot || process.cwd(), options.execFileSync);
  const rootPackage = readJson(path.join(widgetsRoot, ROOT_PACKAGE_RELATIVE_PATH), 'root-package-invalid');
  const rootResolution = rootPackage.resolutions?.[SDK_PACKAGE_NAME];
  if (rootResolution && rootResolution !== `file:./${SDK_TARBALL_RELATIVE_PATH}`) {
    throw new LockToolError('sdk-root-resolution-invalid', 'unexpected SDK root resolution');
  }
  let boundary;
  try {
    boundary = inspectAISummaryPackedWorkspaceBoundary({
      repositoryRoot: widgetsRoot,
      execFileSync: options.execFileSync,
    });
  } catch (error) {
    throw new LockToolError('publishable-sdk-boundary-invalid', error.message);
  }
  return {
    checked: boundary.workspaces.flatMap((workspace) =>
      workspace.contactCenterDescriptors.map(({mapName, descriptor}) => ({
        workspace: workspace.name,
        mapName,
        descriptor,
      }))
    ),
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new LockToolError('cli-argument-invalid', 'unexpected positional argument');
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new LockToolError('cli-argument-missing', 'missing option value');
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

async function runCli(argv = process.argv.slice(2), options = {}) {
  const [command, ...rest] = argv;
  try {
    if (!command) {
      throw new LockToolError('missing-command', 'missing subcommand');
    }
    const args = parseArgs(rest);
    if (command === 'stage-ux') {
      const allowed = new Set(['source-root', 'target-root']);
      if (Object.keys(args).some((key) => !allowed.has(key))) {
        throw new LockToolError('cli-option-invalid', 'invalid stage-ux option');
      }
      stageUXSources({
        sourceRoot: args['source-root'],
        targetRoot: args['target-root'],
        manifest: options.manifest,
        execFileSync: options.execFileSync,
      });
      return;
    }
    if (command === 'seal-ux') {
      const allowed = new Set(['widgets-root']);
      if (Object.keys(args).some((key) => !allowed.has(key))) {
        throw new LockToolError('cli-option-invalid', 'invalid seal-ux option');
      }
      sealUXSources({
        widgetsRoot: args['widgets-root'],
        manifest: options.manifest,
        execFileSync: options.execFileSync,
        receiptPath: options.receiptPath,
        writeJsonAtomic: options.writeJsonAtomic,
      });
      return;
    }
    if (command === 'verify-ux') {
      const allowed = new Set(['widgets-root']);
      if (Object.keys(args).some((key) => !allowed.has(key))) {
        throw new LockToolError('cli-option-invalid', 'invalid verify-ux option');
      }
      verifyUXSources({
        widgetsRoot: args['widgets-root'],
        manifest: options.manifest,
        execFileSync: options.execFileSync,
        receiptPath: options.receiptPath,
      });
      return;
    }
    if (command === 'build-sdk') {
      const allowed = new Set([]);
      if (Object.keys(args).some((key) => !allowed.has(key))) {
        throw new LockToolError('cli-option-invalid', 'invalid build-sdk option');
      }
      await buildSdkPackage({widgetsRoot: process.cwd()});
      return;
    }
    if (command === 'verify-sdk') {
      const allowed = new Set(['widgets-root']);
      if (Object.keys(args).some((key) => !allowed.has(key))) {
        throw new LockToolError('cli-option-invalid', 'invalid verify-sdk option');
      }
      verifySdkPackage({widgetsRoot: args['widgets-root'] || process.cwd()});
      return;
    }
    if (command === 'verify') {
      const allowed = new Set(['widgets-root']);
      if (Object.keys(args).some((key) => !allowed.has(key))) {
        throw new LockToolError('cli-option-invalid', 'invalid verify option');
      }
      verifyLock({widgetsRoot: args['widgets-root'] || process.cwd()});
      return;
    }
    if (command === 'verify-publishable-sdk-boundary') {
      const allowed = new Set(['widgets-root']);
      if (Object.keys(args).some((key) => !allowed.has(key))) {
        throw new LockToolError('cli-option-invalid', 'invalid verify-publishable-sdk-boundary option');
      }
      verifyPublishableSdkBoundary({widgetsRoot: args['widgets-root'] || process.cwd()});
      return;
    }
    throw new LockToolError('unknown-command', 'unknown subcommand');
  } catch (error) {
    const code = error instanceof LockToolError ? error.code : 'internal-error';
    process.exitCode = 1;
    process.stderr.write(`ai-summary-sdk-lock:${code}${os.EOL}`);
  }
}

if (require.main === module) {
  runCli().catch(() => {
    process.exitCode = 1;
  });
}

module.exports = {
  LockToolError,
  SDK_CONTRACT_ROOT_ENV,
  UX_AGGREGATES,
  UX_SOURCE_FILES,
  assertSdkContractPackageRoot,
  buildSdkPackage,
  buildStagedSdk,
  buildUXReceipt,
  deriveSdkVersion,
  hashFile,
  installSealedSdk,
  reuseSealedSdkPackage,
  runPackedSdkContractSuite,
  runPackedSdkContractSuiteFromTarball,
  runCli,
  sealUXSources,
  stageUXSources,
  verifyLock,
  verifyPublishableSdkBoundary,
  verifySdkPackage,
  verifyUXSources,
  writeStagedSdkRegistryDependencies,
  writeStagedSdkVersion,
  writeJsonAtomic,
};
