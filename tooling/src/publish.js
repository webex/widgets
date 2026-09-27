const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  AI_SUMMARY_PACKED_WORKSPACES,
  assertNoLocalSDKProtocolsForPublish,
  assertPlainRegistrySemver,
  assertPublishableContactCenterSDKBoundary,
  collectSDKDescriptors,
  collectSDKResolutions,
  inspectAISummaryPackedWorkspaceBoundary,
  isPlainRegistrySemverDescriptor,
  resolutionKeyTargetsSDKPackage,
} = require('./publish-boundary');

const AI_SUMMARY_RELEASE_PACKAGES_RELATIVE_PATH = '.matrix/results/prog-mini-js/release/packages';

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function removePathQuietly(targetPath) {
  try {
    fs.rmSync(targetPath, {recursive: true, force: true});
  } catch (error) {
    // Best-effort cleanup only; the promotion error is more useful.
  }
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function restorePackageDirectory(packedRoot, backupRoot, hadExistingPackages) {
  removePathQuietly(packedRoot);
  if (hadExistingPackages) {
    fs.mkdirSync(path.dirname(packedRoot), {recursive: true});
    fs.renameSync(backupRoot, packedRoot);
  }
}

function promotePackedArtifacts({packedRoot, receiptPath, stagedPackagesRoot, stagedReceiptPath, backupRoot}) {
  let hadExistingPackages = false;
  let packagesPromoted = false;

  try {
    fs.mkdirSync(path.dirname(packedRoot), {recursive: true});
    fs.mkdirSync(path.dirname(receiptPath), {recursive: true});
    if (fs.existsSync(packedRoot)) {
      fs.renameSync(packedRoot, backupRoot);
      hadExistingPackages = true;
    }
    fs.renameSync(stagedPackagesRoot, packedRoot);
    packagesPromoted = true;
    fs.renameSync(stagedReceiptPath, receiptPath);
    removePathQuietly(backupRoot);
  } catch (error) {
    if (packagesPromoted || hadExistingPackages) {
      restorePackageDirectory(packedRoot, backupRoot, hadExistingPackages);
    }
    throw error;
  }
}

function verifyAISummaryPackages(options = {}) {
  const repositoryRoot = options.repositoryRoot || process.cwd();
  const receiptPath = options.receiptPath;
  if (!receiptPath) {
    throw new Error('verify-ai-summary-packages requires --receipt');
  }
  const absoluteReceiptPath = path.isAbsolute(receiptPath) ? receiptPath : path.resolve(repositoryRoot, receiptPath);
  const transactionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-summary-pack-'));
  const packedRoot = path.join(repositoryRoot, AI_SUMMARY_RELEASE_PACKAGES_RELATIVE_PATH);

  try {
    const boundary = inspectAISummaryPackedWorkspaceBoundary({
      repositoryRoot,
      transactionRoot,
      execFileSync: options.execFileSync || execFileSync,
    });
    const workspaces = boundary.workspaces.map((workspace) => {
      const finalTarballPath = path.join(packedRoot, workspace.tarballName);
      return {
        name: workspace.name,
        packagePath: workspace.packagePath,
        sourceManifestSha256: workspace.sourceManifestSha256,
        tarballPath: toPosix(path.relative(repositoryRoot, finalTarballPath)),
        tarballSha256: workspace.tarballSha256,
        packedManifestSha256: workspace.packedManifestSha256,
        contactCenterDescriptors: workspace.contactCenterDescriptors,
        sourceContactCenterDescriptors: workspace.sourceContactCenterDescriptors,
        packlist: workspace.packlist,
      };
    });

    const receipt = {
      schemaVersion: 1,
      kind: 'ai-summary-packed-workspaces',
      generatedAt: new Date().toISOString(),
      workspaces,
    };

    fs.mkdirSync(path.dirname(packedRoot), {recursive: true});
    const promotionRoot = fs.mkdtempSync(path.join(path.dirname(packedRoot), '.ai-summary-pack-stage-'));
    try {
      const stagedPackagesRoot = path.join(promotionRoot, 'packages');
      fs.mkdirSync(stagedPackagesRoot, {recursive: true});
      for (const workspace of boundary.workspaces) {
        fs.copyFileSync(workspace.tempTarballPath, path.join(stagedPackagesRoot, workspace.tarballName));
      }
      const stagedReceiptPath = path.join(promotionRoot, path.basename(absoluteReceiptPath));
      writeJsonFile(stagedReceiptPath, receipt);
      promotePackedArtifacts({
        packedRoot,
        receiptPath: absoluteReceiptPath,
        stagedPackagesRoot,
        stagedReceiptPath,
        backupRoot: path.join(promotionRoot, 'packages.previous'),
      });
    } finally {
      removePathQuietly(promotionRoot);
    }
    return receipt;
  } finally {
    fs.rmSync(transactionRoot, {recursive: true, force: true});
  }
}

// Function to remove the 'stableVersion' key
function removeStableVersion(packageJsonPath, packageData) {
  try {
    if (packageData.hasOwnProperty('stableVersion')) {
      delete packageData.stableVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2), 'utf-8');
      console.log("'stableVersion' key removed successfully.");
    } else {
      console.log("'stableVersion' key does not exist in package.json.");
    }
  } catch (error) {
    throw new Error(`An error occurred while removing 'stableVersion': ${error.message}`);
  }
}

// Function to update the version
function updateVersion(packageJsonPath, packageData, newVersion) {
  try {
    if (packageData.hasOwnProperty('version')) {
      packageData.version = newVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2), 'utf-8');
      console.log(`Version updated to ${newVersion} successfully for ${packageData.name}.`);
    } else {
      console.log("'version' key does not exist in package.json.");
    }
  } catch (error) {
    throw new Error(`An error occurred while updating 'version': ${error.message}`);
  }
}

function versionAndPublish() {
  const branchName = process.argv[2];
  const newVersion = process.argv[3];

  if (!branchName || !newVersion) {
    console.error(
      'Error: Not enough positional arguments provided! node <relative_path_to_publish> <branchName> <nextVersion>'
    );
    process.exit(1);
    return;
  }

  // Validate branchName (used as npm dist-tag): must match npm tag naming rules.
  // Reject any value containing shell metacharacters or characters outside the allowed set.
  const validTagPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  if (!validTagPattern.test(branchName)) {
    console.error(
      `Error: Invalid branchName/tag value "${branchName}". Must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/`
    );
    process.exit(1);
    return;
  }
  const contactCenterPath = './packages/contact-center';

  try {
    assertPublishableContactCenterSDKBoundary(process.cwd());
    const workspaceData = fs
      .readdirSync(contactCenterPath, {withFileTypes: true})
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => {
        const packageJsonPath = path.join(contactCenterPath, dirent.name, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          throw new Error(`package.json not found in ${dirent.name}`);
        }
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        console.log(`Removing stable version from package.json for ${dirent.name}`);
        removeStableVersion(packageJsonPath, packageData);
        updateVersion(packageJsonPath, packageData, newVersion);
        return packageData.name;
      });

    // Validate workspace names (npm package name pattern) and publish via no-shell execFileSync.
    // Using execFileSync instead of execSync prevents shell interpretation of workspace or tag values.
    const validPackageNamePattern = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

    const publishWorkspace = (workspace) => {
      if (!validPackageNamePattern.test(workspace)) {
        throw new Error(`Invalid package name "${workspace}": does not match npm package name pattern`);
      }
      console.log(`Publishing new version for ${workspace}: ${newVersion}`);
      execFileSync('yarn', ['workspace', workspace, 'npm', 'publish', '--tag', branchName], {stdio: 'inherit'});
    };

    const denyList = ['@webex/test-fixtures']; // Add workspace names to exclude from publishing

    for (const workspace of workspaceData) {
      if (denyList.includes(workspace)) {
        console.log(`Skipping ${workspace} - workspace is in deny list`);
        continue;
      }
      publishWorkspace(workspace);
    }
  } catch (error) {
    console.error(`Failed to process workspaces:`, error.message);
    process.exit(1);
  }
}

// Only execute when called through a module/script
if (require.main !== module) {
  // Export the function for testing
  module.exports = {
    AI_SUMMARY_PACKED_WORKSPACES,
    assertNoLocalSDKProtocolsForPublish,
    assertPlainRegistrySemver,
    assertPublishableContactCenterSDKBoundary,
    collectSDKDescriptors,
    collectSDKResolutions,
    isPlainRegistrySemverDescriptor,
    resolutionKeyTargetsSDKPackage,
    verifyAISummaryPackages,
    versionAndPublish,
  };
} else {
  if (process.argv[2] === 'verify-ai-summary-packages') {
    const receiptIndex = process.argv.indexOf('--receipt');
    try {
      verifyAISummaryPackages({receiptPath: receiptIndex === -1 ? undefined : process.argv[receiptIndex + 1]});
    } catch (error) {
      console.error(`Failed to verify AI Summary packages:`, error.message);
      process.exit(1);
    }
  } else if (process.argv[2] === 'assert-publishable') {
    try {
      assertPublishableContactCenterSDKBoundary(process.cwd());
    } catch (error) {
      console.error(`Failed publish preflight:`, error.message);
      process.exit(1);
    }
  } else {
    versionAndPublish();
  }
}
