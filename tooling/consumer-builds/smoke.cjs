const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

async function checkBrowser(directory, bundler) {
  const {chromium} = require(path.join(directory, 'node_modules/@playwright/test'));
  const root = path.join(directory, 'dist', bundler);
  const prefix = `/app/nested/${bundler}/`;
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
  };
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const filename = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (!pathname.startsWith(prefix) || !filename.startsWith(root + path.sep) || !fs.existsSync(filename)) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    fs.createReadStream(filename).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.global = window;
      window.AGENTX_SERVICE = location.origin;
    });
    await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
    await page.waitForFunction(() => Boolean(window.widgetImportCheck), undefined, {timeout: 30000});
    const exported = await page.evaluate(async () => {
      const {stationLogin, assistant, directAssistant, loadWebComponents} = window.widgetImportCheck;
      await loadWebComponents();
      return {
        stationLogin,
        assistant,
        directAssistant,
        registered: Boolean(customElements.get('widget-cc-station-login')),
      };
    });
    if (errors.length || Object.values(exported).some((value) => value !== 'function' && value !== true)) {
      throw new Error(`Consumer browser startup failed: ${JSON.stringify({exported, errors})}`);
    }
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

module.exports = {checkBrowser};
