const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const releaseVerifier = require('../src/verify-ai-summary-release');
const {
  PACKED_WORKSPACES,
  ReleaseVerificationError,
  verifySDKReceipt,
  verifyUXEvidence,
} = releaseVerifier;
const fixtureGitChanges = new Map();
const fixtureContext = (context) => ({
  readChangedPathsSinceBase: (root) => fixtureGitChanges.get(root), ...context,
});
const loadReleaseContext = (root, context = {}) => releaseVerifier.loadReleaseContext(root, fixtureContext(context));
const runCli = (context) => releaseVerifier.runCli(fixtureContext(context));
const runReleaseVerification = (context) => releaseVerifier.runReleaseVerification(fixtureContext(context));
const verifyDAGTraceability = (context) => releaseVerifier.verifyDAGTraceability(fixtureContext(context));
const verifyGateReceipts = (context) => releaseVerifier.verifyGateReceipts(fixtureContext(context));
const verifyPublishableDependencies = (context) => releaseVerifier.verifyPublishableDependencies(fixtureContext(context));
const verifyPrivacyAllowlist = (context) => releaseVerifier.verifyPrivacyAllowlist(fixtureContext(context));

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const EXPECTED_VISUAL_COMPARISON_IDS = [
  'UX-001--S01',
  'UX-002--S02',
  'UX-003--S03',
  'UX-004--S04',
  'UX-005--S05',
  'UX-006--S06',
  'UX-008--S08',
  'UX-009--S09',
  'UX-010--S10',
];
const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const PACKED_PACKAGE_PATHS = Object.freeze({
  '@webex/cc-store': 'packages/contact-center/store/package.json',
  '@webex/cc-components': 'packages/contact-center/cc-components/package.json',
  '@webex/cc-task': 'packages/contact-center/task/package.json',
  '@webex/cc-ai-assistant': 'packages/contact-center/ai-assistant/package.json',
  '@webex/cc-widgets': 'packages/contact-center/cc-widgets/package.json',
  '@webex/test-fixtures': 'packages/contact-center/test-fixtures/package.json',
});
const PACKAGING_RECEIPT_PATH = '.matrix/results/prog-mini-js/release/ai-summary-packed-workspaces.json';
const RELEASE_RECEIPT_PATH = '.matrix/results/prog-mini-js/release/ai-assistant-summary.json';
const UX_VISUAL_COMPARISON_PATH = '.matrix/results/prog-mini-js/ux_visual_comparison.json';
const VALID_SDK_DESCRIPTOR = '3.12.0-next.123';

function sdkDescriptors(manifest) {
  const descriptors = [];
  for (const mapName of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const descriptor = manifest[mapName]?.['@webex/contact-center'];
    if (descriptor !== undefined) {
      descriptors.push({mapName, descriptor});
    }
  }
  return descriptors;
}

function writeFile(root, relativePath, content = relativePath) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
  fs.writeFileSync(absolutePath, content);
  return absolutePath;
}

function writeJson(root, relativePath, value) {
  writeFile(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function updateJson(root, relativePath, mutate) {
  const value = readJson(root, relativePath);
  const next = mutate(value) || value;
  writeJson(root, relativePath, next);
  return next;
}

function mutateFileContentSameSize(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  const current = fs.readFileSync(absolutePath, 'utf8');
  const index = current.search(/[A-Za-z0-9]/);
  if (index < 0) {
    throw new Error(`Cannot mutate empty fixture file: ${relativePath}`);
  }
  const replacement = current[index] === 'x' ? 'y' : 'x';
  const mutated = `${current.slice(0, index)}${replacement}${current.slice(index + 1)}`;
  fs.writeFileSync(absolutePath, mutated);
}

function expectReleaseErrorCode(run, code) {
  let error;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ReleaseVerificationError);
  expect(error.code).toBe(code);
}

function fileEntry(root, relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return {
    path: relativePath,
    sha256: sha256(bytes),
    sizeBytes: bytes.length,
  };
}

function passedGate(extra = {}) {
  return {status: 'passed', sha256: sha256(JSON.stringify(extra)), ...extra};
}

function addReleaseReceipt(root, head, options = {}) {
  const changedFiles = (options.changedFiles || [
    'tooling/src/verify-ai-summary-release.js',
    'tooling/tests/verify-ai-summary-release.test.js',
    'packages/contact-center/task/src/helper.ts',
    'packages/contact-center/task/ai-docs/task-spec.md',
    'packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx',
    'packages/contact-center/cc-components/ai-docs/cc-components-spec.md',
  ]).sort();
  fixtureGitChanges.set(root, [...changedFiles]);
  const evidenceFiles = (options.evidenceFiles || [
    'design/default/sdk_package_lock.json',
    'playwright/visual/ai-summary-harness.json',
    'playwright/visual/ai-summary-visual-cases.ts',
    '.matrix/results/prog-mini-js/ux_visual_comparison.json',
  ]).sort();
  writeJson(root, 'design/default/implementation_dag.json', {
    tasks: [{id: 'D9-release-validation', files: changedFiles}],
  });
  for (const relativePath of [...changedFiles, ...evidenceFiles]) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      writeFile(root, relativePath, `${relativePath}\n`);
    }
  }
  const receipt = {
    schemaVersion: 1,
    kind: 'ai-summary-release',
    resolvedPromotionTarget: 'ai-assistant-summary',
    executionBranch: options.executionBranch || 'ai-assistant-summary',
    headCommit: options.headCommit || head,
    baseCommit: head,
    requirementSha256: sha256(fs.readFileSync(path.join(root, 'requirement.md'))),
    designSpecSha256: sha256(fs.readFileSync(path.join(root, 'design/default/design_spec.md'))),
    implementationDagSha256: sha256(fs.readFileSync(path.join(root, 'design/default/implementation_dag.json'))),
    changedFiles: changedFiles.map((relativePath) => fileEntry(root, relativePath)),
    evidenceFiles: evidenceFiles.map((relativePath) => fileEntry(root, relativePath)),
    gates: {
      D0: passedGate({postWrapUpSameTaskProbe: 'fulfilled'}),
      D8b: passedGate(),
      acceptance: passedGate(),
      verify: passedGate(),
      browser: passedGate(),
      visual: passedGate(),
      privacy: passedGate(),
      release: passedGate(),
      ...(options.gates || {}),
    },
    semanticRelease: {
      packages: [
        {name: '@webex/cc-task', releaseType: 'major', breaking: true, notes: 'BREAKING CHANGE: wrapupCall returns Promise<WrapupCompletionResult>.'},
        {name: '@webex/cc-components', releaseType: 'major', breaking: true, notes: 'BREAKING CHANGE: wrapupCall returns Promise<WrapupCompletionResult>.'},
      ],
      implementationCommit: {
        hash: head,
        footers: ['BREAKING CHANGE: direct React wrapupCall now returns Promise<WrapupCompletionResult>.'],
      },
      ...(options.semanticRelease || {}),
    },
  };
  for (const [name, gate] of Object.entries(receipt.gates)) {
    const gatePath = `.matrix/results/prog-mini-js/release/gates/${name}.json`;
    writeJson(root, gatePath, {status: gate.status, headCommit: head});
    gate.path = gatePath;
    gate.sha256 = sha256(fs.readFileSync(path.join(root, gatePath)));
  }
  const mutated = options.mutate ? options.mutate(receipt) || receipt : receipt;
  mutated.flowGateSha256 = sha256(stableStringify({...mutated}));
  writeJson(root, RELEASE_RECEIPT_PATH, mutated);
  return mutated;
}

function ux007Alias(sha256Value, overrides = {}) {
  return {
    declared: {
      sourceId: 'UX-007',
      screenshotId: 'S07-UX',
      variantId: 'desktop-light',
      ...(overrides.declared || {}),
    },
    canonical: {
      evidenceId: 'S07',
      variantId: 'dl',
      ...(overrides.canonical || {}),
    },
    sha256: overrides.sha256 || sha256Value,
  };
}

function addUX007VisualEvidenceFixture(root, sha256Value, options = {}) {
  const caseRoot = options.caseRoot || '.matrix/results/prog-mini-js/ux-visual/implementation/attempts/current/S07/dl';
  const alias = options.alias === undefined ? ux007Alias(sha256Value) : options.alias;
  const comparison = {
    comparison_id: 'S07/dl:deterministic',
    screen_id: 'UX-007/S07-UX',
    source_id: 'UX-007--S07-UX',
    source_capture_sha256: sha256Value,
    rendered_image: `${caseRoot}/rendered.png`,
    rendered_sha256: sha256('rendered'),
  };
  for (const extraComparison of options.extraComparisons || []) {
    if (extraComparison.rendered_image) {
      writeFile(root, extraComparison.rendered_image, 'rendered-extra');
    }
  }
  writeFile(root, `${caseRoot}/rendered.png`, 'rendered');
  writeFile(root, `${caseRoot}/target.png`, 'target');
  writeFile(root, `${caseRoot}/diff.png`, 'diff');
  writeJson(root, `${caseRoot}/registry.json`, {
    schemaVersion: 1,
    sourceId: 'UX-007',
    screenshotId: 'S07-UX',
    registryKey: 'S07/dl',
    declaredIdentity: {
      sourceId: 'UX-007',
      screenshotId: 'S07-UX',
      variantId: 'desktop-light',
      registryKey: 'UX-007/S07-UX',
      sha256: sha256Value,
    },
    canonicalIdentity: {
      evidenceId: 'S07',
      variantId: 'dl',
      registryKey: 'S07/dl',
      sha256: sha256Value,
    },
    ...(alias ? {declaredToCanonicalAlias: alias} : {}),
    sourceHashes: {
      sceneGraph: sha256('UX-007:sceneGraph'),
      textContent: sha256('UX-007:textContent'),
      screenshot: sha256Value,
    },
  });
  writeJson(root, `${caseRoot}/comparison.json`, {
    schema_version: 1,
    target_sha256: sha256Value,
    rendered_sha256: sha256('rendered'),
    diff_sha256: sha256('diff'),
    pixel_diff_percent: 0,
    comparison_identity: 'S07/dl',
    registry_key: 'S07/dl',
    declared_identity: {
      sourceId: 'UX-007',
      screenshotId: 'S07-UX',
      variantId: 'desktop-light',
      registryKey: 'UX-007/S07-UX',
      sha256: sha256Value,
    },
    canonical_identity: {
      evidenceId: 'S07',
      variantId: 'dl',
      registryKey: 'S07/dl',
      sha256: sha256Value,
    },
    ...(alias ? {declared_to_canonical_alias: alias} : {}),
    source_hashes: {
      sceneGraph: sha256('UX-007:sceneGraph'),
      textContent: sha256('UX-007:textContent'),
      screenshot: sha256Value,
    },
  });
  const identity = readJson(root, `${caseRoot}/comparison.json`);
  identity.record_sha256 = sha256(stableStringify(identity));
  writeJson(root, `${caseRoot}/comparison.identity.json`, identity);
  updateJson(root, `${caseRoot}/registry.json`, (registry) => {
    registry.comparisonIdentitySha256 = sha256(fs.readFileSync(path.join(root, caseRoot, 'comparison.identity.json')));
  });
  writeJson(root, '.matrix/results/prog-mini-js/ux-visual/implementation/attempts/current/raw-render.json', {
    schema_version: 1,
    scenarios: [
      {
        scenario_id: options.rawScenarioId || 'UX-007/S07-UX',
        source_ids: ['UX-007--S07-UX'],
        rendered_image: `${caseRoot}/rendered.png`,
        rendered_sha256: sha256('rendered'),
        comparison_path: `${caseRoot}/comparison.identity.json`,
        comparison_sha256: sha256(fs.readFileSync(path.join(root, caseRoot, 'comparison.identity.json'))),
      },
    ],
  });
  const baselineComparisons = EXPECTED_VISUAL_COMPARISON_IDS.map((sourceId) => ({
    comparison_id: `${sourceId}:deterministic`,
    screen_id: sourceId,
    source_id: sourceId,
    source_capture_sha256: sha256(sourceId),
    visual_analysis: {pixel_diff_percent: 12.5},
    rendered_image: `.matrix/results/prog-mini-js/ux-visual/implementation/attempts/current/${sourceId}/rendered.png`,
  }));
  writeJson(root, UX_VISUAL_COMPARISON_PATH, {
    schema_version: 3,
    comparisons: [...baselineComparisons, comparison, ...(options.extraComparisons || [])].sort((left, right) =>
      left.source_id.localeCompare(right.source_id)
    ),
  });
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-release-test-'));
  const head = '0123456789abcdef0123456789abcdef01234567';
  writeFile(root, '.git/HEAD', 'ref: refs/heads/ai-assistant-summary\n');
  writeFile(root, '.git/refs/heads/ai-assistant-summary', `${head}\n`);
  writeJson(root, 'package.json', {
    name: 'webex-widgets',
    private: true,
    workspaces: ['packages/contact-center/*', 'widgets-samples/**/**'],
    resolutions: {'@webex/contact-center': 'file:./vendor/contact-center-cc-summaries.tgz'},
  });
  writeFile(root, 'yarn.lock', '');
  writeFile(root, 'requirement.md', '# Requirement\n\n## Branch\n\nai-assistant-summary\n');
  writeJson(root, 'design/default/design_spec.md', {status: 'fixture'});
  writeFile(
    root,
    'playwright/visual/ai-summary-visual-cases.ts',
    [
      "export type UXSourceId = 'UX-001' | 'UX-010';",
      "export const caseA = {canonicalEvidenceId: 'S07'};",
      "export const structural = {sourceId: 'UX-010', screenshotId: 'S10', evidenceReason: 'requirement-availability-override'};",
      "export const state = 'post-call:generation-error-completion-escape';",
    ].join('\n')
  );
  writeJson(root, 'prog-mini-js.config.json', {
    ux_harness_descriptor: 'playwright/visual/ai-summary-harness.json',
  });
  writeJson(root, 'playwright/visual/ai-summary-harness.json', {
    schema_version: 1,
    input_paths: ['playwright/visual/ai-summary-visual-cases.ts'],
    scenarios: [
      {
        scenario_id: 'UX-001/S01',
        state_id: 'JNY-001:mid-call-summary',
        observed_selector: '[data-testid="consult-transfer:summary"]',
        expected_assertions: ['capture:framing-complete'],
      },
    ],
  });

  const uxFiles = [];
  for (let source = 1; source <= 10; source += 1) {
    const sourceId = `UX-${String(source).padStart(3, '0')}`;
    for (const kind of ['sceneGraph', 'textContent', 'screenshot']) {
      const relativePath = `.ccwidgets/${sourceId}/${kind}.json`;
      const content = `${sourceId}:${kind}`;
      writeFile(root, relativePath, content);
      uxFiles.push({sourceId, kind, path: relativePath, sha256: sha256(content)});
    }
  }
  const ux007Screenshot = uxFiles.find((entry) => entry.sourceId === 'UX-007' && entry.kind === 'screenshot');
  addUX007VisualEvidenceFixture(root, ux007Screenshot.sha256);
  writeJson(root, 'design/default/sdk_package_lock.json', {
    schemaVersion: 1,
    sdk: {status: 'sealed'},
    ux: {status: 'sealed', resolutionRoot: '.', files: uxFiles},
  });
  addReleaseReceipt(root, head);

  return {root, head};
}

function addPackagingFixture(root, options = {}) {
  const manifestByTarball = new Map();
  const workspaces = [];
  for (const workspaceName of PACKED_WORKSPACES) {
    const packageDir = workspaceName.replace('@webex/', '');
    const packagePath = PACKED_PACKAGE_PATHS[workspaceName];
    const sourceManifest = {name: workspaceName, version: '1.0.0'};
    const packedManifest = {name: workspaceName, version: '1.0.0'};
    if (workspaceName === '@webex/cc-store') {
      const sourceMapName = options.sourceDescriptorMap || options.descriptorMap || 'dependencies';
      const packedMapName = options.packedDescriptorMap || options.descriptorMap || sourceMapName;
      const sourceDescriptor =
        Object.prototype.hasOwnProperty.call(options, 'sourceDescriptor') ? options.sourceDescriptor : VALID_SDK_DESCRIPTOR;
      const packedDescriptor =
        Object.prototype.hasOwnProperty.call(options, 'packedDescriptor') ? options.packedDescriptor : sourceDescriptor;
      if (sourceDescriptor !== undefined) {
        sourceManifest[sourceMapName] = {'@webex/contact-center': sourceDescriptor};
      }
      if (packedDescriptor !== undefined) {
        packedManifest[packedMapName] = {'@webex/contact-center': packedDescriptor};
      }
    }
    const sourceManifestBytes = `${JSON.stringify(sourceManifest, null, 2)}\n`;
    writeFile(root, packagePath, sourceManifestBytes);
    const tarballPath = `.matrix/results/prog-mini-js/release/packages/${packageDir}.tgz`;
    writeFile(root, tarballPath, `${workspaceName} tarball`);
    const packedManifestBytes = Buffer.from(`${JSON.stringify(packedManifest, null, 2)}\n`);
    manifestByTarball.set(path.join(root, tarballPath), {
      manifest: packedManifest, manifestBytes: packedManifestBytes,
      packlist: options.actualPacklist || ['package/package.json'],
    });
    workspaces.push({
      name: workspaceName,
      packagePath,
      sourceManifestSha256: sha256(sourceManifestBytes),
      tarballPath,
      tarballSha256: sha256(`${workspaceName} tarball`),
      packedManifestSha256: sha256(packedManifestBytes),
      contactCenterDescriptors: sdkDescriptors(packedManifest),
      sourceContactCenterDescriptors: sdkDescriptors(sourceManifest),
      packlist: ['package/package.json'],
    });
  }
  if (options.mutateReceipt) {
    options.mutateReceipt(workspaces);
  }
  writeJson(root, PACKAGING_RECEIPT_PATH, {
    schemaVersion: 1,
    kind: 'ai-summary-packed-workspaces',
    workspaces,
  });
  const release = readJson(root, RELEASE_RECEIPT_PATH);
  const d8b = release.gates.D8b;
  updateJson(root, d8b.path, (gate) => {
    gate.packagingReceiptSha256 = sha256(fs.readFileSync(path.join(root, PACKAGING_RECEIPT_PATH)));
  });
  d8b.sha256 = sha256(fs.readFileSync(path.join(root, d8b.path)));
  delete release.flowGateSha256;
  release.flowGateSha256 = sha256(stableStringify(release));
  writeJson(root, RELEASE_RECEIPT_PATH, release);
  return {
    tarManifestReader: (tarballPath) => manifestByTarball.get(tarballPath),
  };
}

function readUX007ScreenshotHash(root) {
  const receipt = readJson(root, 'design/default/sdk_package_lock.json');
  return receipt.ux.files.find((entry) => entry.sourceId === 'UX-007' && entry.kind === 'screenshot').sha256;
}

function uxContext(root) {
  const receipt = readJson(root, RELEASE_RECEIPT_PATH);
  return {
    repositoryRoot: root,
    releaseContext: {
      releaseReceipt: receipt,
      changedFiles: receipt.changedFiles.map((entry) => entry.path),
      evidenceFiles: receipt.evidenceFiles.map((entry) => entry.path),
    },
    verifyUXSources: () => JSON.parse(fs.readFileSync(path.join(root, 'design/default/sdk_package_lock.json'), 'utf8')),
  };
}

describe('verify-ai-summary-release', () => {
  it('accepts local evidence and prohibitive policies in current and archived plans', () => {
    const {root} = makeRoot();
    const evidence = {
      figma_mcp_policy: 'forbidden',
      figma_acquisition_mode: 'json',
      mcp_used: false,
      figma_json_sources: [{mcp_policy: 'forbidden', root_node_id: '8061:880455'}],
      description: 'Local node_id and fileKey metadata; tool_call is a field name, not acquisition.',
      nodeId: '8061:880455',
    };
    for (const relativePath of [
      '.matrix/results/prog-mini-js/ux_visual_comparison_plan.json',
      '.matrix/results/prog-mini-js/ux-visual/implementation/prior-plans/local/ux_visual_comparison_plan.json',
      '.matrix/results/prog-mini-js/ux-visual/implementation/mcp-policy.json',
    ]) {
      writeJson(root, relativePath, evidence);
    }
    writeFile(root, '.matrix/results/prog-mini-js/ux-visual/implementation/local-nodeId-mcp-policy.txt', 'local metadata');
    expect(verifyUXEvidence(uxContext(root))).toEqual({files: 30});
  });

  it('rejects a missing UX-007 declared-to-canonical alias', () => {
    const {root} = makeRoot();
    addUX007VisualEvidenceFixture(root, readUX007ScreenshotHash(root), {alias: null});
    expect(() => verifyUXEvidence(uxContext(root))).toThrow(
      expect.objectContaining({code: 'ux-visual-alias-missing'})
    );
  });

  it('accepts ten sources with descriptor identities and alias metadata only in sidecars', () => {
    const {root} = makeRoot();
    const receipt = readJson(root, UX_VISUAL_COMPARISON_PATH);
    expect(receipt.comparisons).toHaveLength(10);
    expect(receipt.comparisons.some((entry) => entry.source_id === 'UX-010--S10')).toBe(true);
    expect(receipt.comparisons.every((entry) => !entry.declared_to_canonical_alias && !entry.registry_key)).toBe(true);
    expect(verifyUXEvidence(uxContext(root))).toEqual({files: 30});
  });

  it('rejects missing S10 diagnostic coverage', () => {
    const {root} = makeRoot();
    updateJson(root, UX_VISUAL_COMPARISON_PATH, (receipt) => {
      receipt.comparisons = receipt.comparisons.filter((entry) => entry.source_id !== 'UX-010--S10');
    });
    expectReleaseErrorCode(() => verifyUXEvidence(uxContext(root)), 'ux-visual-comparison-count-invalid');
  });

  it('rejects an S10 record without a measured difference', () => {
    const {root} = makeRoot();
    updateJson(root, UX_VISUAL_COMPARISON_PATH, (receipt) => {
      receipt.comparisons.find((entry) => entry.source_id === 'UX-010--S10').visual_analysis.pixel_diff_percent = null;
    });
    expectReleaseErrorCode(() => verifyUXEvidence(uxContext(root)), 'ux-visual-s10-measurement-missing');
  });

  it('rejects stale alias sidecars even when the raw descriptor identity is correct', () => {
    const {root} = makeRoot();
    updateJson(root, '.matrix/results/prog-mini-js/ux-visual/implementation/attempts/current/raw-render.json', (raw) => {
      raw.scenarios[0].comparison_sha256 = '0'.repeat(64);
    });
    expectReleaseErrorCode(() => verifyUXEvidence(uxContext(root)), 'ux-visual-alias-hash-mismatch');
  });

  it('keeps UX-007 identity valid after the host rewrites only raw comparator fields', () => {
    const {root} = makeRoot();
    const reportPath = '.matrix/results/prog-mini-js/ux-visual/implementation/attempts/current/S07/dl/comparison.json';
    const report = readJson(root, reportPath);
    writeJson(root, reportPath, {
      target_sha256: report.target_sha256,
      rendered_sha256: report.rendered_sha256,
      diff_sha256: report.diff_sha256,
      pixel_diff_percent: report.pixel_diff_percent,
    });
    expect(() => verifyUXEvidence(uxContext(root))).not.toThrow();
  });

  it('rejects a rewritten comparator whose images disagree with the immutable identity', () => {
    const {root} = makeRoot();
    updateJson(root, '.matrix/results/prog-mini-js/ux-visual/implementation/attempts/current/S07/dl/comparison.json', (report) => {
      report.rendered_sha256 = '0'.repeat(64);
    });
    expectReleaseErrorCode(() => verifyUXEvidence(uxContext(root)), 'ux-visual-alias-hash-mismatch');
  });

  it('rejects any non-UX-007 evidence remap', () => {
    const {root} = makeRoot();
    addUX007VisualEvidenceFixture(root, readUX007ScreenshotHash(root), {
      alias: ux007Alias(readUX007ScreenshotHash(root), {declared: {sourceId: 'UX-006', screenshotId: 'S06', variantId: 'dl'}}),
    });
    expect(() => verifyUXEvidence(uxContext(root))).toThrow(
      expect.objectContaining({code: 'ux-visual-alias-conflict'})
    );
  });

  it('rejects UX-007 alias hash disagreement', () => {
    const {root} = makeRoot();
    addUX007VisualEvidenceFixture(root, readUX007ScreenshotHash(root), {
      alias: ux007Alias(readUX007ScreenshotHash(root), {
        sha256: '0000000000000000000000000000000000000000000000000000000000000000',
      }),
    });
    expect(() => verifyUXEvidence(uxContext(root))).toThrow(
      expect.objectContaining({code: 'ux-visual-alias-hash-mismatch'})
    );
  });

  it('rejects duplicate canonical UX visual keys', () => {
    const {root} = makeRoot();
    addUX007VisualEvidenceFixture(root, readUX007ScreenshotHash(root), {
      extraComparisons: [
        {
          comparison_id: 'S07/dl:duplicate',
          screen_id: 'S07/dl',
          registry_key: 'S07/dl',
          source_id: 'UX-008--S08',
          rendered_image:
            '.matrix/results/prog-mini-js/ux-visual/implementation/attempts/current-duplicate/S07/dl/rendered.png',
        },
      ],
    });
    expect(() => verifyUXEvidence(uxContext(root))).toThrow(
      expect.objectContaining({code: 'ux-visual-comparison-count-invalid'})
    );
  });

  it.each([
    [
      'missing visual comparison receipt',
      ({root}) => fs.rmSync(path.join(root, UX_VISUAL_COMPARISON_PATH)),
      'ux-visual-evidence-missing',
    ],
    [
      'stale sealed UX source hash',
      ({root}) => writeFile(root, '.ccwidgets/UX-007/screenshot.json', 'stale screenshot evidence\n'),
      'ux-hash-drift',
    ],
    [
      'missing UX-007 alias',
      ({root}) => addUX007VisualEvidenceFixture(root, readUX007ScreenshotHash(root), {alias: null}),
      'ux-visual-alias-missing',
    ],
    [
      'non-UX-007 alias remap',
      ({root}) => addUX007VisualEvidenceFixture(root, readUX007ScreenshotHash(root), {
        alias: ux007Alias(readUX007ScreenshotHash(root), {
          declared: {sourceId: 'UX-006', screenshotId: 'S06', variantId: 'dl'},
        }),
      }),
      'ux-visual-alias-conflict',
    ],
    [
      'UX-007 alias hash mismatch',
      ({root}) => addUX007VisualEvidenceFixture(root, readUX007ScreenshotHash(root), {
        alias: ux007Alias(readUX007ScreenshotHash(root), {sha256: '0'.repeat(64)}),
      }),
      'ux-visual-alias-hash-mismatch',
    ],
    [
      'UX-007 comparison hash mismatch',
      ({root}) => updateJson(root, UX_VISUAL_COMPARISON_PATH, (receipt) => {
        const comparison = receipt.comparisons.find((entry) => entry.source_id === 'UX-007--S07-UX');
        comparison.source_capture_sha256 = '0'.repeat(64);
      }),
      'ux-visual-alias-conflict',
    ],
    [
      'UX-007 raw render substitutes the sidecar alias for descriptor identity',
      ({root}) => addUX007VisualEvidenceFixture(root, readUX007ScreenshotHash(root), {rawScenarioId: 'S07/dl'}),
      'ux-visual-alias-conflict',
    ],
    [
      'UX-010 diagnostic comparison replaces another required source',
      ({root}) => updateJson(root, UX_VISUAL_COMPARISON_PATH, (receipt) => {
        const index = receipt.comparisons.findIndex((entry) => entry.source_id === 'UX-009--S09');
        receipt.comparisons[index] = {
          ...receipt.comparisons[index],
          comparison_id: 'UX-010--S10:invalid',
          screen_id: 'UX-010--S10',
          registry_key: 'UX-010/S10',
          source_id: 'UX-010--S10',
        };
      }),
      'ux-visual-comparison-duplicate',
    ],
  ])('rejects UX receipt fail-closed path with exact code: %s', (_label, mutate, expectedCode) => {
    const fixture = makeRoot();
    mutate(fixture);
    expectReleaseErrorCode(() => verifyUXEvidence(uxContext(fixture.root)), expectedCode);
  });

  it.each([
    {mcp_used: true},
    {mcp_used: 'false'},
    {mcp_used: null},
    {mcp_used: 0},
    {figma_mcp_policy: 'required'},
    {mcp_policy: false},
    {mcp_policy: 'unknown'},
    {mcpToolCall: {server: 'figma'}},
    {figma_acquisition_mode: 'mcp'},
    {provenance: {provider: 'figma-mcp'}},
    {provenance: {tool: 'mcp__figma__get_design_context'}},
    {provenance: {remoteUrl: 'https://api.figma.com/v1/files/private?token=secret'}},
    {figma_mcp_policy: 'forbidden', nested: [{mcp_used: true}]},
  ])('rejects prohibited or ambiguous provenance without disclosing values: %j', (evidence) => {
    const {root} = makeRoot();
    const relativePath = '.matrix/results/prog-mini-js/ux-visual/implementation/evidence.json';
    writeJson(root, relativePath, evidence);
    let error;
    try { verifyUXEvidence(uxContext(root)); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(ReleaseVerificationError);
    expect(error.code).toBe('figma-mcp-provenance-detected');
    expect(error.provenance.evidence_path).toBe(relativePath);
    expect(error.provenance.field_path).toBeTruthy();
    expect(error.message).not.toContain('token=secret');
  });

  it.each(['ux_visual_comparison_plan.json', 'ux_visual_comparison.json', 'ux_visual_comparison_draft.json'])(
    'checks active evidence as well as archived evidence: %s', (filename) => {
      const {root} = makeRoot();
      const relativePath = `.matrix/results/prog-mini-js/${filename}`;
      if (filename === 'ux_visual_comparison.json') {
        updateJson(root, relativePath, (receipt) => {
          receipt.mcp_used = true;
        });
      } else {
        writeJson(root, relativePath, {mcp_used: true});
      }
      expectReleaseErrorCode(() => verifyUXEvidence(uxContext(root)), 'figma-mcp-provenance-detected');
    }
  );

  it('prints safe provenance file and field context in the CLI failure', async () => {
    const {root} = makeRoot();
    const relativePath = '.matrix/results/prog-mini-js/ux-visual/implementation/evidence.json';
    writeJson(root, relativePath, {provenance: {remoteUrl: 'https://api.figma.com/private?token=secret'}});
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const priorExitCode = process.exitCode;
    try {
      await runCli({repositoryRoot: root, verifySdkPackage: jest.fn(), verifyUXSources: uxContext(root).verifyUXSources});
      expect(process.exitCode).toBe(1);
      const message = stderr.mock.calls.map(([value]) => value).join('');
      expect(message).toContain('verify-ai-summary-release:figma-mcp-provenance-detected');
      expect(message).toContain(relativePath);
      expect(message).toContain('provenance.remoteUrl');
      expect(message).not.toContain('secret');
      expect(message).not.toContain(root);
    } finally {
      process.exitCode = priorExitCode;
      stderr.mockRestore();
    }
  });

  it('delegates SDK verification once in development mode and propagates rejection', async () => {
    const {root} = makeRoot();
    const verifySdkPackage = jest.fn(() => ({sdk: {status: 'sealed'}}));
    await expect(verifySDKReceipt({repositoryRoot: root, verifySdkPackage})).resolves.toEqual({sdk: {status: 'sealed'}});
    expect(verifySdkPackage).toHaveBeenCalledWith({widgetsRoot: root, resolutionMode: 'development'});

    const rejection = new Error('sdk drift');
    await expect(
      verifySDKReceipt({repositoryRoot: root, verifySdkPackage: jest.fn(() => { throw rejection; })})
    ).rejects.toBe(rejection);
  });

  it('passes the clean receipt fixture without launching child processes', async () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root);
    await expect(
      runReleaseVerification({
        repositoryRoot: root,
        verifySdkPackage: jest.fn(() => ({sdk: {status: 'sealed'}})),
        verifyUXSources: uxContext(root).verifyUXSources,
        tarManifestReader: packaging.tarManifestReader,
      })
    ).resolves.toMatchObject({publishable: {workspaces: 6}, ux: {files: 30}});
  });

  it.each([
    [
      'missing release receipt',
      ({root}) => fs.rmSync(path.join(root, RELEASE_RECEIPT_PATH)),
      'release-receipt-missing',
    ],
    [
      'missing flow hash',
      ({root}) => updateJson(root, RELEASE_RECEIPT_PATH, (receipt) => {
        delete receipt.flowGateSha256;
      }),
      'release-flow-hash-missing',
    ],
    [
      'flow hash mismatch',
      ({root}) => updateJson(root, RELEASE_RECEIPT_PATH, (receipt) => {
        receipt.flowGateSha256 = '0'.repeat(64);
      }),
      'release-flow-hash-mismatch',
    ],
    [
      'missing headCommit',
      ({root, head}) => addReleaseReceipt(root, head, {mutate: (receipt) => {
        delete receipt.headCommit;
      }}),
      'head-commit-missing',
    ],
    [
      'correct target on the wrong execution branch',
      ({root, head}) => {
        writeFile(root, '.git/HEAD', 'ref: refs/heads/not-the-release-branch\n');
        writeFile(root, '.git/refs/heads/not-the-release-branch', `${head}\n`);
        addReleaseReceipt(root, head, {executionBranch: 'ai-assistant-summary'});
      },
      'execution-branch-invalid',
    ],
    [
      'wrong promotion target',
      ({root, head}) => addReleaseReceipt(root, head, {
        mutate: (receipt) => {
          receipt.resolvedPromotionTarget = 'main';
        },
      }),
      'promotion-target-invalid',
    ],
    [
      'stale receipt head',
      ({root, head}) => addReleaseReceipt(root, head, {headCommit: 'fedcba9876543210fedcba9876543210fedcba98'}),
      'head-commit-mismatch',
    ],
    [
      'missing requirement Branch section',
      ({root}) => writeFile(root, 'requirement.md', '# Requirement\n\nNo branch section.\n'),
      'requirement-branch-missing',
    ],
    [
      'ambiguous requirement Branch section',
      ({root}) => writeFile(root, 'requirement.md', '# Requirement\n\n## Branch\n\nai-assistant-summary\nmain\n'),
      'requirement-branch-invalid',
    ],
    [
      'requirement hash drift',
      ({root}) => writeFile(root, 'requirement.md', '# Requirement\n\n## Branch\n\nai-assistant-summary\n\n## Drift\n\ntrue\n'),
      'release-core-hash-drift',
    ],
    [
      'design hash drift',
      ({root}) => writeJson(root, 'design/default/design_spec.md', {status: 'drifted'}),
      'release-core-hash-drift',
    ],
    [
      'DAG hash drift',
      ({root}) => writeJson(root, 'design/default/implementation_dag.json', {tasks: []}),
      'release-core-hash-drift',
    ],
    [
      'changed source hash drift',
      ({root}) => mutateFileContentSameSize(root, 'tooling/src/verify-ai-summary-release.js'),
      'release-manifest-hash-drift',
    ],
    [
      'evidence source hash drift',
      ({root}) => mutateFileContentSameSize(root, 'playwright/visual/ai-summary-harness.json'),
      'release-manifest-hash-drift',
    ],
    [
      'pending release gate',
      ({root, head}) => addReleaseReceipt(root, head, {
        gates: {verify: {status: 'pending', sha256: sha256('pending')}},
      }),
      'gate-receipt-not-passed',
    ],
    [
      'missing release gate',
      ({root, head}) => addReleaseReceipt(root, head, {mutate: (receipt) => {
        delete receipt.gates.verify;
      }}),
      'release-gate-missing',
    ],
    [
      'release gate without hash',
      ({root, head}) => addReleaseReceipt(root, head, {mutate: (receipt) => {
        delete receipt.gates.verify.sha256;
      }}),
      'release-gate-hash-missing',
    ],
    [
      'missing semantic-release evidence',
      ({root, head}) => addReleaseReceipt(root, head, {mutate: (receipt) => {
        delete receipt.semanticRelease;
      }}),
      'semantic-release-evidence-missing',
    ],
    [
      'missing major release evidence',
      ({root, head}) => addReleaseReceipt(root, head, {
        semanticRelease: {
          packages: [
            {name: '@webex/cc-task', releaseType: 'major', breaking: true, notes: 'BREAKING CHANGE: wrapupCall returns Promise.'},
            {name: '@webex/cc-components', releaseType: 'minor', breaking: false},
          ],
          implementationCommit: {footers: ['BREAKING CHANGE: wrapupCall returns Promise.']},
        },
      }),
      'semantic-release-major-missing',
    ],
    [
      'missing implementation breaking metadata',
      ({root, head}) => addReleaseReceipt(root, head, {
        semanticRelease: {
          packages: [
            {name: '@webex/cc-task', releaseType: 'major', breaking: true, notes: 'BREAKING CHANGE: wrapupCall returns Promise.'},
            {name: '@webex/cc-components', releaseType: 'major', breaking: true, notes: 'BREAKING CHANGE: wrapupCall returns Promise.'},
          ],
          implementationCommit: {footers: []},
        },
      }),
      'semantic-release-breaking-metadata-missing',
    ],
  ])('rejects release receipt fail-closed path with exact code: %s', (_label, mutate, expectedCode) => {
    const fixture = makeRoot();
    mutate(fixture);
    expectReleaseErrorCode(() => verifyGateReceipts({repositoryRoot: fixture.root}), expectedCode);
  });

  it('rejects remote Figma or MCP provenance in UX harness evidence', () => {
    const {root} = makeRoot();
    writeJson(root, 'playwright/visual/ai-summary-harness.json', {
      schema_version: 1,
      input_paths: ['playwright/visual/ai-summary-visual-cases.ts'],
      scenarios: [],
      provenance: {remoteUrl: 'https://www.figma.com/file/abc123/AI-Summary'},
    });
    expectReleaseErrorCode(() => verifyUXEvidence(uxContext(root)), 'figma-mcp-provenance-detected');

    writeJson(root, 'playwright/visual/ai-summary-harness.json', {
      schema_version: 1,
      input_paths: ['playwright/visual/ai-summary-visual-cases.ts'],
      scenarios: [],
    });
    writeJson(root, '.matrix/results/prog-mini-js/ux-visual/implementation/structural/case/accessibility.json', {
      mcpToolCall: {server: 'figma'},
    });
    expectReleaseErrorCode(() => verifyUXEvidence(uxContext(root)), 'figma-mcp-provenance-detected');
  });

  it('rejects packed local SDK descriptors from actual packed manifests', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root, {packedDescriptor: 'file:./vendor/contact-center-cc-summaries.tgz'});
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: packaging.tarManifestReader}),
      'publishable-sdk-descriptor-invalid'
    );
  });

  it('rejects packed SDK descriptor drift from the source manifest', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root, {packedDescriptor: '^3.12.0'});
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: packaging.tarManifestReader}),
      'packed-sdk-descriptor-drift'
    );
  });

  it.each([
    ['dependencies', 'owner/repo#v1'],
    ['devDependencies', 'file:./vendor/contact-center-cc-summaries.tgz'],
    ['optionalDependencies', 'latest'],
    ['peerDependencies', 'https://example.invalid/contact-center.tgz'],
  ])('rejects non-registry SDK descriptors from source %s with exact code', (descriptorMap, descriptor) => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root, {descriptorMap, sourceDescriptor: descriptor, packedDescriptor: VALID_SDK_DESCRIPTOR});
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: packaging.tarManifestReader}),
      'publishable-sdk-descriptor-invalid'
    );
  });

  it.each([
    ['dependencies', 'github:webex/contact-center'],
    ['devDependencies', '../contact-center-sdk'],
    ['optionalDependencies', 'workspace:*'],
    ['peerDependencies', '3.12.0.tgz'],
  ])('rejects non-registry SDK descriptors from packed %s with exact code', (descriptorMap, descriptor) => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root, {descriptorMap, packedDescriptor: descriptor});
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: packaging.tarManifestReader}),
      'publishable-sdk-descriptor-invalid'
    );
  });

  it('rejects stale source and packed manifest hashes', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root);
    writeJson(root, PACKED_PACKAGE_PATHS['@webex/cc-store'], {
      name: '@webex/cc-store',
      version: '1.0.1',
      dependencies: {'@webex/contact-center': '3.12.0-next.123'},
    });
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: packaging.tarManifestReader}),
      'source-manifest-drift'
    );

    const {root: packedRoot} = makeRoot();
    const stalePacked = addPackagingFixture(packedRoot, {
      mutateReceipt: (workspaces) => {
        workspaces[0].packedManifestSha256 = '0'.repeat(64);
      },
    });
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: packedRoot, tarManifestReader: stalePacked.tarManifestReader}),
      'packed-manifest-drift'
    );
  });

  it.each([
    [
      'recorded tarball hash',
      (workspaces) => {
        workspaces[0].tarballSha256 = '0'.repeat(64);
      },
      'packaging-tarball-drift',
    ],
    [
      'recorded source manifest hash',
      (workspaces) => {
        workspaces[0].sourceManifestSha256 = '0'.repeat(64);
      },
      'source-manifest-drift',
    ],
    [
      'recorded packed manifest hash',
      (workspaces) => {
        workspaces[0].packedManifestSha256 = '0'.repeat(64);
      },
      'packed-manifest-drift',
    ],
    [
      'recorded source SDK descriptors',
      (workspaces) => {
        workspaces[0].sourceContactCenterDescriptors = [];
      },
      'source-sdk-descriptor-receipt-drift',
    ],
    [
      'recorded packed SDK descriptors',
      (workspaces) => {
        workspaces[0].contactCenterDescriptors = [];
      },
      'packed-sdk-descriptor-receipt-drift',
    ],
  ])('rejects stale packaging receipt data with exact code: %s', (_label, mutateReceipt, expectedCode) => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root, {mutateReceipt});
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: packaging.tarManifestReader}),
      expectedCode
    );
  });

  it('rejects duplicate workspace entries, path escapes, and missing packlists', () => {
    const {root} = makeRoot();
    const duplicate = addPackagingFixture(root, {
      mutateReceipt: (workspaces) => {
        workspaces[1] = {...workspaces[0]};
      },
    });
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: duplicate.tarManifestReader}),
      'packaging-workspace-duplicate'
    );

    const {root: escapeRoot} = makeRoot();
    const escaped = addPackagingFixture(escapeRoot, {
      mutateReceipt: (workspaces) => {
        workspaces[0].tarballPath = '../escaped.tgz';
      },
    });
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: escapeRoot, tarManifestReader: escaped.tarManifestReader}),
      'packaging-tarball-path-escape'
    );

    const {root: missingPacklistRoot} = makeRoot();
    const missingPacklist = addPackagingFixture(missingPacklistRoot, {
      mutateReceipt: (workspaces) => {
        delete workspaces[0].packlist;
      },
    });
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({
        repositoryRoot: missingPacklistRoot,
        tarManifestReader: missingPacklist.tarManifestReader,
      }),
      'packaging-packlist-missing'
    );
  });

  it('rejects vendored archives or vendor segments in recorded packlists', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root, {
      mutateReceipt: (workspaces) => {
        workspaces[0].packlist = ['package/package.json', 'package/vendor/renamed-sdk.tgz'];
      },
    });
    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: packaging.tarManifestReader}),
      'packaging-vendor-tarball-leak'
    );
  });

  it('rejects hidden vendored files in the actual tarball when the receipt omits them', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root, {
      actualPacklist: ['package/package.json', 'package/vendor/private-sdk.tgz'],
    });
    expectReleaseErrorCode(() => verifyPublishableDependencies({repositoryRoot: root, ...packaging}),
      'packaging-vendor-tarball-leak');
  });

  it('rejects an actual tarball file list that differs from its receipt', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root, {actualPacklist: ['package/package.json', 'package/dist/extra.js']});
    expectReleaseErrorCode(() => verifyPublishableDependencies({repositoryRoot: root, ...packaging}),
      'packaging-packlist-drift');
  });

  it('scans devDependencies in every non-private workspace with strict registry semver', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root);
    writeJson(root, 'widgets-samples/custom-sample/app/package.json', {
      name: 'custom-sample',
      version: '1.0.0',
      devDependencies: {'@webex/contact-center': 'owner/repo#v1'},
    });

    expectReleaseErrorCode(
      () => verifyPublishableDependencies({repositoryRoot: root, tarManifestReader: packaging.tarManifestReader}),
      'publishable-sdk-descriptor-invalid'
    );
  });

  it('permits a sample host registry SDK dependency', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root);
    writeJson(root, 'widgets-samples/custom-sample/app/package.json', {
      name: 'custom-sample', private: true, devDependencies: {'@webex/contact-center': VALID_SDK_DESCRIPTOR},
    });
    expect(() => verifyPublishableDependencies({repositoryRoot: root, ...packaging})).not.toThrow();
  });

  it('rejects a second SDK dependency in a production package', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root);
    writeJson(root, 'packages/contact-center/example/package.json', {
      name: 'example', devDependencies: {'@webex/contact-center': VALID_SDK_DESCRIPTOR},
    });
    expectReleaseErrorCode(() => verifyPublishableDependencies({repositoryRoot: root, ...packaging}),
      'sdk-workspace-owner-invalid');
  });

  it('rejects a sample host local SDK dependency', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root);
    writeJson(root, 'widgets-samples/custom-sample/app/package.json', {
      name: 'custom-sample', private: true, dependencies: {'@webex/contact-center': 'portal:../../sdk'},
    });
    expectReleaseErrorCode(() => verifyPublishableDependencies({repositoryRoot: root, ...packaging}),
      'publishable-sdk-descriptor-invalid');
  });

  it('resolves linked-worktree HEAD refs through commondir and reads the common-checkout release receipt', () => {
    const {root, head} = makeRoot();
    const commonCheckout = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-common-checkout-'));
    const commonGitDir = path.join(commonCheckout, '.git');
    const worktreeGitDir = path.join(commonGitDir, 'worktrees', 'fixture');
    fs.mkdirSync(path.join(commonGitDir, 'refs/heads'), {recursive: true});
    fs.mkdirSync(worktreeGitDir, {recursive: true});
    fs.rmSync(path.join(root, '.git'), {recursive: true, force: true});
    writeFile(root, '.git', `gitdir: ${worktreeGitDir}\n`);
    fs.writeFileSync(path.join(worktreeGitDir, 'HEAD'), 'ref: refs/heads/ai-assistant-summary\n');
    fs.writeFileSync(path.join(worktreeGitDir, 'commondir'), '../..\n');
    fs.writeFileSync(path.join(commonGitDir, 'refs/heads/ai-assistant-summary'), `${head}\n`);
    fs.mkdirSync(path.join(commonCheckout, '.matrix/results/prog-mini-js/release'), {recursive: true});
    fs.copyFileSync(
      path.join(root, RELEASE_RECEIPT_PATH),
      path.join(commonCheckout, RELEASE_RECEIPT_PATH)
    );
    fs.rmSync(path.join(root, RELEASE_RECEIPT_PATH));

    const releaseContext = loadReleaseContext(root);
    expect(releaseContext.gitIdentity.headCommit).toBe(head);
    expect(releaseContext.releaseReceiptPath).toBe(path.join(commonCheckout, RELEASE_RECEIPT_PATH));
    fs.rmSync(commonCheckout, {recursive: true, force: true});
  });

  it.each([
    [
      '.git file without gitdir prefix',
      ({root}) => {
        fs.rmSync(path.join(root, '.git'), {recursive: true, force: true});
        writeFile(root, '.git', 'not a gitdir file\n');
      },
      'gitdir-invalid',
    ],
    [
      'linked worktree with empty commondir',
      ({root}) => {
        const worktreeGitDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-linked-worktree-')), '.git');
        fs.mkdirSync(worktreeGitDir, {recursive: true});
        fs.rmSync(path.join(root, '.git'), {recursive: true, force: true});
        writeFile(root, '.git', `gitdir: ${worktreeGitDir}\n`);
        writeFile(worktreeGitDir, 'HEAD', 'ref: refs/heads/ai-assistant-summary\n');
        writeFile(worktreeGitDir, 'commondir', '\n');
      },
      'git-commondir-invalid',
    ],
    [
      'linked worktree branch ref missing from commondir',
      ({root}) => {
        const commonCheckout = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-common-checkout-'));
        const commonGitDir = path.join(commonCheckout, '.git');
        const worktreeGitDir = path.join(commonGitDir, 'worktrees', 'fixture');
        fs.mkdirSync(worktreeGitDir, {recursive: true});
        fs.rmSync(path.join(root, '.git'), {recursive: true, force: true});
        writeFile(root, '.git', `gitdir: ${worktreeGitDir}\n`);
        writeFile(worktreeGitDir, 'HEAD', 'ref: refs/heads/ai-assistant-summary\n');
        writeFile(worktreeGitDir, 'commondir', '../..\n');
      },
      'head-ref-unresolved',
    ],
  ])('rejects invalid worktree identity with exact code: %s', (_label, mutate, expectedCode) => {
    const fixture = makeRoot();
    mutate(fixture);
    expectReleaseErrorCode(() => loadReleaseContext(fixture.root), expectedCode);
  });

  it('rejects executable changed sources that acquire remote Figma or MCP data', () => {
    const {root, head} = makeRoot();
    writeFile(root, 'packages/contact-center/task/src/helper.ts', "fetch('https://api.figma.com/v1/files/private');\n");
    addReleaseReceipt(root, head);

    expectReleaseErrorCode(() => verifyUXEvidence(uxContext(root)), 'figma-mcp-provenance-detected');
  });

  it('accepts verifier guards and fixtures containing prohibited provenance examples', () => {
    const {root, head} = makeRoot();
    writeFile(root, 'tooling/src/verify-ai-summary-release.js',
      'const rejected = /mcp__figma__get_design_context/; // Never fetch https://api.figma.com\n');
    writeFile(root, 'tooling/tests/verify-ai-summary-release.test.js',
      'const fixture = "fetch(\'https://api.figma.com/private\')";\n');
    addReleaseReceipt(root, head);
    expect(() => verifyUXEvidence(uxContext(root))).not.toThrow();
  });

  it.each(['file:./private.tgz', 'portal:../sdk', 'link:../sdk'])(
    'rejects a root SDK dependency using %s', (descriptor) => {
      const {root} = makeRoot();
      const packaging = addPackagingFixture(root);
      updateJson(root, 'package.json', (manifest) => {
        manifest.devDependencies = {'@webex/contact-center': descriptor};
      });
      expectReleaseErrorCode(() => verifyPublishableDependencies({repositoryRoot: root, ...packaging}),
        'publishable-sdk-descriptor-invalid');
    }
  );

  it('rejects a gate with no explicit passing status', () => {
    const {root, head} = makeRoot();
    addReleaseReceipt(root, head, {gates: {verify: {sha256: sha256('claim')}}});
    expectReleaseErrorCode(() => verifyGateReceipts({repositoryRoot: root}), 'gate-receipt-not-passed');
  });

  it('rejects gate hashes that are not bound to the referenced evidence bytes', () => {
    const {root, head} = makeRoot();
    addReleaseReceipt(root, head, {mutate: (receipt) => {receipt.gates.verify.sha256 = 'a'.repeat(64);}});
    expectReleaseErrorCode(() => verifyGateReceipts({repositoryRoot: root}), 'release-gate-hash-mismatch');
  });

  it.each(['**/@webex/contact-center', '@webex/cc-store/@webex/contact-center'])(
    'rejects local SDK-targeting root resolution %s', (resolutionKey) => {
      const {root} = makeRoot();
      const packaging = addPackagingFixture(root);
      updateJson(root, 'package.json', (manifest) => {manifest.resolutions[resolutionKey] = 'portal:../sdk';});
      expectReleaseErrorCode(() => verifyPublishableDependencies({repositoryRoot: root, ...packaging}),
        'publishable-sdk-descriptor-invalid');
    }
  );

  it('rejects omitted live Git changes even with a valid self-hash', () => {
    const {root, head} = makeRoot();
    addReleaseReceipt(root, head, {mutate: (receipt) => {receipt.changedFiles.pop();}});
    expectReleaseErrorCode(() => loadReleaseContext(root), 'release-changed-scope-mismatch');
  });

  it('rejects empty changed-file manifests', () => {
    const {root, head} = makeRoot();
    addReleaseReceipt(root, head, {mutate: (receipt) => {receipt.changedFiles = [];}});
    expectReleaseErrorCode(() => loadReleaseContext(root), 'release-changed-manifest-invalid');
  });

  it('rejects a packaging receipt not bound by D8b', () => {
    const {root} = makeRoot();
    const packaging = addPackagingFixture(root);
    updateJson(root, PACKAGING_RECEIPT_PATH, (receipt) => {receipt.generatedAt = 'changed';});
    expectReleaseErrorCode(() => verifyPublishableDependencies({repositoryRoot: root, ...packaging}),
      'packaging-gate-binding-mismatch');
  });

  it('rejects dependency direction violations', () => {
    const {root} = makeRoot();
    const relativePath = 'packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx';
    writeFile(root, relativePath, "import '@webex/cc-task';\n");
    expectReleaseErrorCode(() =>
      verifyDAGTraceability({
        repositoryRoot: root,
        releaseContext: {changedFiles: [relativePath]},
        changedFiles: [relativePath],
      }),
      'dependency-direction-violation'
    );
  });

  it('allows error normalization identifiers but rejects sending raw errors to logging sinks', () => {
    const {root} = makeRoot();
    const relativePath = 'packages/contact-center/store/src/ai-summary.ts';
    writeFile(root, relativePath, 'export const normalize = (rawError: unknown) => ({category: "failure"});\n');
    expect(() => verifyPrivacyAllowlist({repositoryRoot: root, changedFiles: [relativePath]})).not.toThrow();
    writeFile(root, relativePath, 'export const normalize = (rawError: unknown) => logger.error(rawError);\n');
    expectReleaseErrorCode(() => verifyPrivacyAllowlist({repositoryRoot: root, changedFiles: [relativePath]}),
      'privacy-forbidden-value');
  });

  it.each([
    ['localStorage', "window.localStorage.setItem('aiSummaryDraft', summaryText);"],
    ['sessionStorage', "sessionStorage.setItem('aiSummaryDraft', summaryText);"],
    ['IndexedDB', "indexedDB.open('ai-summary-drafts');"],
    ['document.cookie', "document.cookie = `aiSummaryDraft=${summaryText}`;"],
    ['history.pushState', "window.history.pushState({}, '', `/summary/${summaryText}`);"],
    ['history.replaceState', "history.replaceState({}, '', `/summary/${summaryText}`);"],
  ])('rejects changed summary sources that touch %s', (_api, source) => {
    const {root} = makeRoot();
    const relativePath = 'packages/contact-center/task/src/ai-summary-post-call.ts';
    writeFile(root, relativePath, `export const persist = (summaryText) => { ${source} };\n`);

    expectReleaseErrorCode(
      () => verifyPrivacyAllowlist({repositoryRoot: root, changedFiles: [relativePath]}),
      'privacy-persistence-api'
    );
  });

  it('allows established sample-host configuration keys but rejects new sample persistence keys', () => {
    const {root} = makeRoot();
    writeFile(
      root,
      'widgets-samples/cc/samples-cc-react-app/src/App.tsx',
      [
        "window.localStorage.getItem('selectedWidgets');",
        "window.localStorage.setItem('currentTheme', currentTheme);",
        "window.localStorage.removeItem('accessToken');",
        'window.history.replaceState({}, document.title, window.location.pathname + window.location.search);',
      ].join('\n')
    );

    expect(() =>
      verifyPrivacyAllowlist({
        repositoryRoot: root,
        changedFiles: ['widgets-samples/cc/samples-cc-react-app/src/App.tsx'],
      })
    ).not.toThrow();

    writeFile(
      root,
      'widgets-samples/cc/samples-cc-react-app/src/App.tsx',
      "window.localStorage.setItem('aiSummaryDraft', summaryText);\n"
    );

    expectReleaseErrorCode(
      () => verifyPrivacyAllowlist({
        repositoryRoot: root,
        changedFiles: ['widgets-samples/cc/samples-cc-react-app/src/App.tsx'],
      }),
      'privacy-persistence-api'
    );
  });

  it('rejects stale module specifications and out-of-allowlist paths', () => {
    const {root} = makeRoot();
    expect(() =>
      verifyDAGTraceability({
        repositoryRoot: root,
        changedFiles: [
          'tooling/src/verify-ai-summary-release.js',
          'tooling/tests/verify-ai-summary-release.test.js',
          'packages/contact-center/task/src/helper.ts',
          'packages/contact-center/task/ai-docs/task-spec.md',
        ],
      })
    ).not.toThrow();
    expectReleaseErrorCode(
      () => verifyDAGTraceability({repositoryRoot: root, staleSpecs: ['packages/contact-center/task/ai-docs/task-spec.md']}),
      'module-spec-stale'
    );
    expectReleaseErrorCode(
      () => verifyDAGTraceability({repositoryRoot: root, changedFiles: ['scripts/random.js']}),
      'changed-path-out-of-dag'
    );
  });

});
