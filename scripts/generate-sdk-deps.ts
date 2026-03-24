/**
 * Consumer SDK Dependency Map Generator
 *
 * Scans the ccWidgets monorepo for all imports from tracked SDK packages
 * and produces sdk-dependencies.yaml mapping each SDK API to the exact
 * consumer files and line numbers that use it.
 *
 * Usage: npx ts-node scripts/generate-sdk-deps.ts
 */

import {Project, Node, SyntaxKind, SourceFile} from 'ts-morph';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(REPO_ROOT, 'sdk-dependencies.yaml');

// SDK packages to track — add more as needed
const TRACKED_SDKS = [
  '@webex/contact-center',
];

// Directories to scan (relative to repo root)
const SCAN_DIRS = [
  'packages/contact-center',
];

// Skip test files, fixtures, ai-docs, and dist/build output
const SKIP_PATTERNS = [
  '/tests/',
  '/test/',
  '/__tests__/',
  '/test-fixtures/',
  '/ai-docs/',
  '/dist/',
  '/build/',
  '/node_modules/',
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '.d.ts',
];

interface UsageEntry {
  file: string;
  line: number;
  context: string;
}

interface MethodUsages {
  usages: UsageEntry[];
}

interface EventUsages {
  listeners: UsageEntry[];
}

interface TypeUsages {
  imports: UsageEntry[];
}

interface SDKDependency {
  version: string;
  manifest_hash: string;
  methods: Record<string, MethodUsages>;
  events: Record<string, EventUsages>;
  types: Record<string, TypeUsages>;
}

interface DependencyMap {
  generated_at: string;
  generator: string;
  dependencies: Record<string, SDKDependency>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some((p) => filePath.includes(p));
}

function relativePath(absPath: string): string {
  return path.relative(REPO_ROOT, absPath);
}

function getLineContext(sourceFile: SourceFile, line: number): string {
  const fullText = sourceFile.getFullText();
  const lines = fullText.split('\n');
  if (line > 0 && line <= lines.length) {
    return lines[line - 1].trim().substring(0, 100);
  }
  return '';
}

/**
 * Find the SDK manifest — checks node_modules first, then known local paths.
 */
function findManifestPath(sdkPackage: string): string | null {
  // 1. Check node_modules (works for both symlinked and npm-installed)
  const nmPath = path.join(REPO_ROOT, 'node_modules', sdkPackage, 'sdk-manifest.yaml');
  if (fs.existsSync(nmPath)) return nmPath;

  // 2. Check known local SDK paths (for development when symlink is broken)
  const localPaths: Record<string, string> = {
    '@webex/contact-center': path.resolve(REPO_ROOT, '../ccSDK/webex-js-sdk/packages/@webex/contact-center/sdk-manifest.yaml'),
  };
  const localPath = localPaths[sdkPackage];
  if (localPath && fs.existsSync(localPath)) return localPath;

  return null;
}

/**
 * Read the SDK manifest to get the version and compute a simple hash for staleness detection.
 */
function getManifestInfo(sdkPackage: string): {version: string; hash: string} {
  const manifestPath = findManifestPath(sdkPackage);
  if (manifestPath) {
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = yaml.load(content) as Record<string, unknown>;
    // Simple hash: first 8 chars of content hash
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    return {
      version: (manifest.version as string) || 'unknown',
      hash,
    };
  }
  return {version: 'unknown', hash: 'no-manifest'};
}

/**
 * Load the SDK manifest to know which exports are methods vs types vs events.
 */
function loadManifest(sdkPackage: string): {methods: Set<string>; types: Set<string>; events: Set<string>} | null {
  const manifestPath = findManifestPath(sdkPackage);
  if (!manifestPath) return null;

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = yaml.load(content) as Record<string, unknown>;

  const methods = new Set<string>();
  const types = new Set<string>();
  const events = new Set<string>();

  // Extract class method names
  const classes = (manifest.classes || {}) as Record<string, {methods: Record<string, unknown>}>;
  for (const [className, cls] of Object.entries(classes)) {
    for (const methodName of Object.keys(cls.methods || {})) {
      methods.add(`${className}.${methodName}`);
      methods.add(methodName); // Also track bare method name
    }
  }

  // Extract type names
  const typeEntries = (manifest.types || {}) as Record<string, unknown>;
  for (const typeName of Object.keys(typeEntries)) {
    types.add(typeName);
  }

  // Extract event string values
  const eventEntries = (manifest.events || {}) as Record<string, Record<string, string>>;
  for (const enumGroup of Object.values(eventEntries)) {
    for (const eventValue of Object.values(enumGroup)) {
      events.add(eventValue);
    }
  }

  return {methods, types, events};
}

// ---------------------------------------------------------------------------
// Main scanner
// ---------------------------------------------------------------------------

function generate(): void {
  console.log('Loading TypeScript project...');

  const project = new Project({
    tsConfigFilePath: path.join(REPO_ROOT, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  // Add source files from scan directories
  for (const dir of SCAN_DIRS) {
    const absDir = path.join(REPO_ROOT, dir);
    project.addSourceFilesAtPaths([
      `${absDir}/**/*.ts`,
      `${absDir}/**/*.tsx`,
    ]);
  }

  const sourceFiles = project.getSourceFiles().filter((sf) => !shouldSkip(sf.getFilePath()));
  console.log(`Scanning ${sourceFiles.length} source files...`);

  const depMap: DependencyMap = {
    generated_at: new Date().toISOString(),
    generator: 'generate-sdk-deps.ts v1.0',
    dependencies: {},
  };

  // Initialize dependency entries for each tracked SDK
  for (const sdk of TRACKED_SDKS) {
    const manifestInfo = getManifestInfo(sdk);
    depMap.dependencies[sdk] = {
      version: manifestInfo.version,
      manifest_hash: manifestInfo.hash,
      methods: {},
      events: {},
      types: {},
    };
  }

  // Load manifest for classification
  const manifests: Record<string, ReturnType<typeof loadManifest>> = {};
  for (const sdk of TRACKED_SDKS) {
    manifests[sdk] = loadManifest(sdk);
  }

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    const relPath = relativePath(filePath);

    // Find all import declarations from tracked SDKs
    const imports = sourceFile.getImportDeclarations();

    for (const imp of imports) {
      const moduleSpecifier = imp.getModuleSpecifierValue();

      // Check if this import is from a tracked SDK
      const matchedSdk = TRACKED_SDKS.find((sdk) =>
        moduleSpecifier === sdk || moduleSpecifier.startsWith(sdk + '/')
      );
      if (!matchedSdk) continue;

      const sdkDep = depMap.dependencies[matchedSdk];
      const manifest = manifests[matchedSdk];

      // Process named imports
      const namedImports = imp.getNamedImports();
      for (const named of namedImports) {
        const importName = named.getName();
        const alias = named.getAliasNode()?.getText() || importName;
        const line = named.getStartLineNumber();

        // Classify: is this a type import or value import?
        const isTypeOnly = imp.isTypeOnly() || named.isTypeOnly();

        if (isTypeOnly || (manifest && manifest.types.has(importName) && !manifest.methods.has(importName))) {
          // Type import
          if (!sdkDep.types[importName]) {
            sdkDep.types[importName] = {imports: []};
          }
          sdkDep.types[importName].imports.push({
            file: relPath,
            line,
            context: getLineContext(sourceFile, line),
          });
        } else {
          // Value import — could be a class, enum, or constant
          // Record the import itself
          if (!sdkDep.types[importName]) {
            sdkDep.types[importName] = {imports: []};
          }
          sdkDep.types[importName].imports.push({
            file: relPath,
            line,
            context: getLineContext(sourceFile, line),
          });

          // Now find all usages of this imported symbol in the file
          const localName = alias;

          // Find method calls: localName.methodName() or localName()
          const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
          for (const call of callExpressions) {
            const callText = call.getExpression().getText();

            // Match: instance.method() patterns
            if (callText.startsWith(localName + '.')) {
              const methodName = callText.replace(localName + '.', '').split('(')[0];
              const qualifiedName = `${importName}.${methodName}`;
              const callLine = call.getStartLineNumber();

              if (!sdkDep.methods[qualifiedName]) {
                sdkDep.methods[qualifiedName] = {usages: []};
              }
              sdkDep.methods[qualifiedName].usages.push({
                file: relPath,
                line: callLine,
                context: getLineContext(sourceFile, callLine),
              });
            }
          }

          // Find event listener registrations: .on('eventName', ...) or .on(ENUM.VALUE, ...)
          for (const call of callExpressions) {
            const expr = call.getExpression();
            if (!Node.isPropertyAccessExpression(expr)) continue;
            const methodName = expr.getName();
            if (methodName !== 'on' && methodName !== 'off' && methodName !== 'once') continue;

            const obj = expr.getExpression().getText();
            if (obj !== localName && !obj.endsWith('.' + localName)) continue;

            const args = call.getArguments();
            if (args.length === 0) continue;

            const firstArg = args[0];
            let eventName: string | null = null;

            if (Node.isStringLiteral(firstArg)) {
              eventName = firstArg.getLiteralValue();
            } else {
              eventName = firstArg.getText();
            }

            if (eventName) {
              const callLine = call.getStartLineNumber();
              if (!sdkDep.events[eventName]) {
                sdkDep.events[eventName] = {listeners: []};
              }
              sdkDep.events[eventName].listeners.push({
                file: relPath,
                line: callLine,
                context: getLineContext(sourceFile, callLine),
              });
            }
          }
        }
      }

      // Process default import (e.g., import Webex from '@webex/contact-center')
      const defaultImport = imp.getDefaultImport();
      if (defaultImport) {
        const importName = defaultImport.getText();
        const line = defaultImport.getStartLineNumber();

        if (!sdkDep.types[importName]) {
          sdkDep.types[importName] = {imports: []};
        }
        sdkDep.types[importName].imports.push({
          file: relPath,
          line,
          context: getLineContext(sourceFile, line),
        });

        // Track method calls on the default import
        const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
        for (const call of callExpressions) {
          const callText = call.getExpression().getText();
          if (callText.startsWith(importName + '.')) {
            const methodName = callText.replace(importName + '.', '').split('(')[0];
            const callLine = call.getStartLineNumber();
            const qualifiedName = `default.${methodName}`;

            if (!sdkDep.methods[qualifiedName]) {
              sdkDep.methods[qualifiedName] = {usages: []};
            }
            sdkDep.methods[qualifiedName].usages.push({
              file: relPath,
              line: callLine,
              context: getLineContext(sourceFile, callLine),
            });
          }
        }
      }
    }
  }

  // Clean up empty entries
  for (const sdk of TRACKED_SDKS) {
    const dep = depMap.dependencies[sdk];
    for (const [key, val] of Object.entries(dep.methods)) {
      if (val.usages.length === 0) delete dep.methods[key];
    }
    for (const [key, val] of Object.entries(dep.events)) {
      if (val.listeners.length === 0) delete dep.events[key];
    }
    for (const [key, val] of Object.entries(dep.types)) {
      if (val.imports.length === 0) delete dep.types[key];
    }
  }

  // Write YAML
  const yamlContent = yaml.dump(depMap, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  });

  fs.writeFileSync(OUTPUT_FILE, yamlContent, 'utf8');

  // Summary
  for (const [sdk, dep] of Object.entries(depMap.dependencies)) {
    const methodCount = Object.keys(dep.methods).length;
    const eventCount = Object.keys(dep.events).length;
    const typeCount = Object.keys(dep.types).length;
    const totalUsages = Object.values(dep.methods).reduce((s, m) => s + m.usages.length, 0)
      + Object.values(dep.events).reduce((s, e) => s + e.listeners.length, 0)
      + Object.values(dep.types).reduce((s, t) => s + t.imports.length, 0);

    console.log(`\n${sdk} (v${dep.version}):`);
    console.log(`  Methods: ${methodCount} (${Object.values(dep.methods).reduce((s, m) => s + m.usages.length, 0)} call sites)`);
    console.log(`  Events: ${eventCount} (${Object.values(dep.events).reduce((s, e) => s + e.listeners.length, 0)} listeners)`);
    console.log(`  Types: ${typeCount} (${Object.values(dep.types).reduce((s, t) => s + t.imports.length, 0)} imports)`);
    console.log(`  Total usages: ${totalUsages}`);
  }

  console.log(`\nDependency map written: ${OUTPUT_FILE}`);
}

generate();
