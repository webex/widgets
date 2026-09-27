const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const {
  LockToolError,
  SDK_CONTRACT_ROOT_ENV,
  assertSdkContractPackageRoot,
  buildStagedSdk,
  buildSdkPackage,
  deriveSdkVersion,
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
} = require('../src/ai-summary-sdk-lock');

const sha256 = (value) => require('crypto').createHash('sha256').update(value).digest('hex');

const makeManifest = () => [
  {
    sourceId: 'UX-T1',
    kind: 'sceneGraph',
    path: '.ccwidgets/a/scene.json',
    sha256: sha256('scene'),
  },
  {
    sourceId: 'UX-T1',
    kind: 'screenshot',
    path: '.ccwidgets/a/screen.png',
    sha256: sha256('screen'),
  },
];

const manifestBytes = (entry) => {
  if (entry.kind === 'sceneGraph') {
    return 'scene';
  }
  if (entry.kind === 'textContent') {
    return 'text';
  }
  return 'screen';
};

const writeManifestFiles = (root, manifest = makeManifest()) => {
  for (const entry of manifest) {
    writeRelativeFile(root, entry.path, manifestBytes(entry));
  }
};

const writeRelativeFile = (root, relativePath, bytes) => {
  const filePath = path.join(root, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, bytes);
};

const makeGitRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-sdk-lock-'));
  childProcess.execFileSync('git', ['init'], {cwd: root, stdio: 'ignore'});
  return root;
};

const commitAll = (root, message = 'baseline') => {
  childProcess.execFileSync('git', ['config', 'user.email', 'test@example.invalid'], {cwd: root});
  childProcess.execFileSync('git', ['config', 'user.name', 'Test User'], {cwd: root});
  childProcess.execFileSync('git', ['add', '.'], {cwd: root, stdio: 'ignore'});
  childProcess.execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '-m', message], {
    cwd: root,
    stdio: 'ignore',
  });
};

const readReceipt = (root) =>
  JSON.parse(fs.readFileSync(path.join(root, 'design/default/sdk_package_lock.json'), 'utf8'));

const walkRegularFiles = (root) => {
  const files = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const filePath = path.join(dir, name);
      const stat = fs.lstatSync(filePath);
      if (stat.isDirectory()) {
        walk(filePath);
      } else if (stat.isFile()) {
        files.push({
          path: path.relative(root, filePath).split(path.sep).join('/'),
          sha256: sha256(fs.readFileSync(filePath)),
          sizeBytes: stat.size,
        });
      }
    }
  };
  walk(root);
  return files;
};

const writeTarOctal = (header, offset, length, value) => {
  header.write(value.toString(8).padStart(length - 1, '0').slice(-(length - 1)), offset, length - 1, 'ascii');
  header[offset + length - 1] = 0;
};

const makeTarHeader = ({name, typeflag = '0', content = '', linkName = ''}) => {
  const header = Buffer.alloc(512);
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content);
  header.write(name, 0, Math.min(Buffer.byteLength(name), 100), 'utf8');
  writeTarOctal(header, 100, 8, 0o644);
  writeTarOctal(header, 108, 8, 0);
  writeTarOctal(header, 116, 8, 0);
  writeTarOctal(header, 124, 12, typeflag === '0' ? body.length : 0);
  writeTarOctal(header, 136, 12, 0);
  header.fill(' ', 148, 156);
  header.write(typeflag, 156, 1, 'ascii');
  header.write(linkName, 157, Math.min(Buffer.byteLength(linkName), 100), 'utf8');
  header.write('ustar', 257, 5, 'ascii');
  header.write('00', 263, 2, 'ascii');
  const checksum = header.reduce((total, byte) => total + byte, 0);
  header.write(checksum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 32;
  return {header, body};
};

const writeTarball = (tarballPath, entries) => {
  const chunks = [];
  for (const entry of entries) {
    const {header, body} = makeTarHeader(entry);
    chunks.push(header);
    if (body.length > 0) {
      chunks.push(body);
      chunks.push(Buffer.alloc((512 - (body.length % 512)) % 512));
    }
  }
  chunks.push(Buffer.alloc(1024));
  fs.mkdirSync(path.dirname(tarballPath), {recursive: true});
  fs.writeFileSync(tarballPath, zlib.gzipSync(Buffer.concat(chunks)));
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const writeValidPendingReceipt = (root) => {
  const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
  const receipt = {
    schemaVersion: 1,
    sdk: {status: 'pending'},
    ux: {
      status: 'pending',
      resolutionRoot: '.',
      files: [],
    },
  };
  writeJson(receiptPath, receipt);
  return {receiptPath, bytes: fs.readFileSync(receiptPath)};
};

const expectLockErrorCode = (fn, code) => {
  try {
    fn();
    throw new Error(`expected LockToolError:${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(LockToolError);
    expect(error.code).toBe(code);
  }
};

const taskTypesDeclaration = `
export enum TASK_EVENTS {
  TASK_MID_CALL_SUMMARY_RECEIVED = "task:midCallSummaryReceived",
  TASK_FEATURE_ENABLEMENT = "task:featureEnablement",
}
export type WrapupPayLoad = {
  wrapUpReason: string;
  auxCodeId: string;
};
export type AISummaryAction = 'CONSULT' | 'TRANSFER';
export type AISummaryFeedback = 'none' | 'thumbs_up' | 'thumbs_down';
export type AISummaryState =
  | 'DEFAULT'
  | 'EXCLUDED'
  | 'IGNORED'
  | 'MID_CALL_CANCELLED'
  | 'NOT_RECEIVED';
export type AISummarySections = {
  initialContactReason?: string;
  additionalContactReasons?: string;
  additionalContext?: string;
  keyActionsTaken?: string;
  nextSteps?: string;
  reasonForTransferOrConsult?: string;
};
export type AISummary = {
  conversationId: string;
  adaptiveCard?: Record<string, unknown>;
  adaptiveCardId?: string;
  editAdaptiveCard?: Record<string, unknown>;
  editAdaptiveCardId?: string;
  areTranscriptsAvailable?: boolean;
  languageCode?: string;
  resolution?: string;
  sections?: AISummarySections;
  suggestedWrapUpCodesMessage?: string;
  summaryText?: string;
  timestamp?: number;
  [key: string]: unknown;
};
export type PostCallSummaryEventPayload = {
  conversationId: string;
  adaptiveCard: Record<string, unknown>;
  adaptiveCardId: string;
  languageCode: string;
  summaryText: string;
  areTranscriptsAvailable: boolean;
  timestamp: number;
};
export type MidCallSummaryEventPayload = {
  conversationId: string;
  adaptiveCard: Record<string, unknown>;
  adaptiveCardId: string;
  languageCode: string;
  summaryText: string;
  areTranscriptsAvailable: boolean;
  timestamp: number;
};
export type MidCallSummaryReceivingAgentPayload = {
  conversationId: string;
  adaptiveCard: Record<string, unknown>;
  adaptiveCardId: string;
  languageCode: string;
  summaryText: string;
  timestamp: number;
};
export type AISummaryFeatureEnablement = {
  interactionId: string;
  midCallEnabled?: boolean;
  postCallEnabled?: boolean;
  actionTimestamp?: number;
  [key: string]: unknown;
};
export type AISummaryCapabilities = Required<Pick<AISummaryFeatureEnablement, 'midCallEnabled' | 'postCallEnabled'>>;
export type AISummaryResponse = {
  summary: AISummarySections | string;
  feedback: AISummaryFeedback;
  state: AISummaryState;
  numberOfTimesViewed: number;
  numberOfTimesEdited: number;
  numberOfTimesCopied: number;
  summaryReceived?: boolean;
  wrapUpCode?: string;
};
export interface ITask {
  readonly aiSummaryCapabilities: Readonly<AISummaryCapabilities>;
  requestPostCallSummary(): Promise<AISummary>;
  sendPostCallSummaryResponse(response: AISummaryResponse): Promise<void>;
  requestMidCallSummary(action: AISummaryAction): Promise<AISummary>;
  sendMidCallSummaryResponse(
    response: AISummaryResponse,
    action: AISummaryAction
  ): Promise<void>;
}
`;

const indexDeclaration = `
export {
  TASK_EVENTS,
  WrapupPayLoad,
  AISummaryAction,
  AISummaryFeedback,
  AISummaryState,
  AISummarySections,
  AISummary,
  AISummaryFeatureEnablement,
  AISummaryResponse,
  PostCallSummaryEventPayload,
  MidCallSummaryEventPayload,
  MidCallSummaryReceivingAgentPayload,
  ITask,
} from './services/task/types';
`;

const runtimeSource = `
const AI_SUMMARY_DURATION_MS = 15000;
const TASK_FEATURE_ENABLEMENT = 'task:featureEnablement';
function requestPostCallSummary() {}
function sendPostCallSummaryResponse(response) { return response.wrapUpCode; }
function requestMidCallSummary() {}
function sendMidCallSummaryResponse() {}
`;

const writeRuntimeContractFiles = (installedRoot) => {
  fs.mkdirSync(path.join(installedRoot, 'dist/services/task'), {recursive: true});
  fs.mkdirSync(path.join(installedRoot, 'dist/services'), {recursive: true});
  fs.writeFileSync(path.join(installedRoot, 'dist/services/task/Task.js'), 'exports.default = function Task() {};');
  fs.writeFileSync(
    path.join(installedRoot, 'dist/services/ApiAiAssistant.js'),
    'exports.default = function ApiAIAssistant() {};'
  );
  fs.writeFileSync(
    path.join(installedRoot, 'dist/services/task/types.js'),
    [
      'exports.TASK_EVENTS = {',
      '  TASK_MID_CALL_SUMMARY_RECEIVED: "task:midCallSummaryReceived",',
      '  TASK_FEATURE_ENABLEMENT: "task:featureEnablement",',
      '};',
    ].join('\n')
  );
};

const SEALED_SDK_COMMIT = '123456789abcdef123456789abcdef123456789a';
const SEALED_SDK_VERSION = '3.12.0-cc-summaries.123456789abc';

const makeSdkInstalledRoot = (root, version = SEALED_SDK_VERSION) => {
  const installedRoot = path.join(root, 'node_modules/@webex/contact-center');
  writeJson(path.join(installedRoot, 'package.json'), {
    name: '@webex/contact-center',
    version,
    main: 'dist/webex.js',
    types: './dist/types/index.d.ts',
  });
  fs.mkdirSync(path.join(installedRoot, 'dist/types/services/task'), {recursive: true});
  fs.writeFileSync(path.join(installedRoot, 'dist/types/index.d.ts'), indexDeclaration);
  fs.writeFileSync(path.join(installedRoot, 'dist/types/services/task/types.d.ts'), taskTypesDeclaration);
  fs.mkdirSync(path.join(installedRoot, 'dist'), {recursive: true});
  fs.writeFileSync(path.join(installedRoot, 'dist/webex.js'), runtimeSource);
  writeRuntimeContractFiles(installedRoot);
  return installedRoot;
};

const makeSdkReceiptRoot = (root) => {
  const version = SEALED_SDK_VERSION;
  const source = {
    branch: 'cc-summaries',
    commit: SEALED_SDK_COMMIT,
  };
  writeJson(path.join(root, 'package.json'), {
    name: 'webex-widgets',
    private: true,
    packageManager: 'yarn@4.5.1',
    resolutions: {'@webex/contact-center': 'file:./vendor/contact-center-cc-summaries.tgz'},
  });
  writeJson(path.join(root, 'packages/contact-center/store/package.json'), {
    name: '@webex/cc-store',
    dependencies: {'@webex/contact-center': '3.12.0-next.123'},
  });
  fs.mkdirSync(path.join(root, 'vendor'), {recursive: true});
  fs.writeFileSync(path.join(root, 'vendor/contact-center-cc-summaries.tgz'), 'tarball-bytes');
  fs.writeFileSync(
    path.join(root, 'yarn.lock'),
    `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: ${version}\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=abc&locator=webex-widgets%40workspace%3A."\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n`
  );
  const installedRoot = makeSdkInstalledRoot(root, version);
  const files = walkRegularFiles(installedRoot);
  const declarations = walkRegularFiles(path.join(installedRoot, 'dist/types')).map((entry) => ({
    ...entry,
    path: `dist/types/${entry.path}`,
  }));
  const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
  writeJson(receiptPath, {
    schemaVersion: 1,
    sdk: {
      status: 'sealed',
      packageName: '@webex/contact-center',
      registryDescriptor: '3.12.0-next.123',
      version,
      tarball: {
        path: 'vendor/contact-center-cc-summaries.tgz',
        sha256: sha256('tarball-bytes'),
        sizeBytes: 'tarball-bytes'.length,
      },
      yarn: {
        checksum: 'localchecksum',
      },
      package: {files},
      declarations,
      contract: {
        taskSummaryEvents: {
          TASK_MID_CALL_SUMMARY_RECEIVED: 'task:midCallSummaryReceived',
          TASK_FEATURE_ENABLEMENT: 'task:featureEnablement',
        },
        taskFeatureEnablementEvent: 'task:featureEnablement',
        timeoutMs: 15000,
        packedRuntimeHarness: 'store-child',
        midCallCorrelationProbe: 'consult-transfer',
        sendStatusProbe: 'http-202-and-503',
        postWrapUpSameTaskProbe: 'fulfilled',
      },
      source: {
        ...source,
        treeSha256: sha256(JSON.stringify(files)),
        audit: {
          repositoryPath: path.join(root, 'sdk-source'),
          cleanBefore: {...source, status: 'clean'},
          cleanAfter: {...source, status: 'clean'},
        },
      },
      toolchain: {
        node: {
          version: 'v22.14.0',
          required: 'v22.14.x',
        },
        yarn: {
          sdk: {
            packageManager: 'yarn@4.5.1',
            version: '4.5.1',
          },
          widgets: {
            packageManager: 'yarn@4.5.1',
            version: '4.5.1',
          },
        },
      },
      commands: {
        install: {
          cwd: 'sdk-stage',
          argv: ['corepack', 'yarn', 'install', '--immutable'],
        },
        build: [
          {
            cwd: 'sdk-stage',
            argv: ['corepack', 'yarn', 'build:tools'],
          },
          {
            cwd: 'sdk-stage',
            argv: ['corepack', 'yarn', 'workspace', '@webex/contact-center', 'run', 'compile'],
          },
        ],
        pack: {
          cwd: 'sdk-stage',
          argv: ['corepack', 'yarn', 'workspace', '@webex/contact-center', 'pack', '--out', '/tmp/sdk.tgz'],
        },
        widgetLock: {
          cwd: 'widgets-root',
          argv: ['corepack', 'yarn', 'install'],
        },
        widgetInstall: {
          cwd: 'widgets-root',
          argv: ['corepack', 'yarn', 'install', '--immutable'],
        },
        probe: {
          cwd: 'widgets-root',
          argv: [
            'corepack',
            'yarn',
            'workspace',
            '@webex/cc-store',
            'test:unit',
            '--runInBand',
            '--runTestsByPath',
            'tests/ai-summary-contract.ts',
          ],
        },
      },
    },
    ux: {
      status: 'pending',
      resolutionRoot: '.',
      files: [],
    },
  });
  return {installedRoot, receiptPath};
};

const refreshSdkReceiptEvidence = (root, installedRoot) => {
  const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
  const receipt = readReceipt(root);
  receipt.sdk.package.files = walkRegularFiles(installedRoot);
  receipt.sdk.declarations = walkRegularFiles(path.join(installedRoot, 'dist/types')).map((entry) => ({
    ...entry,
    path: `dist/types/${entry.path}`,
  }));
  writeJson(receiptPath, receipt);
};

describe('ai-summary-sdk-lock UX admission', () => {
  const roots = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, {recursive: true, force: true});
    }
    process.exitCode = undefined;
    jest.restoreAllMocks();
  });

  const makeRoot = () => {
    const root = makeGitRoot();
    roots.push(root);
    return root;
  };

  const makeLinkedWorktreeFixture = ({manifest = makeManifest(), writeSources = true} = {}) => {
    const sourceRoot = makeRoot();
    writeRelativeFile(sourceRoot, 'README.md', 'baseline\n');
    commitAll(sourceRoot);

    const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-linked-worktree-'));
    fs.rmSync(targetRoot, {recursive: true, force: true});
    childProcess.execFileSync('git', ['worktree', 'add', '-b', 'ux-target', targetRoot, 'HEAD'], {
      cwd: sourceRoot,
      stdio: 'ignore',
    });
    roots.push(targetRoot);

    if (writeSources) {
      writeManifestFiles(sourceRoot, manifest);
    }
    return {sourceRoot, targetRoot, manifest};
  };

  const makeBuildSdkFixture = (options = {}) => {
    const root = makeRoot();
    const sourceRoot = makeRoot();
    childProcess.execFileSync('git', ['checkout', '-b', 'cc-summaries'], {cwd: sourceRoot, stdio: 'ignore'});
    writeJson(path.join(sourceRoot, 'package.json'), {
      name: 'webex-js-sdk',
      private: true,
      packageManager: 'yarn@4.5.1',
    });
    const sourcePackageRoot = path.join(sourceRoot, 'packages/@webex/contact-center');
    writeJson(path.join(sourcePackageRoot, 'package.json'), {
      name: '@webex/contact-center',
      version: '3.12.0-next.123',
      main: 'dist/webex.js',
      types: './dist/types/index.d.ts',
      dependencies: {},
    });
    fs.mkdirSync(path.join(sourcePackageRoot, 'dist/types/services/task'), {recursive: true});
    fs.writeFileSync(path.join(sourcePackageRoot, 'dist/types/index.d.ts'), indexDeclaration);
    fs.writeFileSync(path.join(sourcePackageRoot, 'dist/types/services/task/types.d.ts'), taskTypesDeclaration);
    fs.mkdirSync(path.join(sourcePackageRoot, 'dist'), {recursive: true});
    fs.writeFileSync(path.join(sourcePackageRoot, 'dist/webex.js'), runtimeSource);
    writeRuntimeContractFiles(sourcePackageRoot);
    if (options.mutateSourcePackage) {
      options.mutateSourcePackage(sourcePackageRoot, sourceRoot);
    }
    commitAll(sourceRoot, 'source');
    const commit = childProcess.execFileSync('git', ['rev-parse', 'HEAD'], {cwd: sourceRoot, encoding: 'utf8'}).trim();
    const version = `3.12.0-cc-summaries.${commit.slice(0, 12)}`;

    fs.writeFileSync(path.join(root, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
    writeJson(path.join(root, 'package.json'), {
      name: 'webex-widgets',
      private: true,
      packageManager: 'yarn@4.5.1',
    });
    writeJson(path.join(root, 'packages/contact-center/store/package.json'), {
      name: '@webex/cc-store',
      dependencies: {'@webex/contact-center': '3.12.0-next.123'},
    });
    fs.writeFileSync(
      path.join(root, 'yarn.lock'),
      `"@webex/contact-center@npm:3.12.0-next.123":\n  version: 3.12.0-next.123\n  resolution: "@webex/contact-center@npm:3.12.0-next.123"\n  checksum: baseline\n  languageName: node\n  linkType: hard\n`
    );
    fs.mkdirSync(path.join(root, 'vendor'), {recursive: true});
    fs.writeFileSync(path.join(root, 'vendor/contact-center-cc-summaries.tgz'), 'old-tarball');
    writeJson(path.join(root, 'design/default/sdk_package_lock.json'), {
      schemaVersion: 1,
      sdk: {status: 'pending'},
      ux: {status: 'sealed', resolutionRoot: '.', files: []},
    });

    return {root, sourceRoot, commit, version};
  };

  const admissionOwnedRelativePaths = [
    'package.json',
    'yarn.lock',
    'vendor/contact-center-cc-summaries.tgz',
    'design/default/sdk_package_lock.json',
    'packages/contact-center/store/package.json',
  ];

  const snapshotAdmissionOwnedFiles = (root) =>
    admissionOwnedRelativePaths.map((relativePath) => {
      const filePath = path.join(root, relativePath);
      return {
        relativePath,
        exists: fs.existsSync(filePath),
        bytes: fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined,
        mode: fs.existsSync(filePath) ? fs.statSync(filePath).mode & 0o777 : undefined,
      };
    });

  const expectAdmissionSnapshotRestored = (root, snapshot) => {
    for (const entry of snapshot) {
      const filePath = path.join(root, entry.relativePath);
      expect(fs.existsSync(filePath)).toBe(entry.exists);
      if (entry.exists) {
        expect(fs.readFileSync(filePath)).toEqual(entry.bytes);
        expect(fs.statSync(filePath).mode & 0o777).toBe(entry.mode);
      }
    }
  };

  const makeBuildSdkOptions = (fixture, overrides = {}) => ({
    widgetsRoot: fixture.root,
    sourceRoot: fixture.sourceRoot,
    execFileSync: makeBuildSdkExecFileSync(),
    runCommand: makeBuildSdkRunCommand(fixture),
    runPackedSdkContractSuiteFromTarball: () => '',
    nodeVersion: '22.14.0',
    ...overrides,
  });

  const expectNoBuildTransactions = (transactionParentDir) => {
    expect(fs.readdirSync(transactionParentDir).filter((name) => name.startsWith('ai-summary-sdk-build-'))).toEqual([]);
  };

  const makeBuildSdkExecFileSync = () => (command, args, options) => {
    if (command === 'corepack') {
      return 'node-modules\n';
    }
    return childProcess.execFileSync(command, args, options);
  };

  const installPackedSdkForFixture = (root) => {
    const extractRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-install-'));
    try {
      childProcess.execFileSync(
        'tar',
        ['-xzf', path.join(root, 'vendor/contact-center-cc-summaries.tgz'), '-C', extractRoot],
        {stdio: 'ignore'}
      );
      const installedRoot = path.join(root, 'node_modules/@webex/contact-center');
      fs.rmSync(installedRoot, {recursive: true, force: true});
      fs.mkdirSync(path.dirname(installedRoot), {recursive: true});
      fs.cpSync(path.join(extractRoot, 'package'), installedRoot, {recursive: true});
    } finally {
      fs.rmSync(extractRoot, {recursive: true, force: true});
    }
  };

  const makeBuildSdkRunCommand = ({root, version, afterWidgetInstall} = {}) => (command, args, options) => {
    const canonicalRoot = root ? fs.realpathSync(root) : root;
    if (command === 'corepack' && args[0] === 'yarn' && args[1] === '--version') {
      return '4.5.1\n';
    }
    if (command === 'corepack' && args[0] === 'yarn' && args.includes('pack')) {
      const outPath = args[args.indexOf('--out') + 1];
      const packageParent = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-pack-'));
      try {
        fs.cpSync(path.join(options.cwd, 'packages/@webex/contact-center'), path.join(packageParent, 'package'), {
          recursive: true,
        });
        childProcess.execFileSync('tar', ['--format', 'ustar', '-czf', outPath, '-C', packageParent, 'package'], {
          env: {...process.env, COPYFILE_DISABLE: '1'},
        });
      } finally {
        fs.rmSync(packageParent, {recursive: true, force: true});
      }
    }
    if (command === 'corepack' && args[0] === 'yarn' && args[1] === 'install' && options.cwd === canonicalRoot) {
      fs.writeFileSync(
        path.join(root, 'yarn.lock'),
        `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: ${version}\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=abc&locator=webex-widgets%40workspace%3A."\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n`
      );
      installPackedSdkForFixture(root);
      if (afterWidgetInstall) {
        afterWidgetInstall(args);
      }
    }
    return '';
  };

  it('stages, seals, and verifies linked-worktree UX files through exported functions', () => {
    const {sourceRoot, targetRoot, manifest} = makeLinkedWorktreeFixture();

    stageUXSources({sourceRoot, targetRoot, manifest});

    for (const entry of manifest) {
      expect(fs.readFileSync(path.join(targetRoot, ...entry.path.split('/')))).toEqual(
        fs.readFileSync(path.join(sourceRoot, ...entry.path.split('/')))
      );
    }

    fs.rmSync(path.join(sourceRoot, '.ccwidgets'), {recursive: true, force: true});
    const receipt = sealUXSources({
      widgetsRoot: targetRoot,
      manifest,
      now: new Date('2026-09-24T00:00:00.000Z'),
    });

    expect(receipt.sdk.status).toBe('pending');
    expect(receipt.ux.status).toBe('sealed');
    expect(receipt.ux.resolutionRoot).toBe('.');
    expect(receipt.ux.files.map((entry) => entry.path)).toEqual(manifest.map((entry) => entry.path));
    expect(verifyUXSources({widgetsRoot: targetRoot, manifest})).toEqual(receipt);
  });

  it('drives stage-ux, seal-ux, and verify-ux CLI paths against a linked worktree', async () => {
    const {sourceRoot, targetRoot, manifest} = makeLinkedWorktreeFixture();
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await runCli(['stage-ux', '--source-root', sourceRoot, '--target-root', targetRoot], {manifest});
    expect(process.exitCode).toBeUndefined();
    for (const entry of manifest) {
      expect(fs.readFileSync(path.join(targetRoot, ...entry.path.split('/')))).toEqual(
        fs.readFileSync(path.join(sourceRoot, ...entry.path.split('/')))
      );
    }

    fs.rmSync(path.join(sourceRoot, '.ccwidgets'), {recursive: true, force: true});
    await runCli(['seal-ux', '--widgets-root', targetRoot], {
      manifest,
      writeJsonAtomic: (receiptPath, receipt) => writeJson(receiptPath, receipt),
    });
    expect(process.exitCode).toBeUndefined();
    await runCli(['verify-ux', '--widgets-root', targetRoot], {manifest});
    expect(process.exitCode).toBeUndefined();
    expect(stderr).not.toHaveBeenCalled();
  });

  it('reports content-free CLI errors for D0a UX subcommands', async () => {
    const {targetRoot, manifest} = makeLinkedWorktreeFixture();
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await runCli(['stage-ux', '--source-root', 'relative', '--target-root', targetRoot], {manifest});
    expect(process.exitCode).toBe(1);
    expect(stderr).toHaveBeenCalledWith(`ai-summary-sdk-lock:source-root-not-absolute${os.EOL}`);

    process.exitCode = undefined;
    stderr.mockClear();
    await runCli(['seal-ux', '--widgets-root', path.join(targetRoot, 'missing')], {manifest});
    expect(process.exitCode).toBe(1);
    expect(stderr).toHaveBeenCalledWith(`ai-summary-sdk-lock:widgets-root-missing${os.EOL}`);

    process.exitCode = undefined;
    stderr.mockClear();
    await runCli(['verify-ux', '--widgets-root', targetRoot], {manifest});
    expect(process.exitCode).toBe(1);
    expect(stderr).toHaveBeenCalledWith(`ai-summary-sdk-lock:receipt-missing${os.EOL}`);
  });

  it('rejects wrong roots before staging', () => {
    const {targetRoot, manifest} = makeLinkedWorktreeFixture();

    expectLockErrorCode(() => stageUXSources({sourceRoot: 'relative', targetRoot, manifest}), 'source-root-not-absolute');
  });

  it('rejects overlapping, non-toplevel, non-common, and invalid-common checkout roots', () => {
    const {sourceRoot, targetRoot, manifest} = makeLinkedWorktreeFixture();
    const nestedTarget = path.join(sourceRoot, 'nested-target');
    fs.mkdirSync(nestedTarget);
    expectLockErrorCode(() => stageUXSources({sourceRoot, targetRoot: nestedTarget, manifest}), 'root-overlap');

    const targetSubdir = path.join(targetRoot, 'subdir');
    fs.mkdirSync(targetSubdir);
    expectLockErrorCode(() => stageUXSources({sourceRoot, targetRoot: targetSubdir, manifest}), 'target-root-mismatch');

    const wrongSourceRoot = makeRoot();
    expectLockErrorCode(() => stageUXSources({sourceRoot: wrongSourceRoot, targetRoot, manifest}), 'source-root-mismatch');

    const separateGitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-separate-git-'));
    roots.push(separateGitRoot);
    const separateGitDir = path.join(separateGitRoot, 'git-common');
    childProcess.execFileSync('git', ['init', '--separate-git-dir', separateGitDir, separateGitRoot], {
      stdio: 'ignore',
    });
    writeManifestFiles(separateGitRoot, manifest);
    expectLockErrorCode(
      () => stageUXSources({sourceRoot: separateGitRoot, targetRoot: separateGitRoot, manifest}),
      'git-common-dir-invalid'
    );
  });

  it('rolls back prior target bytes when staged promotion fails mid-transaction', () => {
    const manifest = [
      {
        sourceId: 'UX-T1',
        kind: 'sceneGraph',
        path: '.ccwidgets/a/scene.json',
        sha256: sha256('scene'),
      },
      {
        sourceId: 'UX-T1',
        kind: 'screenshot',
        path: '.ccwidgets/a/screen.png',
        sha256: sha256('screen'),
      },
      {
        sourceId: 'UX-T2',
        kind: 'textContent',
        path: '.ccwidgets/b/text.json',
        sha256: sha256('text'),
      },
    ];
    const {sourceRoot, targetRoot} = makeLinkedWorktreeFixture({manifest});
    writeRelativeFile(targetRoot, '.ccwidgets/a/scene.json', 'old-scene');
    const canonicalTargetRoot = fs.realpathSync(targetRoot);
    const sceneTarget = path.join(canonicalTargetRoot, '.ccwidgets/a/scene.json');
    const screenTarget = path.join(canonicalTargetRoot, '.ccwidgets/a/screen.png');
    const textTarget = path.join(canonicalTargetRoot, '.ccwidgets/b/text.json');
    const originalRenameSync = fs.renameSync;
    jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (to === textTarget) {
        throw new Error('injected promotion failure');
      }
      return originalRenameSync(from, to);
    });

    expect(() => stageUXSources({sourceRoot, targetRoot, manifest})).toThrow('injected promotion failure');

    expect(fs.readFileSync(sceneTarget, 'utf8')).toBe('old-scene');
    expect(fs.existsSync(screenTarget)).toBe(false);
    expect(fs.existsSync(textTarget)).toBe(false);
    expect(fs.readdirSync(targetRoot).filter((name) => name.startsWith('.ai-summary-ux-stage-'))).toEqual([]);
  });

  it('does not rewrite hash-identical files when source and target are the same root', () => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    const renameSync = jest.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('identical files must not be renamed');
    });

    expect(() => stageUXSources({sourceRoot: root, targetRoot: root, manifest})).not.toThrow();
    expect(renameSync).not.toHaveBeenCalled();
  });

  it('repeated staging and sealing preserves validated receipt bytes and the product fingerprint', () => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    const receipt = sealUXSources({widgetsRoot: root, manifest, now: new Date('2026-09-24T00:00:00.000Z')});
    receipt.sdk = {status: 'sealed', version: '3.12.0-cc-summaries.123456789abc'};
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    // Formatting and property order are not evidence changes; do not rewrite either.
    fs.writeFileSync(receiptPath, JSON.stringify({ux: receipt.ux, sdk: receipt.sdk, schemaVersion: 1}));
    const before = fs.readFileSync(receiptPath);
    const productFingerprint = () => sha256(JSON.stringify(walkRegularFiles(path.join(root, 'design'))));
    const fingerprint = productFingerprint();
    const writer = jest.fn(() => { throw new Error('unchanged sealing must not write'); });

    for (const date of ['2026-09-25T00:00:00.000Z', '2026-09-26T00:00:00.000Z']) {
      stageUXSources({sourceRoot: root, targetRoot: root, manifest});
      const resealed = sealUXSources({widgetsRoot: root, manifest, now: new Date(date), writeJsonAtomic: writer});
      expect(resealed).toEqual(receipt);
      expect(verifyUXSources({widgetsRoot: root, manifest})).toEqual(receipt);
      expect(fs.readFileSync(receiptPath)).toEqual(before);
      expect(productFingerprint()).toBe(fingerprint);
    }
    expect(writer).not.toHaveBeenCalled();
  });

  it.each(['sourceIdentitySha256', 'manifestSha256', 'sourceManifestSha256', 'requirementSha256'])
  ('does not silently reseal drifted %s authority', (field) => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    const receipt = sealUXSources({widgetsRoot: root, manifest});
    receipt.ux[field] = '0'.repeat(64);
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    writeJson(receiptPath, receipt);
    const before = fs.readFileSync(receiptPath);

    expect(() => sealUXSources({widgetsRoot: root, manifest})).toThrow(LockToolError);
    expect(fs.readFileSync(receiptPath)).toEqual(before);
  });

  it.each(['missing', 'symlink', 'receipt-file-hash', 'receipt-timestamp'])
  ('does not reuse an existing seal with %s evidence', (failure) => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    const receipt = sealUXSources({widgetsRoot: root, manifest});
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    const imagePath = path.join(root, manifest[1].path);
    if (failure === 'missing' || failure === 'symlink') {
      fs.unlinkSync(imagePath);
      if (failure === 'symlink') fs.symlinkSync(path.join(root, manifest[0].path), imagePath);
    } else if (failure === 'receipt-file-hash') {
      receipt.ux.files[0].sha256 = '0'.repeat(64);
      writeJson(receiptPath, receipt);
    } else {
      delete receipt.ux.sealedAt;
      writeJson(receiptPath, receipt);
    }
    const before = fs.readFileSync(receiptPath);
    expect(() => sealUXSources({widgetsRoot: root, manifest})).toThrow(LockToolError);
    expect(fs.readFileSync(receiptPath)).toEqual(before);
  });

  it('rejects a partial stage and leaves the prior receipt unchanged', () => {
    const {sourceRoot, targetRoot, manifest} = makeLinkedWorktreeFixture({writeSources: false});
    writeManifestFiles(sourceRoot, [manifest[0]]);
    const {receiptPath, bytes} = writeValidPendingReceipt(targetRoot);

    expectLockErrorCode(() => stageUXSources({sourceRoot, targetRoot, manifest}), 'path-missing');
    expect(fs.readFileSync(receiptPath)).toEqual(bytes);
    expect(fs.existsSync(path.join(targetRoot, ...manifest[0].path.split('/')))).toBe(false);
  });

  it('rejects a symlinked source path', () => {
    const {sourceRoot, targetRoot, manifest} = makeLinkedWorktreeFixture({writeSources: false});
    writeManifestFiles(sourceRoot, [manifest[1]]);
    fs.mkdirSync(path.join(sourceRoot, '.ccwidgets/a'), {recursive: true});
    fs.symlinkSync(
      path.join(sourceRoot, '.ccwidgets/a/screen.png'),
      path.join(sourceRoot, '.ccwidgets/a/scene.json')
    );

    expectLockErrorCode(() => stageUXSources({sourceRoot, targetRoot, manifest}), 'symlink-rejected');
  });

  it('rejects mutation between stage and seal without replacing the old receipt', () => {
    const {sourceRoot, targetRoot, manifest} = makeLinkedWorktreeFixture();
    stageUXSources({sourceRoot, targetRoot, manifest});
    sealUXSources({widgetsRoot: targetRoot, manifest, now: new Date('2026-09-24T00:00:00.000Z')});
    const oldReceipt = fs.readFileSync(path.join(targetRoot, 'design/default/sdk_package_lock.json'), 'utf8');

    fs.writeFileSync(path.join(targetRoot, '.ccwidgets/a/screen.png'), 'mutated');

    expectLockErrorCode(() => sealUXSources({widgetsRoot: targetRoot, manifest}), 'hash-mismatch');
    expect(fs.readFileSync(path.join(targetRoot, 'design/default/sdk_package_lock.json'), 'utf8')).toBe(oldReceipt);
  });

  it('seal-ux reads only target-root inputs after stage', () => {
    const {sourceRoot, targetRoot, manifest} = makeLinkedWorktreeFixture();
    stageUXSources({sourceRoot, targetRoot, manifest});
    fs.rmSync(path.join(sourceRoot, '.ccwidgets'), {recursive: true, force: true});

    sealUXSources({widgetsRoot: targetRoot, manifest});

    const receipt = readReceipt(targetRoot);
    expect(receipt.ux.files).toHaveLength(2);
    expect(receipt.ux.resolutionRoot).toBe('.');
  });

  it('restores the receipt when the atomic writer fails', () => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    const {receiptPath, bytes} = writeValidPendingReceipt(root);
    const writer = jest.fn(() => {
      throw new Error('disk failed');
    });

    expectLockErrorCode(
      () =>
        sealUXSources({
          widgetsRoot: root,
          manifest,
          writeJsonAtomic: writer,
        }),
      'receipt-write-failed'
    );
    expect(writer).toHaveBeenCalledTimes(1);
    const [writtenPath, writtenReceipt] = writer.mock.calls[0];
    expect(fs.realpathSync(writtenPath)).toBe(fs.realpathSync(receiptPath));
    expect(writtenReceipt).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        sdk: {status: 'pending'},
        ux: expect.objectContaining({status: 'sealed', resolutionRoot: '.'}),
      })
    );
    expect(fs.readFileSync(receiptPath)).toEqual(bytes);
  });

  it('verify-ux rejects receipt drift and target-only option misuse', () => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    sealUXSources({widgetsRoot: root, manifest});
    fs.writeFileSync(path.join(root, '.ccwidgets/a/scene.json'), 'changed');

    expect(() => verifyUXSources({widgetsRoot: root, manifest})).toThrow(LockToolError);
    expect(() => verifyUXSources({widgetsRoot: root, sourceRoot: root, manifest})).toThrow(LockToolError);
  });

  it.each([
    ['manifestSha256', (receipt) => { receipt.ux.manifestSha256 = '0'.repeat(64); }],
    ['sourceManifestSha256', (receipt) => { receipt.ux.sourceManifestSha256 = '0'.repeat(64); }],
    ['sourceIdentitySha256', (receipt) => { receipt.ux.sourceIdentitySha256 = '0'.repeat(64); }],
    ['requirementSha256', (receipt) => { receipt.ux.requirementSha256 = '0'.repeat(64); }],
    ['sealedAt', (receipt) => { receipt.ux.sealedAt = 'not-a-date'; }],
    ['files.sourceId', (receipt) => { receipt.ux.files[0].sourceId = 'UX-OTHER'; }],
    ['files.kind', (receipt) => { receipt.ux.files[0].kind = 'textContent'; }],
    ['files.path', (receipt) => { receipt.ux.files[0].path = '.ccwidgets/a/renamed.json'; }],
    ['files.sha256', (receipt) => { receipt.ux.files[0].sha256 = '0'.repeat(64); }],
    ['files.sizeBytes', (receipt) => { receipt.ux.files[0].sizeBytes += 1; }],
  ])('verify-ux rejects drifted UX receipt field: %s', (_field, mutate) => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    sealUXSources({widgetsRoot: root, manifest});
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    const receipt = readReceipt(root);
    mutate(receipt);
    writeJson(receiptPath, receipt);

    expect(() => verifyUXSources({widgetsRoot: root, manifest})).toThrow(LockToolError);
  });

  it('verify-ux accepts the same sealed target files after SDK admission', () => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    sealUXSources({widgetsRoot: root, manifest});
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    const receipt = readReceipt(root);
    receipt.sdk = {status: 'sealed'};
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

    expect(verifyUXSources({widgetsRoot: root, manifest}).sdk.status).toBe('sealed');
  });

  it('resealing UX preserves an already sealed SDK receipt', () => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    sealUXSources({widgetsRoot: root, manifest});
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    const receipt = readReceipt(root);
    receipt.sdk = {
      status: 'sealed',
      version: '3.12.0-cc-summaries.123456789abc',
      source: {branch: 'cc-summaries', commit: SEALED_SDK_COMMIT},
    };
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

    const resealed = sealUXSources({widgetsRoot: root, manifest, now: new Date('2026-09-24T01:00:00.000Z')});

    expect(resealed.sdk).toEqual(receipt.sdk);
    expect(readReceipt(root).sdk).toEqual(receipt.sdk);
  });

  it('derives an isolated cc-summaries development version from the registry dependency', () => {
    expect(deriveSdkVersion('3.12.0-next.123', '15f3da706d84c10bc632abe252cea202a70ae212')).toBe(
      '3.12.0-cc-summaries.15f3da706d84'
    );
  });

  it('stages a development version with registry-resolvable workspace dependencies', () => {
    const root = makeRoot();
    const stageRoot = path.join(root, 'stage');
    const packagePath = path.join(stageRoot, 'packages/@webex/contact-center/package.json');
    writeJson(packagePath, {
      name: '@webex/contact-center',
      dependencies: {
        '@webex/calling': 'workspace:*',
        lodash: '^4.17.21',
      },
    });
    fs.writeFileSync(
      path.join(root, 'yarn.lock'),
      `"@webex/contact-center@npm:3.12.0-next.123":\n  version: 3.12.0-next.123\n  resolution: "@webex/contact-center@npm:3.12.0-next.123"\n  dependencies:\n    "@webex/calling": "npm:3.12.0-next.98"\n    lodash: "npm:^4.17.21"\n  checksum: baseline\n  languageName: node\n  linkType: hard\n`
    );

    writeStagedSdkVersion(stageRoot, '3.12.0-cc-summaries.15f3da706d84');
    expect(JSON.parse(fs.readFileSync(packagePath, 'utf8')).dependencies['@webex/calling']).toBe('workspace:*');

    writeStagedSdkRegistryDependencies(stageRoot, root, '3.12.0-next.123');

    expect(JSON.parse(fs.readFileSync(packagePath, 'utf8'))).toMatchObject({
      version: '3.12.0-cc-summaries.15f3da706d84',
      dependencies: {
        '@webex/calling': '3.12.0-next.98',
        lodash: '^4.17.21',
      },
    });

    fs.writeFileSync(
      path.join(root, 'yarn.lock'),
      `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: 3.12.0-cc-summaries.15f3da706d84\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz"\n  dependencies:\n    "@webex/calling": "npm:3.12.0-next.98"\n  checksum: sealed\n  languageName: node\n  linkType: hard\n`
    );
    writeJson(packagePath, {
      name: '@webex/contact-center',
      dependencies: {'@webex/calling': 'workspace:*'},
    });
    writeStagedSdkRegistryDependencies(stageRoot, root, '3.12.0-next.123');
    expect(JSON.parse(fs.readFileSync(packagePath, 'utf8')).dependencies['@webex/calling']).toBe('3.12.0-next.98');
  });

  it('builds the staged SDK through its recursive topological compile script', () => {
    const calls = [];

    buildStagedSdk('/isolated-sdk-stage', {
      runCommand: (command, args, options) => {
        calls.push({command, args, cwd: options.cwd, errorCode: options.errorCode});
        return '';
      },
    });

    expect(calls).toEqual([
      {
        command: 'corepack',
        args: ['yarn', 'build:tools'],
        cwd: '/isolated-sdk-stage',
        errorCode: 'sdk-build-failed',
      },
      {
        command: 'corepack',
        args: ['yarn', 'workspace', '@webex/contact-center', 'run', 'compile'],
        cwd: '/isolated-sdk-stage',
        errorCode: 'sdk-build-failed',
      },
    ]);
  });

  it('runs Git probes with only the isolated child environment', () => {
    const sourceRoot = makeRoot();
    const targetRoot = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(sourceRoot, manifest);
    const calls = [];
    const previous = {
      GIT_DIR: process.env.GIT_DIR,
      GIT_INDEX_FILE: process.env.GIT_INDEX_FILE,
      GIT_WORK_TREE: process.env.GIT_WORK_TREE,
    };
    process.env.GIT_DIR = '/ambient/git-dir';
    process.env.GIT_INDEX_FILE = '/ambient/git-index';
    process.env.GIT_WORK_TREE = '/ambient/git-work-tree';
    const execFileSync = (command, args, options) => {
      if (command !== 'git') {
        throw new Error(`unexpected command: ${command}`);
      }
      calls.push({args, env: options.env});
      if (args.includes('--show-toplevel')) {
        return `${targetRoot}\n`;
      }
      if (args.includes('--git-common-dir')) {
        return `${path.join(sourceRoot, '.git')}\n`;
      }
      throw new Error(`unexpected git args: ${args.join(' ')}`);
    };

    try {
      stageUXSources({sourceRoot, targetRoot, manifest, execFileSync});
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.env.CI).toBe('1');
      expect(Object.keys(call.env).filter((key) => key.startsWith('GIT_'))).toEqual([]);
    }
  });

  it('runs the nodeLinker probe with only the isolated child environment', async () => {
    const root = makeRoot();
    fs.writeFileSync(path.join(root, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
    writeJson(path.join(root, 'package.json'), {
      name: 'webex-widgets',
      private: true,
      packageManager: 'yarn@4.5.1',
    });
    const corepackCalls = [];
    const previous = {
      YARN_ENABLE_IMMUTABLE_INSTALLS: process.env.YARN_ENABLE_IMMUTABLE_INSTALLS,
      YARN_NODE_LINKER: process.env.YARN_NODE_LINKER,
    };
    process.env.YARN_ENABLE_IMMUTABLE_INSTALLS = 'true';
    process.env.YARN_NODE_LINKER = 'pnp';
    const execFileSync = (command, args, options) => {
      if (command === 'corepack') {
        corepackCalls.push({args, env: options.env});
        return 'node-modules\n';
      }
      return childProcess.execFileSync(command, args, options);
    };

    try {
      await expect(
        buildSdkPackage({
          widgetsRoot: root,
          sourceRoot: path.join(root, 'missing-sdk'),
          execFileSync,
          runCommand: (command, args) => {
            if (command === 'corepack' && args[0] === 'yarn' && args[1] === '--version') {
              return '4.5.1\n';
            }
            return '';
          },
          nodeVersion: '22.14.0',
        })
      ).rejects.toMatchObject({code: 'sdk-source-root-missing'});
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }

    expect(corepackCalls).toEqual([
      expect.objectContaining({
        args: ['yarn', 'config', 'get', 'nodeLinker'],
      }),
    ]);
    expect(corepackCalls[0].env.CI).toBe('1');
    expect(Object.keys(corepackCalls[0].env).filter((key) => key.startsWith('YARN_'))).toEqual([]);
  });

  it('allows only the transactional widgets install to update the lockfile', () => {
    const calls = [];

    installSealedSdk('/widgets-root', {
      runCommand: (command, args, options) => {
        calls.push({command, args, cwd: options.cwd, env: options.env, errorCode: options.errorCode});
        return '';
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      command: 'corepack',
      args: ['yarn', 'install'],
      cwd: '/widgets-root',
      errorCode: 'widgets-install-failed',
    });
    expect(calls[0].env).toMatchObject({CI: '1', YARN_ENABLE_IMMUTABLE_INSTALLS: 'false'});
  });

  it('runs the packed SDK contract suite with only a canonical extraction root in the child environment', () => {
    const root = makeRoot();
    const packageRoot = makeSdkInstalledRoot(root);
    const calls = [];
    const previousSdkDir = process.env.WEBEX_JS_SDK_DIR;
    try {
      process.env.WEBEX_JS_SDK_DIR = '/must/not/leak';
      const result = runPackedSdkContractSuite(
        {widgetsRoot: root, packageRoot},
        {
          env: {UNEXPECTED_SECRET: 'must-not-leak'},
          runCommand: (command, args, options) => {
            calls.push({command, args, cwd: options.cwd, env: options.env, errorCode: options.errorCode});
            return '';
          },
        }
      );

      expect(result).toBe('');
      expect(calls).toEqual([
        expect.objectContaining({
          command: 'corepack',
          args: [
            'yarn',
            'workspace',
            '@webex/cc-store',
            'test:unit',
            '--runInBand',
            '--runTestsByPath',
            'tests/ai-summary-contract.ts',
          ],
          cwd: fs.realpathSync(root),
          errorCode: 'sdk-contract-suite-failed',
        }),
      ]);
      expect(calls[0].env[SDK_CONTRACT_ROOT_ENV]).toBe(fs.realpathSync(packageRoot));
      expect(calls[0].env.CI).toBe('1');
      expect(calls[0].env.WEBEX_JS_SDK_DIR).toBeUndefined();
      expect(calls[0].env.UNEXPECTED_SECRET).toBeUndefined();
      expect(Object.keys(calls[0].env).sort()).toEqual(
        expect.arrayContaining([SDK_CONTRACT_ROOT_ENV, 'CI', 'PATH'])
      );
    } finally {
      if (previousSdkDir === undefined) {
        delete process.env.WEBEX_JS_SDK_DIR;
      } else {
        process.env.WEBEX_JS_SDK_DIR = previousSdkDir;
      }
    }
  });

  it('validates package roots before handing them to the packed SDK contract suite', () => {
    const root = makeRoot();
    const packageRoot = makeSdkInstalledRoot(root);
    expect(assertSdkContractPackageRoot(packageRoot)).toBe(fs.realpathSync(packageRoot));

    writeJson(path.join(packageRoot, 'package.json'), {name: '@webex/not-contact-center'});
    expect(() => assertSdkContractPackageRoot(packageRoot)).toThrow(LockToolError);
  });

  it('cleans temporary tarball extractions after running the packed SDK contract suite', () => {
    const root = makeRoot();
    const packageParent = path.join(root, 'packed-source');
    const packageRoot = path.join(packageParent, 'package');
    makeSdkInstalledRoot(packageParent);
    fs.renameSync(path.join(packageParent, 'node_modules/@webex/contact-center'), packageRoot);
    fs.rmSync(path.join(packageParent, 'node_modules'), {recursive: true, force: true});
    const tarballPath = path.join(root, 'contact-center-cc-summaries.tgz');
    childProcess.execFileSync('tar', ['--format', 'ustar', '-czf', tarballPath, '-C', packageParent, 'package'], {
      env: {...process.env, COPYFILE_DISABLE: '1'},
    });
    let extractedPackageRoot;

    runPackedSdkContractSuiteFromTarball(
      {widgetsRoot: root, tarballPath},
      {
        runPackedSdkContractSuite: ({packageRoot: extractedRoot}) => {
          extractedPackageRoot = extractedRoot;
          expect(fs.existsSync(path.join(extractedRoot, 'package.json'))).toBe(true);
          return '';
        },
      }
    );

    expect(extractedPackageRoot).toBeDefined();
    expect(fs.existsSync(path.dirname(extractedPackageRoot))).toBe(false);
  });

  it('rejects bad candidate declarations even when the installed SDK declarations conform', () => {
    const root = makeRoot();
    makeSdkInstalledRoot(root);
    const candidate = path.join(root, 'candidate');
    const packageRoot = makeSdkInstalledRoot(candidate);
    const declarationPath = path.join(packageRoot, 'dist/types/services/task/types.d.ts');
    fs.writeFileSync(declarationPath, taskTypesDeclaration.replace(
      'requestMidCallSummary(action: AISummaryAction): Promise<AISummary>;',
      'requestMidCallSummary(action: AISummaryAction): Promise<void>;'
    ));
    const tarballPath = path.join(root, 'candidate.tgz');
    fs.renameSync(packageRoot, path.join(candidate, 'package'));
    childProcess.execFileSync('tar', ['--format', 'ustar', '-czf', tarballPath, '-C', candidate, 'package'], {
      env: {...process.env, COPYFILE_DISABLE: '1'},
    });
    const runtimeRunner = jest.fn();
    expectLockErrorCode(() => runPackedSdkContractSuiteFromTarball({widgetsRoot: root, tarballPath}, {
      runPackedSdkContractSuite: runtimeRunner,
    }), 'sdk-declaration-contract-invalid');
    expect(runtimeRunner).not.toHaveBeenCalled();
  });

  it.each([
    [
      'duplicate package member',
      [
        {name: 'package/package.json', content: '{"name":"@webex/contact-center"}'},
        {name: 'package/package.json', content: '{"name":"shadow"}'},
      ],
      'sdk-tarball-duplicate-entry',
    ],
    [
      'hardlink member',
      [
        {name: 'package/package.json', content: '{"name":"@webex/contact-center"}'},
        {name: 'package/linked.json', typeflag: '1', linkName: 'package/package.json'},
      ],
      'sdk-tarball-linked-entry',
    ],
    [
      'special member',
      [
        {name: 'package/package.json', content: '{"name":"@webex/contact-center"}'},
        {name: 'package/fifo', typeflag: '6'},
      ],
      'sdk-tarball-special-entry',
    ],
    ['missing package root', [{name: 'other/package.json', content: '{}'}], 'sdk-tarball-root-invalid'],
    ['out-of-root member', [{name: 'package.json', content: '{}'}], 'sdk-tarball-root-invalid'],
    ['escaping member', [{name: 'package/../escape.json', content: '{}'}], 'sdk-tarball-unsafe-entry'],
  ])('rejects unsafe tarball headers before extraction: %s', (_label, entries, code) => {
    const root = makeRoot();
    const tarballPath = path.join(root, 'contact-center-cc-summaries.tgz');
    const contractRunner = jest.fn();
    writeTarball(tarballPath, entries);

    expect(() =>
      runPackedSdkContractSuiteFromTarball(
        {widgetsRoot: root, tarballPath},
        {
          runPackedSdkContractSuite: contractRunner,
        }
      )
    ).toThrow(LockToolError);
    expect(contractRunner).not.toHaveBeenCalled();
    try {
      runPackedSdkContractSuiteFromTarball(
        {widgetsRoot: root, tarballPath},
        {
          runPackedSdkContractSuite: contractRunner,
        }
      );
    } catch (error) {
      expect(error.code).toBe(code);
    }
  });

  it('records source, toolchain, and command provenance for a conforming SDK build', async () => {
    const fixture = makeBuildSdkFixture();

    await buildSdkPackage(makeBuildSdkOptions(fixture, {now: new Date('2026-09-26T00:00:00.000Z')}));

    const receipt = readReceipt(fixture.root);
    expect(receipt.sdk.source).toMatchObject({
      branch: 'cc-summaries',
      commit: fixture.commit,
      audit: {
        repositoryPath: fs.realpathSync(fixture.sourceRoot),
        cleanBefore: {branch: 'cc-summaries', commit: fixture.commit, status: 'clean'},
        cleanAfter: {branch: 'cc-summaries', commit: fixture.commit, status: 'clean'},
      },
    });
    expect(receipt.sdk.toolchain).toEqual({
      node: {version: 'v22.14.0', required: 'v22.14.x'},
      yarn: {
        sdk: {packageManager: 'yarn@4.5.1', version: '4.5.1'},
        widgets: {packageManager: 'yarn@4.5.1', version: '4.5.1'},
      },
    });
    expect(receipt.sdk.commands).toMatchObject({
      install: {cwd: 'sdk-stage', argv: ['corepack', 'yarn', 'install', '--immutable']},
      widgetLock: {cwd: 'widgets-root', argv: ['corepack', 'yarn', 'install']},
      widgetInstall: {cwd: 'widgets-root', argv: ['corepack', 'yarn', 'install', '--immutable']},
      probe: {
        cwd: 'widgets-root',
        argv: [
          'corepack',
          'yarn',
          'workspace',
          '@webex/cc-store',
          'test:unit',
          '--runInBand',
          '--runTestsByPath',
          'tests/ai-summary-contract.ts',
        ],
      },
    });
    expect(receipt.sdk.commands.build.map((entry) => entry.argv)).toEqual([
      ['corepack', 'yarn', 'build:tools'],
      ['corepack', 'yarn', 'workspace', '@webex/contact-center', 'run', 'compile'],
    ]);
    expect(receipt.sdk.commands.pack.argv.slice(0, -1)).toEqual([
      'corepack',
      'yarn',
      'workspace',
      '@webex/contact-center',
      'pack',
      '--out',
    ]);
    expect(receipt.sdk.commands.pack.argv.at(-1)).toContain('contact-center-cc-summaries.tgz');
  });

  it('runs a complete SDK build with isolated child argv, cwd, environment, and transaction cleanup', async () => {
    const fixture = makeBuildSdkFixture();
    const transactionParentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-sdk-build-parent-'));
    roots.push(transactionParentDir);
    const calls = [];
    const delegate = makeBuildSdkRunCommand(fixture);
    const previous = {
      WEBEX_JS_SDK_DIR: process.env.WEBEX_JS_SDK_DIR,
      YARN_NODE_LINKER: process.env.YARN_NODE_LINKER,
      NPM_TOKEN: process.env.NPM_TOKEN,
    };
    process.env.WEBEX_JS_SDK_DIR = '/ambient/sdk';
    process.env.YARN_NODE_LINKER = 'pnp';
    process.env.NPM_TOKEN = 'must-not-leak';

    try {
      await buildSdkPackage(
        makeBuildSdkOptions(fixture, {
          transactionParentDir,
          runCommand: (command, args, options) => {
            calls.push({
              command,
              args: [...args],
              cwd: options.cwd,
              env: {...options.env},
              errorCode: options.errorCode,
            });
            return delegate(command, args, options);
          },
        })
      );
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }

    const widgetsRoot = fs.realpathSync(fixture.root);
    const stageRoot = calls.find((call) => call.cwd !== widgetsRoot).cwd;
    const transactionRoot = path.dirname(stageRoot);
    expect(path.dirname(transactionRoot)).toBe(transactionParentDir);
    expect(calls.map((call) => ({command: call.command, args: call.args, cwd: call.cwd}))).toEqual([
      {command: 'corepack', args: ['yarn', '--version'], cwd: widgetsRoot},
      {command: 'corepack', args: ['yarn', '--version'], cwd: stageRoot},
      {command: 'corepack', args: ['yarn', 'install', '--immutable'], cwd: stageRoot},
      {command: 'corepack', args: ['yarn', 'build:tools'], cwd: stageRoot},
      {
        command: 'corepack',
        args: ['yarn', 'workspace', '@webex/contact-center', 'run', 'compile'],
        cwd: stageRoot,
      },
      {
        command: 'corepack',
        args: [
          'yarn',
          'workspace',
          '@webex/contact-center',
          'pack',
          '--out',
          path.join(transactionRoot, 'contact-center-cc-summaries.tgz'),
        ],
        cwd: stageRoot,
      },
      {command: 'corepack', args: ['yarn', 'install'], cwd: widgetsRoot},
      {command: 'corepack', args: ['yarn', 'install', '--immutable'], cwd: widgetsRoot},
    ]);
    for (const call of calls) {
      expect(call.env.CI).toBe('1');
      expect(call.env.WEBEX_JS_SDK_DIR).toBeUndefined();
      expect(call.env.YARN_NODE_LINKER).toBeUndefined();
      expect(call.env.NPM_TOKEN).toBeUndefined();
      expect(Object.keys(call.env).filter((key) => key.startsWith('GIT_'))).toEqual([]);
      const yarnEnvKeys = Object.keys(call.env).filter((key) => key.startsWith('YARN_'));
      if (call.args.length === 2 && call.args[0] === 'yarn' && call.args[1] === 'install') {
        expect(yarnEnvKeys).toEqual(['YARN_ENABLE_IMMUTABLE_INSTALLS']);
        expect(call.env.YARN_ENABLE_IMMUTABLE_INSTALLS).toBe('false');
      } else {
        expect(yarnEnvKeys).toEqual([]);
      }
    }
    expectNoBuildTransactions(transactionParentDir);
  });

  it('rejects nonconforming Node and Corepack Yarn versions before repository writes', async () => {
    const nodeFixture = makeBuildSdkFixture();
    await expect(
      buildSdkPackage({
        widgetsRoot: nodeFixture.root,
        sourceRoot: nodeFixture.sourceRoot,
        execFileSync: makeBuildSdkExecFileSync(),
        runCommand: makeBuildSdkRunCommand(nodeFixture),
        nodeVersion: '20.0.0',
      })
    ).rejects.toMatchObject({code: 'node-version-invalid'});

    const yarnFixture = makeBuildSdkFixture();
    await expect(
      buildSdkPackage({
        widgetsRoot: yarnFixture.root,
        sourceRoot: yarnFixture.sourceRoot,
        execFileSync: makeBuildSdkExecFileSync(),
        runCommand: (command, args, options) => {
          if (command === 'corepack' && args[0] === 'yarn' && args[1] === '--version') {
            return options.cwd === fs.realpathSync(yarnFixture.root) ? '4.5.2\n' : '4.5.1\n';
          }
          return makeBuildSdkRunCommand(yarnFixture)(command, args, options);
        },
        nodeVersion: '22.14.0',
      })
    ).rejects.toMatchObject({code: 'widgets-yarn-version-mismatch'});

    expect(fs.readFileSync(path.join(nodeFixture.root, 'vendor/contact-center-cc-summaries.tgz'), 'utf8')).toBe(
      'old-tarball'
    );
    expect(fs.readFileSync(path.join(yarnFixture.root, 'vendor/contact-center-cc-summaries.tgz'), 'utf8')).toBe(
      'old-tarball'
    );
  });

  it.each([
    [
      'dirty source checkout',
      (fixture) => {
        fs.writeFileSync(path.join(fixture.sourceRoot, 'dirty.txt'), 'dirty');
      },
      'sdk-source-dirty',
    ],
    [
      'non-cc-summaries branch',
      (fixture) => {
        childProcess.execFileSync('git', ['checkout', '-b', 'main'], {cwd: fixture.sourceRoot, stdio: 'ignore'});
      },
      'sdk-branch-invalid',
    ],
  ])('rejects %s before admission writes', async (_label, mutate, code) => {
    const fixture = makeBuildSdkFixture();
    mutate(fixture);
    const before = snapshotAdmissionOwnedFiles(fixture.root);
    const calls = [];
    const delegate = makeBuildSdkRunCommand(fixture);

    await expect(
      buildSdkPackage(
        makeBuildSdkOptions(fixture, {
          runCommand: (command, args, options) => {
            calls.push({command, args: [...args], cwd: options.cwd});
            return delegate(command, args, options);
          },
        })
      )
    ).rejects.toMatchObject({code});

    expectAdmissionSnapshotRestored(fixture.root, before);
    expect(calls.some((call) => call.args.includes('pack') || call.args.includes('install'))).toBe(false);
  });

  it.each([
    [
      'node-linker drift',
      () => makeBuildSdkFixture(),
      (fixture) => {
        fs.writeFileSync(path.join(fixture.root, '.yarnrc.yml'), 'nodeLinker: pnp\n');
      },
      'node-linker-invalid',
    ],
    [
      'SDK packageManager pin mismatch',
      () =>
        makeBuildSdkFixture({
          mutateSourcePackage: (_sourcePackageRoot, sourceRoot) => {
            writeJson(path.join(sourceRoot, 'package.json'), {
              name: 'webex-js-sdk',
              private: true,
              packageManager: 'yarn@4.5.2',
            });
          },
        }),
      () => {},
      'sdk-yarn-version-mismatch',
    ],
  ])('rejects %s without changing admission-owned files', async (_label, makeFixture, mutate, code) => {
    const fixture = makeFixture();
    mutate(fixture);
    const transactionParentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-sdk-build-parent-'));
    roots.push(transactionParentDir);
    const before = snapshotAdmissionOwnedFiles(fixture.root);

    await expect(
      buildSdkPackage(
        makeBuildSdkOptions(fixture, {
          transactionParentDir,
        })
      )
    ).rejects.toMatchObject({code});

    expectAdmissionSnapshotRestored(fixture.root, before);
    expectNoBuildTransactions(transactionParentDir);
  });

  it('requires sealed UX evidence before SDK admission and leaves the receipt byte-identical', async () => {
    const fixture = makeBuildSdkFixture();
    const receiptPath = path.join(fixture.root, 'design/default/sdk_package_lock.json');
    const receipt = readReceipt(fixture.root);
    receipt.ux = {status: 'pending', resolutionRoot: '.', files: []};
    writeJson(receiptPath, receipt);
    const before = snapshotAdmissionOwnedFiles(fixture.root);
    const calls = [];
    const delegate = makeBuildSdkRunCommand(fixture);

    await expect(
      buildSdkPackage(
        makeBuildSdkOptions(fixture, {
          runCommand: (command, args, options) => {
            calls.push({command, args: [...args], cwd: options.cwd});
            return delegate(command, args, options);
          },
        })
      )
    ).rejects.toMatchObject({code: 'ux-seal-required'});

    expectAdmissionSnapshotRestored(fixture.root, before);
    expect(readReceipt(fixture.root).ux).toEqual(receipt.ux);
    expect(calls.some((call) => call.args.includes('pack') || call.args.includes('install'))).toBe(false);
  });

  it('rejects an unsafe packed SDK tar member before writing admission outputs', async () => {
    const fixture = makeBuildSdkFixture();
    const transactionParentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-sdk-build-parent-'));
    roots.push(transactionParentDir);
    const before = snapshotAdmissionOwnedFiles(fixture.root);
    const delegate = makeBuildSdkRunCommand(fixture);
    const contractRunner = jest.fn();

    await expect(
      buildSdkPackage(
        makeBuildSdkOptions(fixture, {
          transactionParentDir,
          runCommand: (command, args, options) => {
            if (command === 'corepack' && args[0] === 'yarn' && args.includes('pack')) {
              writeTarball(args[args.indexOf('--out') + 1], [
                {name: 'package', typeflag: '5'},
                {name: 'package/../escape.json', content: '{}'},
              ]);
              return '';
            }
            return delegate(command, args, options);
          },
          runPackedSdkContractSuiteFromTarball: contractRunner,
        })
      )
    ).rejects.toMatchObject({code: 'sdk-tarball-unsafe-entry'});

    expect(contractRunner).not.toHaveBeenCalled();
    expectAdmissionSnapshotRestored(fixture.root, before);
    expectNoBuildTransactions(transactionParentDir);
  });

  it('rejects a packed SDK declaration missing requestMidCallSummary before admission writes', async () => {
    const fixture = makeBuildSdkFixture({
      mutateSourcePackage: (sourcePackageRoot) => {
        const declarationPath = path.join(sourcePackageRoot, 'dist/types/services/task/types.d.ts');
        fs.writeFileSync(
          declarationPath,
          taskTypesDeclaration.replace('  requestMidCallSummary(action: AISummaryAction): Promise<AISummary>;\n', '')
        );
      },
    });
    const transactionParentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-sdk-build-parent-'));
    roots.push(transactionParentDir);
    const before = snapshotAdmissionOwnedFiles(fixture.root);
    const contractRunner = jest.fn();

    await expect(
      buildSdkPackage(
        makeBuildSdkOptions(fixture, {
          transactionParentDir,
          runPackedSdkContractSuiteFromTarball: contractRunner,
        })
      )
    ).rejects.toMatchObject({code: 'sdk-declaration-contract-invalid'});

    expect(contractRunner).not.toHaveBeenCalled();
    expectAdmissionSnapshotRestored(fixture.root, before);
    expectNoBuildTransactions(transactionParentDir);
  });

  it('rejects source movement after pack and preserves the existing repository state', async () => {
    const fixture = makeBuildSdkFixture();
    let packed = false;
    const beforeReceipt = fs.readFileSync(path.join(fixture.root, 'design/default/sdk_package_lock.json'));

    await expect(
      buildSdkPackage({
        widgetsRoot: fixture.root,
        sourceRoot: fixture.sourceRoot,
        execFileSync: makeBuildSdkExecFileSync(),
        runCommand: (command, args, options) => {
          const result = makeBuildSdkRunCommand(fixture)(command, args, options);
          if (command === 'corepack' && args[0] === 'yarn' && args.includes('pack') && !packed) {
            packed = true;
            fs.writeFileSync(path.join(fixture.sourceRoot, 'drift.txt'), 'dirty');
          }
          return result;
        },
        nodeVersion: '22.14.0',
      })
    ).rejects.toMatchObject({code: 'sdk-source-dirty'});

    expect(fs.readFileSync(path.join(fixture.root, 'design/default/sdk_package_lock.json'))).toEqual(beforeReceipt);
    expect(fs.readFileSync(path.join(fixture.root, 'vendor/contact-center-cc-summaries.tgz'), 'utf8')).toBe(
      'old-tarball'
    );
  });

  it('runs the contract suite for legacy receipts without a harness marker', () => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    const receipt = readReceipt(root);
    delete receipt.sdk.contract;
    writeJson(receiptPath, receipt);
    const contractRunner = jest.fn(() => '');

    expect(
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: contractRunner,
      }).sdk.status
    ).toBe('sealed');
    expect(contractRunner).toHaveBeenCalledTimes(1);
  });

  it('rejects legacy receipts without build provenance', () => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    const receipt = readReceipt(root);
    delete receipt.sdk.source.audit;
    delete receipt.sdk.toolchain;
    delete receipt.sdk.commands;
    writeJson(path.join(root, 'design/default/sdk_package_lock.json'), receipt);
    expectLockErrorCode(() => verifySdkPackage({widgetsRoot: root}), 'sdk-receipt-provenance-missing');
  });

  it('permits a sample host registry SDK dependency before admission', () => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    writeJson(path.join(root, 'widgets-samples/cc/example/package.json'), {
      name: 'example', private: true, devDependencies: {'@webex/contact-center': '3.12.0-next.123'},
    });
    expect(verifySdkPackage({widgetsRoot: root, runPackedSdkContractSuiteFromTarball: () => ''}).sdk.status)
      .toBe('sealed');
  });

  it('rejects a second production SDK dependency before admission', () => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    writeJson(path.join(root, 'packages/contact-center/example/package.json'), {
      name: 'example', devDependencies: {'@webex/contact-center': '3.12.0-next.123'},
    });
    expectLockErrorCode(() => verifySdkPackage({widgetsRoot: root}), 'sdk-workspace-owner-invalid');
  });

  it('rejects a sample host local SDK dependency before admission', () => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    writeJson(path.join(root, 'widgets-samples/cc/example/package.json'), {
      name: 'example', private: true, dependencies: {'@webex/contact-center': 'file:../../sdk.tgz'},
    });
    expectLockErrorCode(() => verifySdkPackage({widgetsRoot: root}), 'sdk-workspace-owner-invalid');
  });

  it('rejects sealed SDK receipts with partial build provenance', () => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    const receipt = readReceipt(root);
    delete receipt.sdk.toolchain;
    writeJson(receiptPath, receipt);

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
    try {
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      });
    } catch (error) {
      expect(error.code).toBe('sdk-receipt-provenance-missing');
    }
  });

  it('rolls back every admission-owned file when post-write store manifest drift is detected', async () => {
    const fixture = makeBuildSdkFixture();
    const trackedPaths = [
      'package.json',
      'yarn.lock',
      'vendor/contact-center-cc-summaries.tgz',
      'design/default/sdk_package_lock.json',
      'packages/contact-center/store/package.json',
    ];
    const before = trackedPaths.map((relativePath) => ({
      relativePath,
      bytes: fs.readFileSync(path.join(fixture.root, relativePath)),
      mode: fs.statSync(path.join(fixture.root, relativePath)).mode & 0o777,
    }));
    let drifted = false;

    await expect(
      buildSdkPackage({
        widgetsRoot: fixture.root,
        sourceRoot: fixture.sourceRoot,
        execFileSync: makeBuildSdkExecFileSync(),
        runCommand: makeBuildSdkRunCommand({
          ...fixture,
          afterWidgetInstall: () => {
            if (!drifted) {
              drifted = true;
              writeJson(path.join(fixture.root, 'packages/contact-center/store/package.json'), {
                name: '@webex/cc-store',
                dependencies: {'@webex/contact-center': '3.12.0-next.999'},
              });
            }
          },
        }),
        runPackedSdkContractSuiteFromTarball: () => '',
        nodeVersion: '22.14.0',
      })
    ).rejects.toMatchObject({code: 'store-manifest-drift'});

    for (const entry of before) {
      const filePath = path.join(fixture.root, entry.relativePath);
      expect(fs.readFileSync(filePath)).toEqual(entry.bytes);
      expect(fs.statSync(filePath).mode & 0o777).toBe(entry.mode);
    }
  });

  it.each([
    [
      'a post-resolution hook fails',
      'injected-after-resolution',
      (fixture) => ({
        afterRootSdkResolution: () => {
          throw new LockToolError('injected-after-resolution', 'injected after root resolution');
        },
      }),
    ],
    [
      'the mutable widget install fails',
      'widgets-install-failed',
      (fixture) => {
        const delegate = makeBuildSdkRunCommand(fixture);
        return {
          runCommand: (command, args, options) => {
            if (
              command === 'corepack' &&
              args[0] === 'yarn' &&
              args.length === 2 &&
              args[1] === 'install' &&
              options.cwd === fs.realpathSync(fixture.root)
            ) {
              throw new LockToolError('widgets-install-failed', 'injected install failure');
            }
            return delegate(command, args, options);
          },
        };
      },
    ],
    [
      'installed SDK bytes drift after immutable install',
      'installed-sdk-file-drift',
      (fixture) => ({
        runCommand: makeBuildSdkRunCommand({
          ...fixture,
          afterWidgetInstall: (args) => {
            if (args.includes('--immutable')) {
              fs.writeFileSync(
                path.join(fixture.root, 'node_modules/@webex/contact-center/dist/webex.js'),
                'installed drift'
              );
            }
          },
        }),
      }),
    ],
    [
      'receipt replacement fails',
      'receipt-write-failed',
      () => ({
        writeJsonAtomic: (filePath, value) => {
          if (filePath.endsWith('design/default/sdk_package_lock.json')) {
            throw new Error('injected receipt failure');
          }
          writeJson(filePath, value);
        },
      }),
    ],
  ])('rolls back package, lock, tarball, receipt, and store manifest when %s', async (_label, code, makeOverrides) => {
    const fixture = makeBuildSdkFixture();
    const transactionParentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-sdk-build-parent-'));
    roots.push(transactionParentDir);
    const before = snapshotAdmissionOwnedFiles(fixture.root);
    const beforeReceipt = readReceipt(fixture.root);

    await expect(
      buildSdkPackage(
        makeBuildSdkOptions(fixture, {
          transactionParentDir,
          ...makeOverrides(fixture),
        })
      )
    ).rejects.toMatchObject({code});

    expectAdmissionSnapshotRestored(fixture.root, before);
    expect(readReceipt(fixture.root).ux).toEqual(beforeReceipt.ux);
    expectNoBuildTransactions(transactionParentDir);
  });

  it('reports rollback failure without losing the original post-write diagnostic', async () => {
    const fixture = makeBuildSdkFixture();
    const originalRenameSync = fs.renameSync;
    let drifted = false;
    const failingRestoreTargets = [
      path.join(fs.realpathSync(fixture.root), 'package.json'),
      path.join(fs.realpathSync(fixture.root), 'yarn.lock'),
    ];
    jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (String(from).includes('.restore.') && failingRestoreTargets.includes(to)) {
        throw new Error('restore failed');
      }
      return originalRenameSync(from, to);
    });

    await expect(
      buildSdkPackage({
        widgetsRoot: fixture.root,
        sourceRoot: fixture.sourceRoot,
        execFileSync: makeBuildSdkExecFileSync(),
        runCommand: makeBuildSdkRunCommand({
          ...fixture,
          afterWidgetInstall: () => {
            if (!drifted) {
              drifted = true;
              writeJson(path.join(fixture.root, 'packages/contact-center/store/package.json'), {
                name: '@webex/cc-store',
                dependencies: {'@webex/contact-center': '3.12.0-next.999'},
              });
            }
          },
        }),
        runPackedSdkContractSuiteFromTarball: () => '',
        nodeVersion: '22.14.0',
      })
    ).rejects.toMatchObject({
      code: 'sdk-rollback-failed',
      details: {
        originalCode: 'store-manifest-drift',
      },
    });
  });

  it('rolls back admission-owned files when the packed SDK contract suite rejects the candidate', async () => {
    const root = makeRoot();
    const sourceRoot = makeRoot();
    childProcess.execFileSync('git', ['checkout', '-b', 'cc-summaries'], {cwd: sourceRoot, stdio: 'ignore'});
    childProcess.execFileSync('git', ['config', 'user.email', 'test@example.invalid'], {cwd: sourceRoot});
    childProcess.execFileSync('git', ['config', 'user.name', 'Test User'], {cwd: sourceRoot});
    writeJson(path.join(sourceRoot, 'package.json'), {
      name: 'webex-js-sdk',
      private: true,
      packageManager: 'yarn@4.5.1',
    });
    const sourcePackageRoot = path.join(sourceRoot, 'packages/@webex/contact-center');
    writeJson(path.join(sourcePackageRoot, 'package.json'), {
      name: '@webex/contact-center',
      version: '3.12.0-next.123',
      main: 'dist/webex.js',
      types: './dist/types/index.d.ts',
      dependencies: {},
    });
    fs.mkdirSync(path.join(sourcePackageRoot, 'dist/types/services/task'), {recursive: true});
    fs.writeFileSync(path.join(sourcePackageRoot, 'dist/types/index.d.ts'), indexDeclaration);
    fs.writeFileSync(path.join(sourcePackageRoot, 'dist/types/services/task/types.d.ts'), taskTypesDeclaration);
    fs.mkdirSync(path.join(sourcePackageRoot, 'dist'), {recursive: true});
    fs.writeFileSync(path.join(sourcePackageRoot, 'dist/webex.js'), runtimeSource);
    writeRuntimeContractFiles(sourcePackageRoot);
    childProcess.execFileSync('git', ['add', '.'], {cwd: sourceRoot, stdio: 'ignore'});
    childProcess.execFileSync('git', ['commit', '-m', 'source'], {cwd: sourceRoot, stdio: 'ignore'});

    fs.writeFileSync(path.join(root, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
    writeJson(path.join(root, 'package.json'), {
      name: 'webex-widgets',
      private: true,
      packageManager: 'yarn@4.5.1',
    });
    writeJson(path.join(root, 'packages/contact-center/store/package.json'), {
      name: '@webex/cc-store',
      dependencies: {'@webex/contact-center': '3.12.0-next.123'},
    });
    fs.writeFileSync(
      path.join(root, 'yarn.lock'),
      `"@webex/contact-center@npm:3.12.0-next.123":\n  version: 3.12.0-next.123\n  resolution: "@webex/contact-center@npm:3.12.0-next.123"\n  checksum: baseline\n  languageName: node\n  linkType: hard\n`
    );
    fs.mkdirSync(path.join(root, 'vendor'), {recursive: true});
    fs.writeFileSync(path.join(root, 'vendor/contact-center-cc-summaries.tgz'), 'old-tarball');
    writeJson(path.join(root, 'design/default/sdk_package_lock.json'), {
      schemaVersion: 1,
      sdk: {status: 'pending'},
      ux: {status: 'sealed', resolutionRoot: '.', files: []},
    });
    const before = [
      path.join(root, 'package.json'),
      path.join(root, 'yarn.lock'),
      path.join(root, 'vendor/contact-center-cc-summaries.tgz'),
      path.join(root, 'design/default/sdk_package_lock.json'),
      path.join(root, 'packages/contact-center/store/package.json'),
    ].map((filePath) => ({
      filePath,
      exists: fs.existsSync(filePath),
      bytes: fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined,
    }));
    let contractPackageRoot;
    const execFileSync = (command, args, options) => {
      if (command === 'corepack') {
        return 'node-modules\n';
      }
      return childProcess.execFileSync(command, args, options);
    };
    const runCommand = (command, args, options) => {
      if (command === 'corepack' && args[0] === 'yarn' && args[1] === '--version') {
        return '4.5.1\n';
      }
      if (command === 'corepack' && args[0] === 'yarn' && args.includes('pack')) {
        const outPath = args[args.indexOf('--out') + 1];
        const packageParent = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-pack-'));
        try {
          fs.cpSync(path.join(options.cwd, 'packages/@webex/contact-center'), path.join(packageParent, 'package'), {
            recursive: true,
          });
          childProcess.execFileSync('tar', ['--format', 'ustar', '-czf', outPath, '-C', packageParent, 'package'], {
            env: {...process.env, COPYFILE_DISABLE: '1'},
          });
        } finally {
          fs.rmSync(packageParent, {recursive: true, force: true});
        }
      }
      return '';
    };

    await expect(
      buildSdkPackage({
        widgetsRoot: root,
        sourceRoot,
        execFileSync,
        runCommand,
        runPackedSdkContractSuite: ({packageRoot}) => {
          contractPackageRoot = packageRoot;
          throw new LockToolError('sdk-contract-suite-failed', 'contract failed');
        },
      })
    ).rejects.toThrow(LockToolError);

    expect(contractPackageRoot).toBeDefined();
    expect(fs.existsSync(path.dirname(contractPackageRoot))).toBe(false);
    for (const entry of before) {
      expect(fs.existsSync(entry.filePath)).toBe(entry.exists);
      if (entry.exists) {
        expect(fs.readFileSync(entry.filePath)).toEqual(entry.bytes);
      }
    }
  });

  it('reuses a verified sealed SDK when source identity is unchanged', () => {
    const root = makeRoot();
    const {receiptPath} = makeSdkReceiptRoot(root);
    const receipt = readReceipt(root);
    receipt.sdk.source = {branch: 'cc-summaries', commit: SEALED_SDK_COMMIT};
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    const verifySdkPackage = jest.fn(() => receipt);

    expect(
      reuseSealedSdkPackage(
        root,
        {
          branch: 'cc-summaries',
          commit: SEALED_SDK_COMMIT,
          registryDescriptor: '3.12.0-next.123',
          version: '3.12.0-cc-summaries.123456789abc',
        },
        {verifySdkPackage}
      )
    ).toBe(receipt);
    expect(verifySdkPackage).toHaveBeenCalledTimes(1);

    expect(
      reuseSealedSdkPackage(
        root,
        {
          branch: 'cc-summaries',
          commit: 'changed',
          registryDescriptor: '3.12.0-next.123',
          version: '3.12.0-cc-summaries.changed',
        },
        {verifySdkPackage}
      )
    ).toBeNull();
  });

  it('verifies the sealed tarball, lock checksum, installed bytes, and declaration contract', () => {
    const root = makeRoot();
    const {installedRoot} = makeSdkReceiptRoot(root);
    const nestedBin = path.join(installedRoot, 'node_modules/.bin');
    fs.mkdirSync(nestedBin, {recursive: true});
    fs.symlinkSync('../uuid/bin/uuid', path.join(nestedBin, 'uuid'));
    const runPackedSdkContractSuiteFromTarball = jest.fn(() => '');

    expect(
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball,
      }).sdk.status
    ).toBe('sealed');
    expect(runPackedSdkContractSuiteFromTarball).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['non-cc-summaries branch', (receipt) => { receipt.sdk.source.branch = 'main'; }, 'sdk-source-identity-invalid'],
    ['short commit', (receipt) => { receipt.sdk.source.commit = '123456789abc'; }, 'sdk-source-identity-invalid'],
    ['non-hex commit', (receipt) => { receipt.sdk.source.commit = 'g'.repeat(40); }, 'sdk-source-identity-invalid'],
    [
      'commit/version mismatch',
      (receipt) => { receipt.sdk.source.commit = 'abcdefabcdefabcdefabcdefabcdefabcdefabcd'; },
      'sdk-version-drift',
    ],
    [
      'explicit version drift',
      (receipt) => { receipt.sdk.version = '3.12.0-cc-summaries.ffffffffffff'; },
      'sdk-version-drift',
    ],
  ])('rejects invalid SDK receipt identity: %s', (_label, mutate, code) => {
    const root = makeRoot();
    const {receiptPath} = makeSdkReceiptRoot(root);
    const receipt = readReceipt(root);
    mutate(receipt);
    writeJson(receiptPath, receipt);

    try {
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      });
      throw new Error('expected verifySdkPackage to reject invalid identity');
    } catch (error) {
      expect(error).toBeInstanceOf(LockToolError);
      expect(error.code).toBe(code);
    }
  });

  it('verifies the complete sealed SDK and UX lock through one command', async () => {
    const root = makeRoot();
    const manifest = makeManifest();
    writeManifestFiles(root, manifest);
    makeSdkReceiptRoot(root);
    const receiptPath = path.join(root, 'design/default/sdk_package_lock.json');
    const receipt = readReceipt(root);
    receipt.ux = sealUXSources({widgetsRoot: root, manifest}).ux;
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    const boundaryVerifier = jest.fn(() => ({checked: []}));

    expect(
      verifyLock({
        widgetsRoot: root,
        manifest,
        runPackedSdkContractSuiteFromTarball: () => '',
        verifyPublishableSdkBoundary: boundaryVerifier,
      }).sdk.status
    ).toBe('sealed');
    expect(boundaryVerifier).toHaveBeenCalledTimes(1);
    expect(() => verifyLock({widgetsRoot: root, manifest,
      runPackedSdkContractSuiteFromTarball: () => '',
      verifyPublishableSdkBoundary: () => {throw new LockToolError('publishable-sdk-boundary-invalid', 'bad pack');},
    })).toThrow(LockToolError);
    fs.writeFileSync(path.join(root, '.ccwidgets/a/scene.json'), 'drift');
    expect(() =>
      verifyLock({
        widgetsRoot: root,
        manifest,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);

    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await runCli(['verify', '--widgets-root', root]);
    expect(process.exitCode).toBe(1);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('ai-summary-sdk-lock:ux-receipt-file-count'));
  });

  it('verify-sdk ignores WEBEX_JS_SDK_DIR and rejects installed package drift', () => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    const previousSdkDir = process.env.WEBEX_JS_SDK_DIR;
    try {
      process.env.WEBEX_JS_SDK_DIR = path.join(root, 'does-not-matter');
      fs.writeFileSync(path.join(root, 'node_modules/@webex/contact-center/dist/webex.js'), 'drift');

      expect(() =>
        verifySdkPackage({
          widgetsRoot: root,
          runPackedSdkContractSuiteFromTarball: () => '',
        })
      ).toThrow(LockToolError);
    } finally {
      if (previousSdkDir === undefined) {
        delete process.env.WEBEX_JS_SDK_DIR;
      } else {
        process.env.WEBEX_JS_SDK_DIR = previousSdkDir;
      }
    }
  });

  it('rejects declaration exports that appear only in entrypoint comments', () => {
    const root = makeRoot();
    const {installedRoot} = makeSdkReceiptRoot(root);
    fs.writeFileSync(
      path.join(installedRoot, 'dist/types/index.d.ts'),
      `// AISummaryAction AISummaryFeedback AISummaryState AISummarySections AISummary AISummaryFeatureEnablement AISummaryResponse WrapupPayLoad ITask TASK_EVENTS\nexport type {AISummary} from './services/task/types';\n`
    );
    refreshSdkReceiptEvidence(root, installedRoot);

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
  });

  it('rejects unscoped declaration field drift even when a decoy type has the field', () => {
    const root = makeRoot();
    const {installedRoot} = makeSdkReceiptRoot(root);
    const declarationPath = path.join(installedRoot, 'dist/types/services/task/types.d.ts');
    fs.writeFileSync(
      declarationPath,
      taskTypesDeclaration
        .replace('  auxCodeId: string;\n', '')
        .concat('\nexport type DecoyWrapup = { auxCodeId: string; };\n')
    );
    refreshSdkReceiptEvidence(root, installedRoot);

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
  });

  it('rejects missing feature-enablement fields on the owning declaration type', () => {
    const root = makeRoot();
    const {installedRoot} = makeSdkReceiptRoot(root);
    const declarationPath = path.join(installedRoot, 'dist/types/services/task/types.d.ts');
    fs.writeFileSync(
      declarationPath,
      taskTypesDeclaration
        .replace('  interactionId: string;\n', '')
        .concat('\nexport type DecoyFeatureEnablement = { interactionId: string; };\n')
    );
    refreshSdkReceiptEvidence(root, installedRoot);

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
  });

  it('rejects candidates missing the receiver summary event even with a legacy event', () => {
    const root = makeRoot();
    const {installedRoot} = makeSdkReceiptRoot(root);
    const declarationPath = path.join(installedRoot, 'dist/types/services/task/types.d.ts');
    fs.writeFileSync(
      declarationPath,
      taskTypesDeclaration
        .replace('  TASK_MID_CALL_SUMMARY_RECEIVED = "task:midCallSummaryReceived",\n', '')
        .replace(
          '  TASK_FEATURE_ENABLEMENT = "task:featureEnablement",\n',
          '  TASK_MID_CALL_SUMMARY = "task:midCallSummary",\n  TASK_FEATURE_ENABLEMENT = "task:featureEnablement",\n'
        )
    );
    refreshSdkReceiptEvidence(root, installedRoot);

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
  });

  it('rejects missing public summary result declarations', () => {
    const root = makeRoot();
    const {installedRoot} = makeSdkReceiptRoot(root);
    const declarationPath = path.join(installedRoot, 'dist/types/services/task/types.d.ts');
    fs.writeFileSync(
      declarationPath,
      taskTypesDeclaration
        .replace(/export type AISummary = \{[\s\S]*?\};\n/, '')
        .concat(
          '\nexport type DecoyAISummary = { conversationId: string; summaryText?: string; timestamp?: number; };\n'
        )
    );
    refreshSdkReceiptEvidence(root, installedRoot);

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
  });

  it('rejects unresolved reachable declaration edges', () => {
    const root = makeRoot();
    const {installedRoot} = makeSdkReceiptRoot(root);
    fs.appendFileSync(
      path.join(installedRoot, 'dist/types/index.d.ts'),
      "\nexport type {MissingDeclaration} from './services/task/missing';\n"
    );
    refreshSdkReceiptEvidence(root, installedRoot);

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
  });

  it('rejects lock records that borrow checksum from a neighboring entry', () => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    fs.writeFileSync(
      path.join(root, 'yarn.lock'),
      `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: 3.12.0-cc-summaries.123456789abc\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=abc&locator=webex-widgets%40workspace%3A."\n  languageName: node\n  linkType: hard\n\n"left-pad@npm:1.3.0":\n  version: 1.3.0\n  resolution: "left-pad@npm:1.3.0"\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n`
    );

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
  });

  it.each([
    [
      'extra registry SDK entry',
      `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: 3.12.0-cc-summaries.123456789abc\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=abc&locator=webex-widgets%40workspace%3A."\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n\n"@webex/contact-center@npm:3.12.0-next.123":\n  version: 3.12.0-next.123\n  resolution: "@webex/contact-center@npm:3.12.0-next.123"\n  checksum: registry\n  languageName: node\n  linkType: hard\n`,
    ],
    [
      'extra local SDK locator',
      `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: 3.12.0-cc-summaries.123456789abc\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=abc&locator=webex-widgets%40workspace%3A."\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n\n"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=other%40workspace%3A.":\n  version: 3.12.0-cc-summaries.123456789abc\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=def&locator=other%40workspace%3A."\n  checksum: other\n  languageName: node\n  linkType: hard\n`,
    ],
    [
      'duplicate local SDK lock records',
      `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: 3.12.0-cc-summaries.123456789abc\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=abc&locator=webex-widgets%40workspace%3A."\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n\n"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets-duplicate%40workspace%3A.":\n  version: 3.12.0-cc-summaries.123456789abc\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=abc&locator=webex-widgets-duplicate%40workspace%3A."\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n`,
    ],
    [
      'registry resolution under local descriptor',
      `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: 3.12.0-cc-summaries.123456789abc\n  resolution: "@webex/contact-center@npm:3.12.0-next.123"\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n`,
    ],
    [
      'version mismatch',
      `"@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz::locator=webex-widgets%40workspace%3A.":\n  version: 3.12.0-next.123\n  resolution: "@webex/contact-center@file:./vendor/contact-center-cc-summaries.tgz#./vendor/contact-center-cc-summaries.tgz::hash=abc&locator=webex-widgets%40workspace%3A."\n  checksum: localchecksum\n  languageName: node\n  linkType: hard\n`,
    ],
  ])('rejects invalid SDK lock admission: %s', (_label, lockText) => {
    const root = makeRoot();
    makeSdkReceiptRoot(root);
    fs.writeFileSync(path.join(root, 'yarn.lock'), lockText);

    expect(() =>
      verifySdkPackage({
        widgetsRoot: root,
        runPackedSdkContractSuiteFromTarball: () => '',
      })
    ).toThrow(LockToolError);
  });

  it('verifies publishable workspaces keep registry SDK dependencies and rejects local aliases', () => {
    const root = makeRoot();
    writeJson(path.join(root, 'package.json'), {
      name: 'webex-widgets',
      private: true,
      resolutions: {'@webex/contact-center': 'file:./vendor/contact-center-cc-summaries.tgz'},
    });
    for (const workspace of [
      ['packages/contact-center/store/package.json', '@webex/cc-store', {'@webex/contact-center': '3.12.0-next.123'}],
      ['packages/contact-center/cc-components/package.json', '@webex/cc-components', {}],
      ['packages/contact-center/task/package.json', '@webex/cc-task', {}],
      ['packages/contact-center/ai-assistant/package.json', '@webex/cc-ai-assistant', {}],
      ['packages/contact-center/cc-widgets/package.json', '@webex/cc-widgets', {}],
      ['packages/contact-center/test-fixtures/package.json', '@webex/test-fixtures', {}],
    ]) {
      writeJson(path.join(root, workspace[0]), {name: workspace[1], dependencies: workspace[2]});
    }
    const makePackExecFileSync = (options = {}) => {
      const calls = [];
      const execFileSync = (command, args, commandOptions) => {
        if (command === 'corepack') {
          const workspaceName = args[2];
          calls.push(workspaceName);
          const workspace = [
            ['packages/contact-center/store/package.json', '@webex/cc-store'],
            ['packages/contact-center/cc-components/package.json', '@webex/cc-components'],
            ['packages/contact-center/task/package.json', '@webex/cc-task'],
            ['packages/contact-center/ai-assistant/package.json', '@webex/cc-ai-assistant'],
            ['packages/contact-center/cc-widgets/package.json', '@webex/cc-widgets'],
            ['packages/contact-center/test-fixtures/package.json', '@webex/test-fixtures'],
          ].find((entry) => entry[1] === workspaceName);
          const sourceManifest = JSON.parse(fs.readFileSync(path.join(root, workspace[0]), 'utf8'));
          const packedManifest = options.packedManifest?.(workspaceName, sourceManifest) || sourceManifest;
          const entries = [
            {name: 'package/package.json', content: `${JSON.stringify(packedManifest, null, 2)}\n`},
            {name: 'package/dist/index.js', content: 'module.exports = {};\n'},
          ];
          if (options.extraEntries) {
            entries.push(...options.extraEntries(workspaceName));
          }
          writeTarball(args[args.indexOf('--out') + 1], entries);
          return '';
        }
        return childProcess.execFileSync(command, args, commandOptions);
      };
      execFileSync.calls = calls;
      return execFileSync;
    };
    const execFileSync = makePackExecFileSync();

    expect(verifyPublishableSdkBoundary({widgetsRoot: root, execFileSync}).checked).toEqual([
      {workspace: '@webex/cc-store', mapName: 'dependencies', descriptor: '3.12.0-next.123'},
    ]);
    expect(execFileSync.calls).toEqual([
      '@webex/cc-store',
      '@webex/cc-components',
      '@webex/cc-task',
      '@webex/cc-ai-assistant',
      '@webex/cc-widgets',
      '@webex/test-fixtures',
    ]);

    writeJson(path.join(root, 'packages/contact-center/task/package.json'), {
      name: '@webex/cc-task',
      dependencies: {'@webex/contact-center': 'file:../../vendor/contact-center-cc-summaries.tgz'},
    });
    expect(() => verifyPublishableSdkBoundary({widgetsRoot: root, execFileSync: makePackExecFileSync()})).toThrow(
      LockToolError
    );

    writeJson(path.join(root, 'packages/contact-center/task/package.json'), {
      name: '@webex/cc-task',
      dependencies: {},
    });
    expect(() =>
      verifyPublishableSdkBoundary({
        widgetsRoot: root,
        execFileSync: makePackExecFileSync({
          packedManifest: (workspaceName, manifest) =>
            workspaceName === '@webex/cc-store'
              ? {...manifest, dependencies: {'@webex/contact-center': '^3.12.0'}}
              : manifest,
        }),
      })
    ).toThrow(LockToolError);

    expect(() =>
      verifyPublishableSdkBoundary({
        widgetsRoot: root,
        execFileSync: makePackExecFileSync({
          extraEntries: (workspaceName) =>
            workspaceName === '@webex/cc-store'
              ? [{name: 'package/vendor/renamed-sdk.tgz', content: 'vendored'}]
              : [],
        }),
      })
    ).toThrow(LockToolError);
  });

  it('runCli rejects missing and unknown subcommands with content-free diagnostics', async () => {
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await runCli([]);
    expect(process.exitCode).toBe(1);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('ai-summary-sdk-lock:missing-command'));

    process.exitCode = undefined;
    stderr.mockClear();

    await runCli(['not-a-command']);
    expect(process.exitCode).toBe(1);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('ai-summary-sdk-lock:unknown-command'));
  });
});
