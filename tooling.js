const {execSync} = require('child_process');

function versionAndPublish(workspaceName) {
  try {
    // Fetch the existing version from npm
    const version = execSync(`npm view ${workspaceName} dist-tags.wxcc`, {stdio: 'pipe'})
      .toString()
      .trim();

    let newVersion;
    if (!version) {
      // If no version exists, start with `1.28.0-wxcc.1`
      newVersion = '1.28.0-wxcc.1';
    } else {
      // Increment the patch number
      const baseVersion = parseInt(
        version
          .split('.')
          .pop()
          .replace('wxcc.', ''),
        10
      );
      newVersion = `1.28.0-wxcc.${baseVersion + 1}`;
    }

    console.log(`Publishing new version for ${workspaceName}: ${newVersion}`);

    // Update version in the workspace
    execSync(`yarn workspace ${workspaceName} version ${newVersion}`, {stdio: 'inherit'});

    // Publish the package
    execSync(`yarn workspace ${workspaceName} npm publish --tag wxcc`, {stdio: 'inherit'});
  } catch (error) {
    console.error(`Failed to process workspace ${workspaceName}:`, error.message);
    process.exit(1);
  }
}

module.exports = versionAndPublish;
