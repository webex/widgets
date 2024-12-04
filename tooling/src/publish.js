const {execSync} = require('child_process');
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

function versionAndPublish() {
  const branchName = process.argv[2];
  const newVersion = process.argv[3];

  if (!branchName || !newVersion) {
    console.error(
      'Error: Not enough positional arguments provided! node <relative_path_to_publish> <branchName> <nextVersion>'
    );
    process.exit(1);
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
        removeStableVersion(packageJsonPath, packageData); // Assuming this function is defined elsewhere
        return packageData.name;
      });

    // Update version in the workspace
    const updateVersions = (workspace) => {
      console.log(`Publishing new version for ${workspace}: ${newVersion}`);
      execSync(`yarn workspace ${workspace} version ${newVersion}`, {stdio: 'inherit'});
    };

    // Publish the package
    const publishWorkspace = (workspace) => {
      console.log(`Updating version for ${workspace}: ${newVersion}`);
      execSync(`yarn workspace ${workspace} npm publish --tag ${branchName}`, {stdio: 'inherit'});
    };

    for (const workspace of workspaceData) {
      updateVersions(workspace);
    }

    for (const workspace of workspaceData) {
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
