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

// Define the versionAndPublish function
function versionAndPublish(workspaceName) {
  try {
    const branchName = process.argv[3];
    const newVersion = process.argv[4];

    // try {
    //   // Fetch the existing version from npm
    //   version = execSync(`npm view ${workspaceName} dist-tags.${branchName}`, {stdio: 'pipe'})
    //     .toString()
    //     .trim();
    // } catch (npmError) {
    //   // If no package is found (npm view fails), log a message and continue
    //   console.log(`No existing version found for ${workspaceName}. Creating a new version.`);
    //   version = '';
    // }

    // Support minor/major release change

    // let newVersion;
    // if (!version) {
    //   newVersion = `1.28.0-${branchName}.1`;
    // } else {
    //   // Increment the patch number
    //   const baseVersion = parseInt(version.split('.').pop(), 10);
    //   newVersion = `1.28.0-${branchName}.${baseVersion + 1}`;
    // }

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
