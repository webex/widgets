import { Page, expect } from '@playwright/test';
import { CALL_URL } from '../constants';
import { TASK_TYPES } from '../constants';
import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({

  host: "smtp.gmail.com",
  auth: {
    user: "rjgamer242@gmail.com",
    pass: process.env.APP_PASSWORD
  },
});

export async function createCallTask(page: Page, number: string = process.env.ENDPOINT) {
  await page.getByRole('textbox', { name: 'Dial' }).fill(number);
  await page.locator('[data-test="calling-ui-keypad-control"]').getByRole('button', { name: 'Call' }).click();
}

export async function endCallTask(page: Page) {
  await page.locator('[data-test="call-end"]').click();
}

export async function createChatTask(page: Page) {
  await page.goto('https://widgets.webex.com/chat-client');
  await page.locator('iframe[name="Livechat launcher icon"]').contentFrame().getByRole('button', { name: 'Livechat Button - 0 unread' }).waitFor({ state: 'visible' });
  await page.locator('iframe[name="Livechat launcher icon"]').contentFrame().getByRole('button', { name: 'Livechat Button - 0 unread' }).click();
  // await expect(page.locator('iframe[name="Conversation Window"]').contentFrame().locator('#chatwindow')).toBeVisible();
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Hit Us Up!' }).waitFor({ state: 'visible' });
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Hit Us Up!' }).click();
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Namemust fill field' }).waitFor({ state: 'visible' });
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Namemust fill field' }).click();
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Namemust fill field' }).fill('Playwright Test');
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Submit Name' }).click();
  await page.waitForTimeout(200);
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Email*' }).click();
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Email*' }).fill('playwright@test.com');
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Submit Email' }).click();
  // locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Write a reply' })
  // locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Send a message' })

};

export async function endChatTask(page: Page) {
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Menu' }).click();
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByText('End chat').click();
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'End', exact: true }).click();
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'End', exact: true }).click();
  await page.waitForTimeout(1000);
};

// export async function createEmailTask(page: Page) {
//     await page.goto('https://mail.google.com/');
//     await page.getByRole('button', { name: 'Compose' }).waitFor({ state: 'visible', timeout: 60000 });
//     await page.getByRole('button', { name: 'Compose' }).click();
//     await page.getByRole('combobox', { name: 'To recipients' }).fill('ccsdk.wbx.ai@gmail.com');
//     // await page.getByRole('textbox', { name: 'Subject' }).click();
//     // await page.locator('[id="\\:a9"]').click();
//     await page.getByRole('textbox', { name: 'Subject' }).fill('Playwright Test Email');
//     // await page.getByRole('textbox', { name: 'Message Body' }).click();
//     await page.getByRole('textbox', { name: 'Message Body' }).fill('--This Email is generated due to playwright automation test for incoming Tasks---');
//     await page.getByRole('button', { name: 'Send ‪(Ctrl-Enter)‬' }).click();

// }

export async function createEmailTask(to: string = process.env.DEST_EMAIL, subject: string = 'Playwright Test Email', text: string = '--This Email is generated due to playwright automation test for incoming Tasks---') {
  const from = "rjgamer242@gmail.com";

  try {
    const mailOptions = {
      from,
      to,
      subject,
      text,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error(`Failed to send email: ${error}`);
  }
}

// export async function createSocialTask(page: Page) {
//   await page.goto(SOCIAL_URL);
//   await page.getByRole('button', { name: 'Message', exact: true }).waitFor({ state: 'visible' });
//   await page.getByRole('button', { name: 'Message', exact: true }).click();
//   await page.getByRole('textbox', { name: 'Message' }).fill('Playwright test message');
//   await page.getByRole('button', { name: 'Press enter to send' }).click();
//   await page.getByRole('button', { name: 'Close chat' }).click();
//   await page.waitForTimeout(2000);
//   //Working on the META API 
// }


export async function acceptIncomingTask(page: Page, type: string) {
  let incomingTaskDiv;
  if (type === TASK_TYPES.CALL) {
    incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    });


  } else if (type === TASK_TYPES.CHAT) {
    // chat-filled
    incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="chat-filled"]')
    });

  } else if (type === TASK_TYPES.EMAIL) {
    //email-filled
    incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="email-filled"]')
    });

  } else if (type === TASK_TYPES.SOCIAL) {
    incomingTaskDiv = page.locator('div.incoming-task');

  }
  incomingTaskDiv = incomingTaskDiv.first();
  await incomingTaskDiv.waitFor({ state: 'visible' });
  const acceptButton = incomingTaskDiv.getByRole('button', { name: 'Accept' });
  if (!(await acceptButton.isVisible())) { throw new Error('Accept button not found'); }
  await acceptButton.click();
}

export async function declineIncomingTask(page: Page, type: string) {
  let incomingTaskDiv;
  if (type === TASK_TYPES.CALL) {
    incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    });

  } else if (type === TASK_TYPES.CHAT) {
    // chat-filled
    incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="chat-filled"]')
    });

  } else if (type === TASK_TYPES.EMAIL) {
    //email-filled
    incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="email-filled"]')
    });

  } else if (type === TASK_TYPES.SOCIAL) {
    incomingTaskDiv = page.locator('div.incoming-task');
  }
  incomingTaskDiv = await incomingTaskDiv.first();
  await incomingTaskDiv.waitFor({ state: 'visible' });
  const declineButton = await incomingTaskDiv.getByRole('button', { name: 'Decline' });
  if (!(await declineButton.isVisible())) { throw new Error('Decline button not found'); }
  await declineButton.click();
  await incomingTaskDiv.waitFor({ state: 'hidden' });
}

export async function acceptExtensionCall(page: Page) {
  // await loginExtension(page, process.env.PLAYWRIGHT_USERNAME, process.env.PLAYWRIGHT_PASSWORD);
  await page.locator('[data-test="right-action-button"]').waitFor({ state: 'visible' });
  await page.locator('[data-test="right-action-button"]').click();
}

export async function declineExtensionCall(page: Page) {
  await page.locator('[data-test="left-action-button"]').waitFor({ state: 'visible' });
  await page.locator('[data-test="left-action-button"]').click();
}


export async function endExtensionCall(page: Page, easyCheck: boolean = true) {
  if (!easyCheck) {
    await page.locator('[data-test="end-call"]').waitFor({ state: 'visible' });
    await page.locator('[data-test="end-call"]').click();
  } else {
    // This is a workaround for the issue where the end call button is not visible
    const endButton = await page.locator('[data-test="end-call"]').isVisible().catch(() => false);
    if (endButton) await page.locator('[data-test="end-call"]').click();
  }
}

export async function loginExtension(page: Page, email: string, password: string) {
  if (!email || !password) {
    throw new Error('Email and password are required for loginExtension');
  }

  if (email.trim() === '' || password.trim() === '') {
    throw new Error('Email and password cannot be empty strings for loginExtension');
  }
  if (!CALL_URL) {
    throw new Error('CALL_URL is not defined. Please check your constants file.');
  }

  await page.goto(CALL_URL);
  await page.getByRole('textbox', { name: 'Email address (required)' }).fill(email);
  await page.getByRole('textbox', { name: 'Email address (required)' }).press('Enter');
  await page.getByRole('textbox', { name: 'Password' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('textbox', { name: 'Dial' }).waitFor({ state: 'visible' });
  try {
    await page.locator('[data-test="statusMessage"]').waitFor({ state: 'hidden' });
  } catch (e) {
    throw new Error('Phone service is not able to connect. Please check if there are multiple sessions with the same account.');
  }
}

export async function submitRonaPopup(page: Page, select: string) {
  await page.getByTestId('samples:rona-select-state').click();
  await page.waitForTimeout(2000);
  if (select == 'Available') {
    await page.getByTestId('samples:rona-option-available').click();
  } else if (select == 'Idle') {
    await page.getByTestId('samples:rona-option-idle').click();
  }
  await page.waitForTimeout(2000);
  await page.getByTestId('samples:rona-button-confirm').click();
  await page.waitForTimeout(2000);
}


export async function checkTaskAcceptLogs(logs: string[], taskType: string) {

}

//Method to check the console logs for stateChanges, TaskEvents.


/*
  await expect(page.locator('[data-test="right-action-button"]')).toBeVisible();
  await expect(page.locator('[data-test="left-action-button"]')).toBeVisible();
  await expect(page.locator('[data-test="nav-list-icon--keypad"] svg')).toBeVisible();
*/