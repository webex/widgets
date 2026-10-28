const fs = require('node:fs');
const http = require('node:http');
const {chromium} = require('/fixture/node_modules/@playwright/test');
const {checkBrowser} = require('../consumer-builds/smoke.cjs');

jest.mock('node:fs');
jest.mock('node:http');
jest.mock('/fixture/node_modules/@playwright/test', () => ({chromium: {launch: jest.fn()}}), {virtual: true});

describe('consumer browser check', () => {
  let server;
  let browser;
  let page;
  let response;

  beforeEach(() => {
    jest.resetAllMocks();
    server = {
      listen: jest.fn((_port, _host, ready) => ready()),
      address: jest.fn(() => ({port: 1234})),
      close: jest.fn((done) => done()),
    };
    page = {
      on: jest.fn(),
      addInitScript: jest.fn(),
      goto: jest.fn(),
      waitForFunction: jest.fn(),
      evaluate: jest.fn().mockResolvedValue({
        stationLogin: 'function',
        assistant: 'function',
        directAssistant: 'function',
        registered: true,
      }),
    };
    browser = {newPage: jest.fn().mockResolvedValue(page), close: jest.fn()};
    response = {writeHead: jest.fn().mockReturnThis(), end: jest.fn(), setHeader: jest.fn()};
    http.createServer.mockReturnValue(server);
    chromium.launch.mockResolvedValue(browser);
    fs.existsSync.mockReturnValue(true);
    fs.createReadStream.mockReturnValue({pipe: jest.fn()});
  });

  it('loads the nested consumer URL and closes resources', async () => {
    await checkBrowser('/fixture', 'vite');
    expect(page.goto).toHaveBeenCalledWith('http://127.0.0.1:1234/app/nested/vite/');
    expect(page.addInitScript).toHaveBeenCalledWith(expect.any(Function));
    expect(browser.close).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalled();
  });

  it.each(['/', '/app/nested/vite/main.js', '/app/nested/vite/main.css', '/app/nested/vite/font.woff2'])(
    'serves %s with a content type',
    async (suffix) => {
      await checkBrowser('/fixture', 'vite');
      const handler = http.createServer.mock.calls[0][0];
      handler({url: suffix === '/' ? '/app/nested/vite/' : suffix}, response);
      expect(response.setHeader).toHaveBeenCalledWith('Content-Type', expect.any(String));
      expect(fs.createReadStream().pipe).toHaveBeenCalledWith(response);
    }
  );

  it('rejects paths outside the build and missing files', async () => {
    await checkBrowser('/fixture', 'vite');
    const handler = http.createServer.mock.calls[0][0];
    handler({url: '/outside'}, response);
    handler({url: '/app/nested/vite/../../outside'}, response);
    fs.existsSync.mockReturnValue(false);
    handler({url: '/app/nested/vite/missing.js'}, response);
    expect(response.writeHead).toHaveBeenCalledTimes(3);
    expect(fs.createReadStream).not.toHaveBeenCalled();
  });

  it('fails on page errors', async () => {
    page.goto.mockImplementation(() => page.on.mock.calls[0][1](new Error('module failed')));
    await expect(checkBrowser('/fixture', 'vite')).rejects.toThrow('module failed');
    expect(browser.close).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalled();
  });

  it.each([{assistant: 'undefined'}, {registered: false}])('fails on missing consumer exports %j', (change) => {
    page.evaluate.mockResolvedValue({
      stationLogin: 'function',
      assistant: 'function',
      directAssistant: 'function',
      registered: true,
      ...change,
    });
    return expect(checkBrowser('/fixture', 'vite')).rejects.toThrow('startup failed');
  });

  it('closes the server if Chromium cannot start', async () => {
    chromium.launch.mockRejectedValue(new Error('launch failed'));
    await expect(checkBrowser('/fixture', 'vite')).rejects.toThrow('launch failed');
    expect(server.close).toHaveBeenCalled();
  });

  it('closes the server if Chromium cannot close', async () => {
    browser.close.mockRejectedValue(new Error('close failed'));
    await expect(checkBrowser('/fixture', 'vite')).rejects.toThrow('close failed');
    expect(server.close).toHaveBeenCalled();
  });
});
