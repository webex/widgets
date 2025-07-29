import {test as setup} from '@playwright/test';
import {oauthLogin} from './Utils/initUtils';
const fs = require('fs');
const path = require('path');

setup('OAuth', async ({browser}) => {
  const agents = ['AGENT1', 'AGENT2']; // Array of agents to set up

  for (const agentId of agents) {
    const page = await browser.newPage();
    await oauthLogin(page, agentId);

    await page.getByRole('textbox').click();
    const accessToken = await page.getByRole('textbox').inputValue();

    const envPath = path.resolve(__dirname, '../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      // Remove any existing ACCESS_TOKEN line for this agent
      const accessTokenPattern = new RegExp(`^PW_${agentId}_ACCESS_TOKEN=.*$`, 'm');
      envContent = envContent.replace(accessTokenPattern, '');
      // Also remove legacy ACCESS_TOKEN for backward compatibility
      if (agentId === 'AGENT1') {
        envContent = envContent.replace(/^ACCESS_TOKEN=.*$/m, '');
      }
      // Ensure trailing newline
      if (!envContent.endsWith('\n')) envContent += '\n';
    }
    envContent += `PW_${agentId}_ACCESS_TOKEN=${accessToken}\n`;
    fs.writeFileSync(envPath, envContent, 'utf8');

    await page.close();
  }
});
