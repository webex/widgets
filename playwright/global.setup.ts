import {test as setup, Browser} from '@playwright/test';
import {oauthLogin} from './Utils/initUtils';
import {USER_SETS} from './test-data';
const fs = require('fs');
const path = require('path');

export const UpdateENVWithUserSets = () => {
  // Constants
  const DOMAIN = process.env.PW_SANDBOX;
  const envPath = path.resolve(__dirname, '../.env');

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Dynamically set environment variables for all user sets
  Object.keys(USER_SETS).forEach((setKey) => {
    const userSet = USER_SETS[setKey];

    // Set agent usernames and extensions - access agents through userSet.AGENTS
    Object.keys(userSet.AGENTS).forEach((agentKey) => {
      const agent = userSet.AGENTS[agentKey];

      // Remove existing lines for this agent if they exist
      const usernamePattern = new RegExp(`^${setKey}_${agentKey}_USERNAME=.*$\\n?`, 'm');
      const extensionPattern = new RegExp(`^${setKey}_${agentKey}_EXTENSION_NUMBER=.*$\\n?`, 'm');
      const namePattern = new RegExp(`^${setKey}_${agentKey}_NAME=.*$\\n?`, 'm');

      envContent = envContent.replace(usernamePattern, '');
      envContent = envContent.replace(extensionPattern, '');
      envContent = envContent.replace(namePattern, '');

      // Add new lines
      if (!envContent.endsWith('\n') && envContent.length > 0) envContent += '\n';
      envContent += `${setKey}_${agentKey}_USERNAME=${agent.username}@${DOMAIN}\n`;
      envContent += `${setKey}_${agentKey}_EXTENSION_NUMBER=${agent.extension}\n`;
      envContent += `${setKey}_${agentKey}_NAME=${agent.agentName || ''}\n`;
    });

    // Map to corresponding SET environment variables
    const dialPattern = new RegExp(`^${setKey}_ENTRY_POINT=.*$\\n?`, 'm');
    const emailPattern = new RegExp(`^${setKey}_EMAIL_ENTRY_POINT=.*$\\n?`, 'm');
    const queuePattern = new RegExp(`^${setKey}_QUEUE_NAME=.*$\\n?`, 'm');
    const chatPattern = new RegExp(`^${setKey}_CHAT_URL=.*$\\n?`, 'm');

    envContent = envContent.replace(dialPattern, '');
    envContent = envContent.replace(emailPattern, '');
    envContent = envContent.replace(queuePattern, '');
    envContent = envContent.replace(chatPattern, '');

    if (!envContent.endsWith('\n') && envContent.length > 0) envContent += '\n';
    envContent += `${setKey}_ENTRY_POINT=${userSet.ENTRY_POINT || ''}\n`;
    envContent += `${setKey}_EMAIL_ENTRY_POINT=${userSet.EMAIL_ENTRY_POINT || ''}\n`;
    envContent += `${setKey}_QUEUE_NAME=${userSet.QUEUE_NAME || ''}\n`;
    envContent += `${setKey}_CHAT_URL=${userSet.CHAT_URL || ''}\n`;
  });

  // Write the updated content back to .env file
  // Clean up multiple consecutive empty lines
  envContent = envContent.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(envPath, envContent, 'utf8');
};

const updateEnvVariables = (updates: Record<string, string>): void => {
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  Object.entries(updates).forEach(([key, value]) => {
    const keyPattern = new RegExp(`^${key}=.*$\\n?`, 'm');
    envContent = envContent.replace(keyPattern, '');
    if (!envContent.endsWith('\n') && envContent.length > 0) envContent += '\n';
    envContent += `${key}=${value}\n`;
  });

  envContent = envContent.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(envPath, envContent, 'utf8');
};

// Helper function to fetch OAuth token for a single agent
const fetchOAuthTokenForAgent = async (
  browser: Browser,
  setKey: string,
  agentKey: string,
  agent: {username: string}
): Promise<{key: string; token: string}> => {
  const page = await browser.newPage();

  // Construct the OAuth agent ID directly
  const oauthAgentId = `${agent.username}@${process.env.PW_SANDBOX}`;

  await oauthLogin(page, oauthAgentId);

  await page.getByRole('textbox').click();
  const token = await page.getByRole('textbox').inputValue();

  await page.close();
  return {
    key: `${setKey}_${agentKey}_ACCESS_TOKEN`,
    token,
  };
};

// Helper function to fetch OAuth tokens for all agents in a set
const fetchOAuthTokensForSet = async (browser: Browser, setKey: string): Promise<Record<string, string>> => {
  const userSet = USER_SETS[setKey];
  const tokenEntries = await Promise.all(
    Object.keys(userSet.AGENTS).map((agentKey) =>
      fetchOAuthTokenForAgent(browser, setKey, agentKey, userSet.AGENTS[agentKey])
    )
  );

  return tokenEntries.reduce(
    (acc, entry) => {
      acc[entry.key] = entry.token;
      return acc;
    },
    {} as Record<string, string>
  );
};

// Helper function to fetch OAuth tokens for a given list of set keys.
// Fetching is parallel, but env file updates are done once at the end to prevent write races.
const fetchOAuthTokensForSets = async (browser: Browser, setKeys: string[]): Promise<Record<string, string>> => {
  const tokenMaps = await Promise.all(setKeys.map((setKey) => fetchOAuthTokensForSet(browser, setKey)));
  return tokenMaps.reduce((acc, tokenMap) => ({...acc, ...tokenMap}), {} as Record<string, string>);
};

// Helper function to fetch dial number OAuth token
const fetchDialNumberToken = async (browser: Browser): Promise<string | undefined> => {
  const dialNumberUsername = process.env.PW_DIAL_NUMBER_LOGIN_USERNAME;
  const dialNumberPassword = process.env.PW_DIAL_NUMBER_LOGIN_PASSWORD;

  if (dialNumberUsername && dialNumberPassword) {
    const page = await browser.newPage();

    await oauthLogin(page, dialNumberUsername, dialNumberPassword);

    await page.getByRole('textbox').click();
    const accessToken = await page.getByRole('textbox').inputValue();

    await page.close();
    return accessToken;
  }
  return undefined;
};

setup('OAuth: Get Access Token', async ({browser}) => {
  // Update environment variables with user sets before starting OAuth.
  UpdateENVWithUserSets();

  const allSetKeys = Object.keys(USER_SETS);
  const oauthTokenUpdates = await fetchOAuthTokensForSets(browser, allSetKeys);
  const dialNumberToken = await fetchDialNumberToken(browser);

  if (dialNumberToken) {
    oauthTokenUpdates.DIAL_NUMBER_LOGIN_ACCESS_TOKEN = dialNumberToken;
  }

  updateEnvVariables(oauthTokenUpdates);
});
