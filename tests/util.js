import {createTestUser, removeTestUser} from '@webex/test-users';
import Webex from 'webex';

/**
 * Creates a test user
 * @param {object} [options={}] See https://github.com/webex/webex-js-sdk/blob/master/packages/node_modules/%40webex/test-users/src/index.js#L117
 * @returns {Promise<object>}
 */
export async function createUser(options = {}) {
  options = {
    clientId: process.env.WEBEX_CLIENT_ID,
    clientSecret: process.env.WEBEX_CLIENT_SECRET,
    idbrokerUrl: process.env.IDBROKER_BASE_URL,
    cigServiceUrl: process.env.WEBEX_TEST_USERS_CI_GATEWAY_SERVICE_URL,
    ...options,
  };

  const user = await createTestUser(options);

  return user;
}

/**
 * Creates a new SDK instance
 * @param {string} accessToken
 * @returns {Webex} The new instance
 */
export function createSdkInstance(accessToken) {
  return new Webex({
    credentials: {
      access_token: process.env.WEBEX_ACCESS_TOKEN || accessToken,
    },
    config: {
      logger: {
        level: 'error',
      },
    },
  });
}

/**
 * Removes a user
 * @param {object} user
 * @returns {Promise}
 */
export function removeUser(user) {
  return removeTestUser(user);
}
