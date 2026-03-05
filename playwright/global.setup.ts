import {test as setup, Browser} from '@playwright/test';
import {oauthLogin} from './Utils/initUtils';
import {USER_SETS} from './test-data';
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '../.env');
const OAUTH_BATCH_SIZE = 4;

type EnvUpdateMap = Record<string, string>;

interface OAuthTask {
  envKey: string;
  username: string;
  password?: string;
}

const readEnvFile = (): string => {
  if (!fs.existsSync(ENV_PATH)) {
    return '';
  }
  return fs.readFileSync(ENV_PATH, 'utf8');
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const upsertEnvVariables = (updates: EnvUpdateMap): void => {
  let envContent = readEnvFile();

  for (const [key, value] of Object.entries(updates)) {
    const keyPattern = new RegExp(`^${escapeRegExp(key)}=.*$\\n?`, 'm');
    envContent = envContent.replace(keyPattern, '');

    if (!envContent.endsWith('\n') && envContent.length > 0) {
      envContent += '\n';
    }
    envContent += `${key}=${value}\n`;
    process.env[key] = value;
  }

  envContent = envContent.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(ENV_PATH, envContent, 'utf8');
};

const buildOAuthTasks = (): OAuthTask[] => {
  const domain = process.env.PW_SANDBOX;
  const tasks: OAuthTask[] = [];

  for (const setKey of Object.keys(USER_SETS)) {
    const userSet = USER_SETS[setKey];

    for (const agentKey of Object.keys(userSet.AGENTS)) {
      const username = `${userSet.AGENTS[agentKey].username}@${domain}`;
      tasks.push({
        envKey: `${setKey}_${agentKey}_ACCESS_TOKEN`,
        username,
      });
    }
  }

  const dialNumberUsername = process.env.PW_DIAL_NUMBER_LOGIN_USERNAME;
  const dialNumberPassword = process.env.PW_DIAL_NUMBER_LOGIN_PASSWORD;

  if (dialNumberUsername && dialNumberPassword) {
    tasks.push({
      envKey: 'DIAL_NUMBER_LOGIN_ACCESS_TOKEN',
      username: dialNumberUsername,
      password: dialNumberPassword,
    });
  }

  return tasks;
};

const fetchOAuthAccessToken = async (browser: Browser, username: string, password?: string): Promise<string> => {
  const context = await browser.newContext({ignoreHTTPSErrors: true});
  const page = await context.newPage();

  try {
    await oauthLogin(page, username, password);
    await page.getByRole('textbox').click();
    return await page.getByRole('textbox').inputValue();
  } finally {
    await context.close().catch(() => {});
  }
};

const collectTokensInBatches = async (browser: Browser, tasks: OAuthTask[]): Promise<EnvUpdateMap> => {
  const tokenUpdates: EnvUpdateMap = {};

  for (let index = 0; index < tasks.length; index += OAUTH_BATCH_SIZE) {
    const batch = tasks.slice(index, index + OAUTH_BATCH_SIZE);
    const batchTokens = await Promise.all(
      batch.map((task) => fetchOAuthAccessToken(browser, task.username, task.password))
    );

    batch.forEach((task, batchIndex) => {
      tokenUpdates[task.envKey] = batchTokens[batchIndex];
    });
  }

  return tokenUpdates;
};

export const UpdateENVWithUserSets = () => {
  // Constants
  const DOMAIN = process.env.PW_SANDBOX;
  const updates: EnvUpdateMap = {};

  // Dynamically set environment variables for all user sets
  Object.keys(USER_SETS).forEach((setKey) => {
    const userSet = USER_SETS[setKey];

    // Set agent usernames and extensions - access agents through userSet.AGENTS
    Object.keys(userSet.AGENTS).forEach((agentKey) => {
      const agent = userSet.AGENTS[agentKey];

      updates[`${setKey}_${agentKey}_USERNAME`] = `${agent.username}@${DOMAIN}`;
      updates[`${setKey}_${agentKey}_EXTENSION_NUMBER`] = agent.extension;
      updates[`${setKey}_${agentKey}_NAME`] = agent.agentName || '';
    });

    updates[`${setKey}_ENTRY_POINT`] = userSet.ENTRY_POINT || '';
    updates[`${setKey}_EMAIL_ENTRY_POINT`] = userSet.EMAIL_ENTRY_POINT || '';
    updates[`${setKey}_QUEUE_NAME`] = userSet.QUEUE_NAME || '';
    updates[`${setKey}_CHAT_URL`] = userSet.CHAT_URL || '';
  });

  upsertEnvVariables(updates);
};

setup('OAuth', async ({browser}) => {
  // Update environment variables with user sets before starting OAuth
  UpdateENVWithUserSets();
  const oauthTasks = buildOAuthTasks();
  const tokenUpdates = await collectTokensInBatches(browser, oauthTasks);
  upsertEnvVariables(tokenUpdates);
});
