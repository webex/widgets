const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('child_process');
const {versionAndPublish} = require('../src/publish');

const mockFs = require('fs');

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(process, 'exit').mockImplementation(() => {});

describe('versionAndPublish', () => {
  const packageJsonPath = 'packages/contact-center/test-workspace/package.json';
  beforeEach(() => {
    jest.resetAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  it('Exits if we dont have enough arguments', () => {
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    process.argv = ['node', 'script.js', 'main'];
    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith(
      'Error: Not enough positional arguments provided! node <relative_path_to_publish> <branchName> <nextVersion>'
    );
    expect(process.exit).toHaveBeenCalledWith(1);

    process.argv = ['node', 'script.js', '1.2.3-test.12'];
    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith(
      'Error: Not enough positional arguments provided! node <relative_path_to_publish> <branchName> <nextVersion>'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('removes "stableVersion" key from package.json when it exists', () => {
    const packageJsonContent = JSON.stringify({
      name: 'test-workspace',
      version: '1.0.0',
      stableVersion: '1.0.0',
    });
    jest.spyOn(fs, 'readdirSync').mockReturnValue([{name: 'test-workspace', isDirectory: () => true}]);
    jest.spyOn(fs.Dirent.prototype, 'isDirectory').mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(packageJsonContent);
    mockFs.writeFileSync.mockImplementation(() => {});

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    const expectedPackageJsonContent = JSON.stringify({name: 'test-workspace', version: '1.0.0'}, null, 2);

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(packageJsonPath, expectedPackageJsonContent, 'utf-8');
    expect(console.log).toHaveBeenCalledWith("'stableVersion' key removed successfully.");
  });

  it('fails to write package.json after removing stableVersion', () => {
    const packageJsonContent = JSON.stringify({
      name: 'test-workspace',
      version: '1.0.0',
      stableVersion: '1.0.0',
    });
    jest.spyOn(fs, 'readdirSync').mockReturnValue([{name: 'test-workspace', isDirectory: () => true}]);
    jest.spyOn(fs.Dirent.prototype, 'isDirectory').mockReturnValue(true);

    mockFs.readFileSync.mockReturnValue(packageJsonContent);
    mockFs.writeFileSync.mockImplementation(() => {
      throw new Error('Error while writing to file');
    });

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith(
      'Failed to process workspaces:',
      "An error occurred while removing 'stableVersion': Error while writing to file"
    );
  });

  it('skips removing "stableVersion" if it does not exist', () => {
    const packageJsonContent = JSON.stringify({
      name: 'test-workspace',
      version: '1.0.0',
    });
    jest.spyOn(fs, 'readdirSync').mockReturnValue([{name: 'test-workspace', isDirectory: () => true}]);
    jest.spyOn(fs.Dirent.prototype, 'isDirectory').mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(packageJsonContent);
    mockFs.writeFileSync.mockImplementation(() => {});

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    // This is to update the version
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      'packages/contact-center/test-workspace/package.json',
      expect.any(String),
      'utf-8'
    );
    expect(console.log).toHaveBeenCalledWith("'stableVersion' key does not exist in package.json.");
  });

  it('skips removing "updateVersion" if "version" does not exist', () => {
    const packageJsonContent = JSON.stringify({
      name: 'test-workspace',
      stableVersion: '1.0.0',
    });
    jest.spyOn(fs, 'readdirSync').mockReturnValue([{name: 'test-workspace', isDirectory: () => true}]);
    jest.spyOn(fs.Dirent.prototype, 'isDirectory').mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(packageJsonContent);
    mockFs.writeFileSync.mockImplementation(() => {});

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    // This is to remove the stableVersion key
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      'packages/contact-center/test-workspace/package.json',
      expect.any(String),
      'utf-8'
    );
    expect(console.log).toHaveBeenCalledWith("'version' key does not exist in package.json.");
  });

  it('fails the process if version update fails', () => {
    const packageJsonContent = JSON.stringify({
      name: 'test-workspace',
      stableVersion: '1.0.0',
      version: '1.0.0',
    });

    jest.spyOn(fs, 'readdirSync').mockReturnValue([{name: 'test-workspace', isDirectory: () => true}]);
    jest.spyOn(fs.Dirent.prototype, 'isDirectory').mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(packageJsonContent);
    mockFs.writeFileSync
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('Error while writing to file');
      });

    process.argv = ['node', 'script.js', 'main', '1.3.3-test.1'];
    versionAndPublish();

    // This is to remove the stableVersion key
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      'packages/contact-center/test-workspace/package.json',
      expect.any(String),
      'utf-8'
    );
    expect(console.error).toHaveBeenCalledWith(
      'Failed to process workspaces:',
      "An error occurred while updating 'version': Error while writing to file"
    );
  });

  it('updates the version for all packages and then publishes the package.', () => {
    const packageJsonContent = JSON.stringify({
      name: '@webex/cc-store',
      version: '1.0.0',
    });
    const packageJsonContent2 = JSON.stringify({
      name: '@webex/cc-station-login',
      version: '1.0.0',
    });

    mockFs.readdirSync.mockReturnValue([
      {name: 'store', isDirectory: () => true},
      {name: 'station-login', isDirectory: () => true},
    ]);

    mockFs.readFileSync.mockReturnValueOnce(packageJsonContent).mockReturnValueOnce(packageJsonContent2);
    mockFs.writeFileSync.mockImplementation(() => {});

    const mockExecSync = require('child_process').execSync;
    mockExecSync.mockImplementation(() => {});

    const processArgvMock = ['node', 'script.js', 'main', '1.0.1'];
    process.argv = processArgvMock;

    versionAndPublish();

    // Ensures that first 2 calls were to update version and next 2 calls were to publish the package.
    expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(
      1,
      'packages/contact-center/store/package.json',
      expect.any(String),
      'utf-8'
    );
    expect(mockFs.writeFileSync).toHaveBeenNthCalledWith(
      2,
      'packages/contact-center/station-login/package.json',
      expect.any(String),
      'utf-8'
    );

    expect(mockExecSync).toHaveBeenNthCalledWith(1, 'yarn workspace @webex/cc-store npm publish --tag main', {
      stdio: 'inherit',
    });
    expect(mockExecSync).toHaveBeenNthCalledWith(2, 'yarn workspace @webex/cc-station-login npm publish --tag main', {
      stdio: 'inherit',
    });
  });

  it('error occurred while reading package.json data', () => {
    mockFs.readdirSync.mockReturnValue([
      {name: 'store', isDirectory: () => true},
      {name: 'station-login', isDirectory: () => true},
    ]);

    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('Error while reading from file');
    });

    const mockExecSync = require('child_process').execSync;

    const processArgvMock = ['node', 'script.js', 'main', '1.0.1'];
    process.argv = processArgvMock;

    versionAndPublish();
    expect(console.error).toHaveBeenCalledWith('Failed to process workspaces:', 'Error while reading from file');
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('should export versionAndPublish when required as a module', () => {
    jest.resetModules();
    // Simulate require.main !== module (require the module as a normal import)
    const script = require('../src/publish');

    // Check if versionAndPublish function is exported
    expect(script).toHaveProperty('versionAndPublish');
  });
  it('Throw error if there is no package.json', () => {
    mockFs.readdirSync.mockReturnValue([
      {name: 'store', isDirectory: () => true},
      {name: 'station-login', isDirectory: () => true},
    ]);

    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('Error while reading from file');
    });

    const mockExecSync = require('child_process').execSync;

    const processArgvMock = ['node', 'script.js', 'main', '1.0.1'];
    process.argv = processArgvMock;

    mockFs.existsSync.mockReturnValue(false);

    versionAndPublish();

    expect(console.error).toHaveBeenCalledWith('Failed to process workspaces:', 'package.json not found in store');
    expect(mockExecSync).not.toHaveBeenCalled();
  });
});
