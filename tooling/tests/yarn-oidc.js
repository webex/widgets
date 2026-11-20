const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const version = require('../../package.json').packageManager.split('@')[1];
const binary = path.join(ROOT, `.yarn/releases/yarn-${version}.cjs`);
const name = '@webex/oidc-fixture';
const packageVersion = '1.0.0-next.1';
const execute = (args, cwd, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binary, ...args], {cwd, env, timeout: 10000});
    let output = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (output += data));
    child.on('error', reject);
    child.on('close', (code) => resolve({code, output}));
  });

it.each([false, true])(
  'publishes a scoped workspace through native Yarn OIDC (exchange denied: %s)',
  async (denied) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'widgets-yarn-oidc-'));
    const calls = [];
    // All credentials and endpoints in this test are local fixtures.
    const server = http.createServer((request, response) => {
      let body = '';
      request.on('data', (data) => (body += data));
      request.on('end', () => {
        calls.push({method: request.method, url: request.url, auth: request.headers.authorization, body});
        response.setHeader('Content-Type', 'application/json');
        if (request.url.startsWith('/github-token?')) {
          response.end(JSON.stringify({value: 'fixture-id-token'}));
        } else if (request.method === 'POST') {
          response.statusCode = denied ? 403 : 201;
          response.end(JSON.stringify(denied ? {error: 'denied'} : {token: 'fixture-publish-token'}));
        } else if (request.method === 'PUT') {
          response.statusCode = 201;
          response.end(JSON.stringify({ok: true}));
        } else {
          response.statusCode = 500;
          response.end(JSON.stringify({error: 'unexpected request'}));
        }
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const registry = `http://127.0.0.1:${server.address().port}`;
      const rc = `.yarnrc-${path.basename(directory)}.yml`;
      const workspace = path.join(directory, 'packages/widget');
      fs.mkdirSync(workspace, {recursive: true});
      fs.writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({name: 'fixture-root', private: true, workspaces: ['packages/*']})
      );
      fs.writeFileSync(
        path.join(workspace, 'package.json'),
        JSON.stringify({
          name,
          version: packageVersion,
          scripts: {'deploy:npm': 'yarn npm publish'},
          files: ['index.js'],
        })
      );
      fs.writeFileSync(path.join(workspace, 'index.js'), 'module.exports = true;\n');
      fs.writeFileSync(
        path.join(directory, rc),
        `nodeLinker: node-modules\nnpmRegistryServer: "${registry}"\nunsafeHttpWhitelist:\n  - 127.0.0.1\n`
      );
      const env = {...process.env};
      for (const key of Object.keys(env)) {
        if (/^(YARN_|NPM_|NODE_AUTH_TOKEN|GITLAB|GITHUB_ACTIONS|ACTIONS_ID_TOKEN)/i.test(key)) delete env[key];
      }
      Object.assign(env, {
        YARN_RC_FILENAME: rc,
        YARN_IGNORE_PATH: '1',
        YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
        CI: 'true',
        GITHUB_ACTIONS: 'true',
        ACTIONS_ID_TOKEN_REQUEST_URL: `${registry}/github-token?request=fixture`,
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'fixture-request-token',
      });
      const install = await execute(['install', '--mode=skip-build'], directory, env);
      expect(install).toMatchObject({code: 0});
      const result = await execute(
        ['workspace', name, 'deploy:npm', '--access', 'public', '--tag', 'next', '--json'],
        directory,
        env
      );
      expect(new URL(calls[0].url, registry).searchParams.get('audience')).toBe(`npm:${new URL(registry).host}`);
      expect(calls[0].auth).toBe('Bearer fixture-request-token');
      expect(calls[1]).toMatchObject({
        method: 'POST',
        url: '/-/npm/v1/oidc/token/exchange/package/@webex%2foidc-fixture',
        auth: 'Bearer fixture-id-token',
      });
      if (denied) {
        expect(result.code).not.toBe(0);
        expect(calls.some((call) => call.method === 'PUT')).toBe(false);
      } else {
        expect(result).toMatchObject({code: 0});
        const published = calls.find((call) => call.method === 'PUT');
        expect(published).toMatchObject({url: '/@webex%2foidc-fixture', auth: 'Bearer fixture-publish-token'});
        expect(JSON.parse(published.body)).toMatchObject({
          name,
          access: 'public',
          'dist-tags': {next: packageVersion},
          versions: {[packageVersion]: {name, version: packageVersion}},
        });
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(directory, {recursive: true, force: true});
    }
  },
  20000
);
