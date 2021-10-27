require('dotenv').config();
require('dotenv').config({path: '.env.default'});

const config = {
  //
  // ====================
  // Runner Configuration
  // ====================
  //
  // WebdriverIO allows it to run your tests in arbitrary locations (e.g. locally or
  // on a remote machine).
  runner: 'local',
  //
  // ==================
  // Specify Test Files
  // ==================
  // Define which test specs should run. The pattern is relative to the directory
  // from which `wdio` was called.
  //
  // The specs are defined as an array of spec files (optionally using wildcards
  // that will be expanded). The test for each spec file will be run in a separate
  // worker process. In order to have a group of spec files run in the same worker
  // process simply enclose them in an array within the specs array.
  //
  // If you are calling `wdio` from an NPM script (see https://docs.npmjs.com/cli/run-script),
  // then the current working directory is where your `package.json` resides, so `wdio`
  // will be called from there.
  //
  specs: ['./tests/**/*.e2e.js'],

  suites: {
    'Meeting Widget': [
      './tests/WebexMeetingMuteMedia.e2e.js',
      './tests/WebexMeetingUnmuteMedia.e2e.js',
    ],
  },
  // Patterns to exclude.
  exclude: [
    // 'path/to/excluded/files'
  ],
  //
  // ============
  // Capabilities
  // ============
  // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
  // time. Depending on the number of capabilities, WebdriverIO launches several test
  // sessions. Within your capabilities you can overwrite the spec and exclude options in
  // order to group specific specs to a specific capability.
  //
  // First, you can define how many instances should be started at the same time. Let's
  // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
  // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
  // files and you set maxInstances to 10, all spec files will get tested at the same time
  // and 30 processes will get spawned. The property handles how many capabilities
  // from the same test should run tests.
  //
  maxInstances: 1,
  //
  // If you have trouble getting all important capabilities together, check out the
  // Sauce Labs platform configurator - a great tool to configure your capabilities:
  // https://docs.saucelabs.com/reference/platforms-configurator
  //
  capabilities: [
    ...(process.env.WEBEX_TEST_CHROME ? [{
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: [
          // Feeds a test pattern to getUserMedia() instead of live camera input
          '--use-fake-device-for-media-stream',
          // Avoids the need to grant camera/microphone permissions.
          '--use-fake-ui-for-media-stream',
          // To hide pop-up warnings from Chrome Browser
          '--disable-infobars'
        ],
      },
    }] : []),
    ...(process.env.WEBEX_TEST_FIREFOX ? [{
      browserName: 'firefox',
      'moz:firefoxOptions': {
        prefs: {
          // Enables the Browser Console command line (to execute JavaScript expressions)
          'devtools.chrome.enabled': true,
          // Disables security prompts the user would normally see by default
          'devtools.debugger.prompt-connection': false,
          // Enables remote debugging
          'devtools.debugger.remote-enabled': true,
          // Disables all notifications
          'dom.webnotifications.enabled': false,
          // For decoding
          'media.webrtc.hw.h264.enabled': true,
          // For active screen/application sharing
          'media.getusermedia.screensharing.enabled': true,
          // Disables the permission dialog *completely*, allowing media
          // access from all sites with no checks
          'media.navigator.permission.disabled': true,
          // Fake media stream and media device
          'media.navigator.streams.fake': true,
          // To enable the decoding for WebRTC
          'media.peerconnection.video.h264_enabled': true
        },
      },
    }] : []),
    ...(process.env.WEBEX_TEST_EDGE ? [{
      browserName: 'MicrosoftEdge',
      'ms:edgeOptions': {
        args: [
          // Anonymize local IPs exposed by WebRTC
          '--disable-features=WebRtcHideLocalIpsWithMdns',
          // Feeds a test pattern to getUserMedia() instead of live camera input
          '--use-fake-device-for-media-stream',
          // Avoids the need to grant camera/microphone permissions.
          '--use-fake-ui-for-media-stream',
        ],
      },
    }]: []),
    ...(process.env.WEBEX_TEST_SAFARI ? [{
      browserName: 'safari',
      'webkit:WebRTC': {
        // Normally, Safari refuses to allow media capture over insecure connections
        // This capability suppresses that restriction for testing purposes
        DisableInsecureMediaCapture: true,
      },
    }]: []),
  ],
  //
  // ===================
  // Test Configurations
  // ===================
  // Define all options that are relevant for the WebdriverIO instance here
  //
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: 'warn',
  //
  // Set specific log levels per logger
  // loggers:
  // - webdriver, webdriverio
  // - @wdio/applitools-service, @wdio/browserstack-service, @wdio/devtools-service, @wdio/sauce-service
  // - @wdio/mocha-framework, @wdio/jasmine-framework
  // - @wdio/local-runner
  // - @wdio/sumologic-reporter
  // - @wdio/cli, @wdio/config, @wdio/sync, @wdio/utils
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  // logLevels: {
  //     webdriver: 'info',
  //     '@wdio/applitools-service': 'info'
  // },
  //
  // If you only want to run your tests until a specific amount of tests have failed use
  // bail (default is 0 - don't bail, run all tests).
  bail: 0,
  //
  // Set a base URL in order to shorten url command calls. If your `url` parameter starts
  // with `/`, the base url gets prepended, not including the path portion of your baseUrl.
  // If your `url` parameter starts without a scheme or `/` (like `some/path`), the base url
  // gets prepended directly.
  baseUrl: 'https://webex.github.io/widgets',
  //
  // Default timeout for all waitFor* commands.
  waitforTimeout: 10000,
  //
  // Default timeout in milliseconds for request
  // if browser driver or grid doesn't send response
  connectionRetryTimeout: 120000,
  //
  // Default request retries count
  connectionRetryCount: 3,
  //
  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.

  // To run the tests locally you need to ensure that:
  // 1) You have the minimum required Java version for your OS - https://github.com/vvo/selenium-standalone/blob/master/docs/java-versions.md
  // 2) You have installed the browsers that are defined in capabilities (e.g. Chrome, Firefox, MicrosoftEdge)
  services: [
    ['static-server', {
      folders: [
        { mount: '/', path: './docs' },
      ]},
    ],
    'selenium-standalone'
  ],

  // Framework you want to run your specs with.
  // The following are supported: Mocha, Jasmine, and Cucumber
  // see also: https://webdriver.io/docs/frameworks
  //
  // Make sure you have the wdio adapter package for the specific framework installed
  // before running any tests.
  framework: 'jasmine',
  //
  // The number of times to retry the entire specfile when it fails as a whole
  // specFileRetries: 1,
  //
  // Delay in seconds between the spec file retry attempts
  // specFileRetriesDelay: 0,
  //
  // Whether or not retried specfiles should be retried immediately or deferred to the end of the queue
  // specFileRetriesDeferred: false,
  //
  // Test reporter for stdout.
  // The only one supported by default is 'dot'
  // see also: https://webdriver.io/docs/dot-reporter
  reporters: [
    'spec',
    [
      'junit',
      {
        outputDir: './test_results/e2e',
        outputFileFormat: function(options) {
          // optional
          return `results-${options.cid}.${options.capabilities.browserName}.xml`;
        },
      },
    ],
  ],

  //
  // Options to be passed to Jasmine.
  jasmineOpts: {
    // Babel setup
    helpers: [require.resolve('@babel/register')],
    // Jasmine default timeout
    defaultTimeoutInterval: 60000,
    //
    // The Jasmine framework allows interception of each assertion in order to log the state of the application
    // or website depending on the result. For example, it is pretty handy to take a screenshot every time
    // an assertion fails.
    // expectationResultHandler: function(passed, assertion) {
    // do something
    // },
  },
};

if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY && process.env.SAUCE_REGION) {
  config.user = process.env.SAUCE_USERNAME;
  config.key = process.env.SAUCE_ACCESS_KEY;
  config.region = process.env.SAUCE_REGION;

  config.services.push([
    'sauce',
    {
      sauceConnect: false,
      sauceConnectOpts: {},
    },
  ]);

  for(const cap of config.capabilities) {
    cap['sauce:options'] = {
      extendedDebugging: true,
      capturePerformance: true,
    };
  }
};

exports.config = config;

