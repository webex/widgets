const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to remove the 'stableVersion' key
function removeStableVersion(packageJsonPath) {
  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageData = JSON.parse(packageJsonContent);

    if (packageData.hasOwnProperty('stableVersion')) {
      delete packageData.stableVersion;

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2), 'utf-8');
      console.log("'stableVersion' key removed successfully.");
    } else {
      console.log("'stableVersion' key does not exist in package.json.");
    }
  } catch (error) {
    console.error("An error occurred while removing 'stableVersion':", error.message);
  }
}

function versionAndPublish(workspaceName) {
  try {
    const branchName = process.argv[3];
    const newVersion = process.argv[4];

    console.log(`Running publish script for ${workspaceName}: ${newVersion}`);

    // https://github.com/yarnpkg/berry/issues/4328 - create JIRA ticket to fix this
    console.log(`Removing stable version from package.json for ${workspaceName}`);

    const packageName = workspaceName.split('/')[1].replace(/^cc-/, '');
    const packageJsonPath = path.join(__dirname, `packages/contact-center/${packageName}`, 'package.json');
    removeStableVersion(packageJsonPath);

    console.log(`Publishing new version for ${workspaceName}: ${newVersion}`);

    // Update version in the workspace
    execSync(`yarn workspace ${workspaceName} version ${newVersion}`, {stdio: 'inherit'});

    // Publish the package
    execSync(`yarn workspace ${workspaceName} npm publish --tag ${branchName}`, {stdio: 'inherit'});
  } catch (error) {
    console.error(`Failed to process workspace ${workspaceName}:`, error.message);
    process.exit(1);
  }
}

// Get the workspace name from command-line arguments
const workspaceName = process.argv[2];

if (!workspaceName) {
  console.error('Error: Workspace name must be provided!');
  process.exit(1);
}

// Call the versionAndPublish function with the workspace name
versionAndPublish(workspaceName);
