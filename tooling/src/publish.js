const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

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
  module.exports = {versionAndPublish};
} else {
  versionAndPublish();
}
