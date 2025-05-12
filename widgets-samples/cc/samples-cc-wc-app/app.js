const accessTokenElem = document.getElementById('access_token_elem');
const themeElem = document.getElementById('theme');
const widgetsContainer = document.getElementById('widgets-container');
const popupContainer = document.getElementById('popup-container');
const taskRejectedSubmitButton = document.getElementById('task-rejected-submit-button');
const ccStationLogin = document.createElement('widget-cc-station-login');
const ccUserState = document.createElement('widget-cc-user-state');
const ccIncomingTask = document.createElement('widget-cc-incoming-task');
const ccTaskList = document.createElement('widget-cc-task-list');
const ccCallControl = document.createElement('widget-cc-call-control');
const ccCallControlCAD = document.createElement('widget-cc-call-control-cad');
const ccOutdial = document.createElement('widget-cc-outdial-call');
const initWidgetsButton = document.getElementById('init-widgets');

const themeProviderElem = document.getElementById('theme-provider-elem');

const stationLoginCheckbox = document.getElementById('stationLoginCheckbox');
const userStateCheckbox = document.getElementById('userStateCheckbox');
const incomingTaskCheckbox = document.getElementById('incomingTaskCheckbox');
const taskListCheckbox = document.getElementById('taskListCheckbox');
const callControlCheckbox = document.getElementById('callControlCheckbox');
const callControlCADCheckbox = document.getElementById('callControlCADCheckbox');
const outdialCallCheckbox = document.getElementById('outdialCallCheckbox');

let isMultiLoginEnabled = false;

themeElem.addEventListener('change', () => {
  store.setCurrentTheme(themeElem.checked ? 'DARK' : 'LIGHT');
  themeProviderElem.setAttribute(
    'themeclass',
    themeElem.checked ? 'mds-theme-stable-darkWebex' : 'mds-theme-stable-lightWebex'
  );
});

store.setTaskRejected(function (reason) {
  showTaskRejectedPopup(reason);
});

// Attach submit button event listener once.
taskRejectedSubmitButton.addEventListener('click', function () {
  const selectedState = document.getElementById('state-select').value;
  if (selectedState) {
    changeAgentState(selectedState);
  }
  popupContainer.style.display = 'none';
});

if (!ccStationLogin && !ccUserState) {
  console.error('Failed to find the required elements');
}

function enableMultiLogin() {
  if (isMultiLoginEnabled) isMultiLoginEnabled = false;
  else isMultiLoginEnabled = true;
}

function doOAuthLogin() {
  let redirectUri = `${window.location.protocol}//${window.location.host}`;

  if (window.location.pathname) {
    redirectUri += window.location.pathname;
  }

  // Reference: https://developer.webex-cx.com/documentation/integrations
  const ccMandatoryScopes = ['cjp:config_read', 'cjp:config_write', 'cjp:config', 'cjp:user'];

  const webRTCCallingScopes = ['spark:webrtc_calling', 'spark:calls_read', 'spark:calls_write', 'spark:xsi'];

  const additionalScopes = [
    'spark:kms', // to avoid token downscope to only spark:kms error on SDK init
  ];

  const requestedScopes = Array.from(
    new Set(ccMandatoryScopes.concat(webRTCCallingScopes).concat(additionalScopes))
  ).join(' ');

  const webexConfig = {
    config: {
      appName: 'sdk-samples',
      appPlatform: 'testClient',
      fedramp: false,
      logger: {
        level: 'info',
      },
      credentials: {
        client_id: 'C04ef08ffce356c3161bb66b15dbdd98d26b6c683c5ce1a1a89efad545fdadd74',
        redirect_uri: redirectUri,
        scope: requestedScopes,
      },
    },
  };

  const webex = Webex.init(webexConfig);

  webex.once('ready', () => {
    webex.authorization.initiateLogin();
  });
}

// Define the callback function once
const updateButtonState = () => {
  initWidgetsButton.disabled = !accessTokenElem.value.trim();
};

accessTokenElem.addEventListener('keyup', updateButtonState);

window.addEventListener('load', () => {
  if (window.location.hash) {
    const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));

    const accessToken = urlParams.get('access_token');
    const expiresIn = urlParams.get('expires_in');

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      // @ts-expect-error: Browser accepts this
      localStorage.setItem('date', new Date().getTime() + parseInt(expiresIn, 10));
      accessTokenElem.value = accessToken;
      updateButtonState();
      // Clear the hash from the URL to remove the token from browser history
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  } else {
    const storedDate = window.localStorage.getItem('date');
    if (storedDate && parseInt(storedDate, 10) > new Date().getTime()) {
      const storedAccessToken = window.localStorage.getItem('accessToken');
      if (storedAccessToken) {
        accessTokenElem.value = storedAccessToken;
        updateButtonState();
      }
    } else {
      window.localStorage.removeItem('accessToken');
    }
  }
});

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
      ccCallControl.onWrapUp = onWrapUp;
      ccCallControlCAD.onHoldResume = onHoldResume;
      ccCallControlCAD.onEnd = onEnd;
      ccCallControlCAD.onWrapUp = onWrapUp;

      if (stationLoginCheckbox.checked) {
        ccStationLogin.classList.remove('disabled');
        widgetsContainer.appendChild(ccStationLogin);
      }
      if (store.isAgentLoggedIn) {
        loginSuccess();
      } else {
        console.error('Agent is not logged in! Station Login Widget is required');
      }
    })
    .catch((error) => {
      console.error('Failed to initialize widgets:', error);
    });
}

function loginSuccess() {
  if (userStateCheckbox.checked) {
    ccUserState.classList.remove('disabled');

    const userStateContainer = document.createElement('div');
    userStateContainer.className = 'box';
    userStateContainer.innerHTML = `
      <section class="section-box">
        <fieldset class="fieldset">
          <legend class="legend-box">User State</legend>
        </fieldset>
      </section>
    `;

    userStateContainer.querySelector('fieldset').appendChild(ccUserState);
    widgetsContainer.appendChild(userStateContainer);
    ccUserState.onStateChange = onStateChange;
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
    const callControlContainer = document.createElement('div');
    callControlContainer.className = 'box';
    callControlContainer.innerHTML = `
      <section class="section-box">
        <fieldset class="fieldset">
          <legend class="legend-box">Call Control</legend>
        </fieldset>
      </section>
    `;

    callControlContainer.querySelector('fieldset').appendChild(ccCallControl);
    widgetsContainer.appendChild(callControlContainer);
  }
  if (outdialCallCheckbox.checked) {
    ccOutdial.classList.remove('disabled');
    widgetsContainer.appendChild(ccOutdial);
  }

  if (callControlCADCheckbox.checked) {
    ccCallControlCAD.classList.remove('disabled');
    const callControlCADContainer = document.createElement('div');
    callControlCADContainer.className = 'box';
    callControlCADContainer.innerHTML = `
      <section class="section-box">
        <fieldset class="fieldset">
          <legend class="legend-box">Call Control CAD</legend>
        </fieldset>
      </section>
    `;

    callControlCADContainer.querySelector('fieldset').appendChild(ccCallControlCAD);
    widgetsContainer.appendChild(callControlCADContainer);
  }
}

function logoutSuccess() {
  console.log('Agent logout has been successful');
  ccUserState.classList.add('disabled');
  ccIncomingTask.classList.add('disabled');
  ccTaskList.classList.add('disabled');
  ccCallControl.classList.add('disabled');
  ccCallControlCAD.classList.add('disabled');
  ccOutdial.classList.add('disabled');
}

function onStateChange(status) {
  console.log('onStateChange invoked', status);
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

function onWrapUp(params) {
  console.log('onWrapup invoked', params);
}

// Helper to change the agent state, using "Available" as is or "Meeting" for lookup if not.
function changeAgentState(newState) {
  const lookupCodeName = newState === 'Available' ? 'Available' : 'Meeting';
  const idleCode = store.idleCodes?.find((code) => code.name === lookupCodeName);
  if (!idleCode) {
    console.error('No idle code found for selected state:', newState);
    return;
  }
  const agentId = store.agentId || '';
  store.cc
    .setAgentState({
      state: newState,
      auxCodeId: idleCode.id,
      agentId: agentId,
      lastStateChangeReason: newState,
    })
    .then(function (response) {
      store.setCurrentState(response.data.auxCodeId);
      store.setLastStateChangeTimestamp(response.data.lastStateChangeTimestamp);
      store.setLastIdleCodeChangeTimestamp(response.data.setLastIdleCodeChangeTimestamp);
      console.log('Agent state updated to', newState);
    })
    .catch(function (error) {
      console.error('Error updating agent state:', error);
    });
}

// Helper to show the task rejected popup.
function showTaskRejectedPopup(reason) {
  document.getElementById('task-rejected-reason').textContent = 'Reason: ' + (reason || 'No reason provided');
  popupContainer.style.display = 'block';
}
