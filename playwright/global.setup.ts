import {test as setup} from '@playwright/test';
import {oauthLogin} from './Utils/initUtils';
import {USER_SETS} from './test-data';
const fs = require('fs');
const path = require('path');

function UpdateENVWithUserSets() {
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
      const usernamePattern = new RegExp(`^${setKey}_${agentKey}_USERNAME=.*$`, 'm');
      const extensionPattern = new RegExp(`^${setKey}_${agentKey}_EXTENSION_NUMBER=.*$`, 'm');
      const namePattern = new RegExp(`^${setKey}_${agentKey}_NAME=.*$`, 'm');

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
    const dialPattern = new RegExp(`^${setKey}_DIAL_NUMBER=.*$`, 'm');
    const emailPattern = new RegExp(`^${setKey}_EMAIL_ENTRY_POINT=.*$`, 'm');
    const queuePattern = new RegExp(`^${setKey}_QUEUE_NAME=.*$`, 'm');
    const chatPattern = new RegExp(`^${setKey}_CHAT_URL=.*$`, 'm');

    envContent = envContent.replace(dialPattern, '');
    envContent = envContent.replace(emailPattern, '');
    envContent = envContent.replace(queuePattern, '');
    envContent = envContent.replace(chatPattern, '');

    if (!envContent.endsWith('\n') && envContent.length > 0) envContent += '\n';
    envContent += `${setKey}_DIAL_NUMBER=${userSet.DIAL_NUMBER || ''}\n`;
    envContent += `${setKey}_EMAIL_ENTRY_POINT=${userSet.EMAIL_ENTRY_POINT || ''}\n`;
    envContent += `${setKey}_QUEUE_NAME=${userSet.QUEUE_NAME || ''}\n`;
    envContent += `${setKey}_CHAT_URL=${userSet.CHAT_URL || ''}\n`;
  });

  // Write the updated content back to .env file
  fs.writeFileSync(envPath, envContent, 'utf8');
}

module.exports = {UpdateENVWithUserSets};

setup('OAuth', async ({browser}) => {
  // Directly iterate through USER_SETS and their agents
  for (const setKey of Object.keys(USER_SETS)) {
    const userSet = USER_SETS[setKey];

    for (const agentKey of Object.keys(userSet.AGENTS)) {
      const page = await browser.newPage();

      // Construct the OAuth agent ID directly
      const oauthAgentId = `${userSet.AGENTS[agentKey].username}@${process.env.PW_SANDBOX}`;

      await oauthLogin(page, oauthAgentId);

      await page.getByRole('textbox').click();
      const accessToken = await page.getByRole('textbox').inputValue();

      const envPath = path.resolve(__dirname, '../.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        // Remove any existing ACCESS_TOKEN line for this set-agent combination
        const accessTokenPattern = new RegExp(`^${setKey}_${agentKey}_ACCESS_TOKEN=.*$`, 'm');
        envContent = envContent.replace(accessTokenPattern, '');

        // Ensure trailing newline
        if (!envContent.endsWith('\n')) envContent += '\n';
      }
      envContent += `${setKey}_${agentKey}_ACCESS_TOKEN=${accessToken}\n`;
      fs.writeFileSync(envPath, envContent, 'utf8');

      await page.close();
    }
  }
});

UpdateENVWithUserSets();
