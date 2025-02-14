/* eslint-disable prettier/prettier */
const accessTokenElem = document.getElementById('access_token_elem');
const themeElem = document.getElementById('theme');
const widgetsContainer = document.getElementById('widgets-container');
const ccStationLogin = document.getElementById('cc-station-login');
const ccUserState = document.createElement('widget-cc-user-state');
const ccIncomingTask = document.createElement('widget-cc-incoming-task');
const ccTaskList = document.createElement('widget-cc-task-list');
const ccCallControl = document.createElement('widget-cc-call-control');
const themeProviderElem = document.getElementById('theme-provider-elem');
const widgetSelection = document.getElementById('widget-selection');
const stationLoginCheckbox = document.getElementById('stationLoginCheckbox');
const userStateCheckbox = document.getElementById('userStateCheckbox');
const incomingTaskCheckbox = document.getElementById('incomingTaskCheckbox');
const taskListCheckbox = document.getElementById('taskListCheckbox');
const callControlCheckbox = document.getElementById('callControlCheckbox');
let isMultiLoginEnabled = false;

themeElem.addEventListener('change', () => {
  store.setCurrentTheme(themeElem.checked ? 'DARK' : 'LIGHT');
  themeProviderElem.setAttribute(
    'themeclass',
    themeElem.checked ? 'mds-theme-stable-darkWebex' : 'mds-theme-stable-lightWebex'
  );
});

if (!ccStationLogin && !ccUserState) {
  console.error('Failed to find the required elements');
}

function switchButtonState() {
  const buttonElem = document.querySelector('button');
  buttonElem.disabled = accessTokenElem.value.trim() === '';
}

function enableMultiLogin() {
  if (isMultiLoginEnabled) isMultiLoginEnabled = false;
  else isMultiLoginEnabled = true;
}

function initWidgets() {
  const webexConfig = {
    fedramp: false,
    logger: {
      level: 'log',
    },
    cc: {
      allowMultiLogin: isMultiLoginEnabled,
    },
  };
  store
    .init({
      webexConfig,
      access_token: accessTokenElem.value.trim(),
    })
    .then(() => {
      ccStationLogin.onLogin = loginSuccess;
      ccStationLogin.onLogout = logoutSuccess;
      ccIncomingTask.onAccepted = onAccepted;
      ccIncomingTask.onDeclined = onDeclined;
      ccTaskList.onTaskAccepted = onTaskAccepted;
      ccTaskList.onTaskDeclined = onTaskDeclined;
      ccCallControl.onHoldResume = onHoldResume;
      ccCallControl.onEnd = onEnd;
      ccCallControl.onWrapup = onWrapup;
      widgetSelection.classList.remove('disabled');
    })
    .catch((error) => {
      console.error('Failed to initialize widgets:', error);
    });
}

function submitWidgets() {
  if (stationLoginCheckbox.checked) {
    ccStationLogin.classList.remove('disabled');
    widgetsContainer.appendChild(ccStationLogin);
  } else {
    ccStationLogin.classList.add('disabled');
  }

  if (userStateCheckbox.checked) {
    ccUserState.classList.remove('disabled');
  } else {
    ccUserState.classList.add('disabled');
  }

  if (incomingTaskCheckbox.checked) {
    ccIncomingTask.classList.remove('disabled');
  } else {
    ccIncomingTask.classList.add('disabled');
  }
  if (taskListCheckbox.checked) {
    ccTaskList.classList.remove('disabled');
  } else {
    ccTaskList.classList.add('disabled');
  }
  if (callControlCheckbox.checked) {
    ccCallControl.classList.remove('disabled');
  } else {
    ccCallControl.classList.add('disabled');
  }
}

function loginSuccess() {
  console.log('Agent login has been succesful');
  if (userStateCheckbox.checked) {
    ccUserState.classList.remove('disabled');
    widgetsContainer.appendChild(ccUserState);
  }
  if (incomingTaskCheckbox.checked) {
    ccIncomingTask.classList.remove('disabled');
    widgetsContainer.appendChild(ccIncomingTask);
  }
  if (taskListCheckbox.checked) {
    ccTaskList.classList.remove('disabled');
    widgetsContainer.appendChild(ccTaskList);
  }
  if (callControlCheckbox.checked) {
    ccCallControl.classList.remove('disabled');
    widgetsContainer.appendChild(ccCallControl);
  }
}

function logoutSuccess() {
  console.log('Agent logout has been succesful');
  ccUserState.classList.add('disabled');
  ccIncomingTask.classList.add('disabled');
  ccTaskList.classList.add('disabled');
  ccCallControl.classList.add('disabled');
}

function onAccepted() {
  console.log('onAccepted Invoked');
}

function onDeclined() {
  console.log('onDeclined invoked');
}

function onTaskAccepted() {
  console.log('onTaskAccepted invoked');
}

function onTaskDeclined() {
  console.log('onTaskDeclined invoked');
}

function onHoldResume() {
  console.log('onHoldResume invoked');
}

function onEnd() {
  console.log('onEnd invoked');
}

function onWrapup() {
  console.log('onWrapUp invoked');
}
