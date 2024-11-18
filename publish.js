const {execSync} = require('child_process');
const path = require('path');

// Define the versionAndPublish function
function versionAndPublish(workspaceName) {
  try {
    let version;
    const branchName = process.argv[3];

    try {
      // Fetch the existing version from npm
      version = execSync(`npm view ${workspaceName} dist-tags.${branchName}`, {stdio: 'pipe'})
        .toString()
        .trim();
    } catch (npmError) {
      // If no package is found (npm view fails), log a message and continue
      console.log(`No existing version found for ${workspaceName}. Creating a new version.`);
      version = '';
    }

    let newVersion;
    if (!version) {
      newVersion = `1.28.0-${branchName}.1`;
    } else {
      // Increment the patch number
      const baseVersion = parseInt(version.split('.').pop(), 10);
      newVersion = `1.28.0-${branchName}.${baseVersion + 1}`;
    }

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

module.exports = versionAndPublish;
