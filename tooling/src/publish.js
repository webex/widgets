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
    throw new Error("An error occurred while removing 'stableVersion':", error.message);
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
  const dependencies = ['@webex/cc-store'];

  try {
    const ccFolder = fs
      .readdirSync(contactCenterPath, {withFileTypes: true})
      .filter((dirent) => {
        return dirent.isDirectory();
      })
      .map((dirent) => {
        try {
          const packageJsonPath = path.join(contactCenterPath, dirent.name, 'package.json');
          const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

          console.log(`Removing stable version from package.json for ${dirent.name}`);
          removeStableVersion(packageJsonPath, packageData);
          return packageData.name;
        } catch (error) {
          throw new Error(`Error reading package.json in ${dirent.name}`, error);
        }
      });
    // Separate dependency workspaces and other workspaces
    const dependencyWorkspaces = ccFolder.filter((fileName) => dependencies.includes(fileName));

    const otherWorkspaces = ccFolder.filter((fileName) => !dependencies.includes(fileName));

    const publishWorkspace = (workspaceName) => {
      console.log(`Running publish script for ${workspaceName}: ${newVersion}`);

      // ccFolder has names of all the packages like @webex/cc-store and the actual folder name is just store,
      // thats why we need to remove '@webex/cc-' from the workspaceName to ge the path
      const packageJsonPath = path.join(contactCenterPath, workspaceName.replace('@webex/cc-', ''), 'package.json');

      console.log(`Publishing new version for ${workspaceName}: ${newVersion}`);

      // Update version in the workspace
      execSync(`yarn workspace ${workspaceName} version ${newVersion}`, {stdio: 'inherit'});

      // Publish the package
      // execSync(`yarn workspace ${workspaceName} npm publish --tag ${branchName}`, {stdio: 'inherit'});

      execSync(`yarn workspace ${workspaceName} pack`, {stdio: 'inherit'});
    };

    // Publish dependencies first
    dependencyWorkspaces.forEach(publishWorkspace);

    // Publish other packages
    otherWorkspaces.forEach(publishWorkspace);
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
