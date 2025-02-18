/* eslint-disable prettier/prettier */
const accessTokenElem = document.getElementById('access_token_elem');
const themeElem = document.getElementById('theme');
const widgetsContainer = document.getElementById('widgets-container');

const ccStationLogin = document.createElement('widget-cc-station-login');
const ccUserState = document.createElement('widget-cc-user-state');
const ccIncomingTask = document.createElement('widget-cc-incoming-task');
const ccTaskList = document.createElement('widget-cc-task-list');
const ccCallControl = document.createElement('widget-cc-call-control');

const themeProviderElem = document.getElementById('theme-provider-elem');

const stationLoginCheckbox = document.getElementById('stationLoginCheckbox');
const userStateCheckbox = document.getElementById('userStateCheckbox');
const incomingTaskCheckbox = document.getElementById('incomingTaskCheckbox');
const taskListCheckbox = document.getElementById('taskListCheckbox');
const callControlCheckbox = document.getElementById('callControlCheckbox');

let isMultiLoginEnabled = false;
const popupContainer = document.getElementById('popup-container');

themeElem.addEventListener('change', () => {
  store.setCurrentTheme(themeElem.checked ? 'DARK' : 'LIGHT');
  themeProviderElem.setAttribute(
    'themeclass',
    themeElem.checked ? 'mds-theme-stable-darkWebex' : 'mds-theme-stable-lightWebex'
  );
});

store.onTaskRejected = function(reason) {
  showTaskRejectedPopup(reason);
};

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

// Helper to change the agent state, using "Available" as is or "Meeting" for lookup if not.
function changeAgentState(newState) {
  const chosenState = newState === 'Available' ? 'Available' : 'Idle';
  const lookupCodeName = newState === 'Available' ? 'Available' : 'Meeting';
  const idleCode =
    store.idleCodes &&
    store.idleCodes.find(function(code) {
      return code.name === lookupCodeName;
    });
  if (!idleCode) {
    console.error('No idle code found for selected state:', newState);
    return;
  }
  const agentId = store.agentId || '';
  store.cc
    .setAgentState({
      state: chosenState,
      auxCodeId: idleCode.id,
      agentId: agentId,
      lastStateChangeReason: newState,
    })
    .then(function(response) {
      store.setCurrentState(response.data.auxCodeId);
      store.setLastStateChangeTimestamp(new Date(response.data.lastStateChangeTimestamp));
      console.log('Agent state updated to', chosenState);
    })
    .catch(function(error) {
      console.error('Error updating agent state:', error);
    });
}

// Helper to show the task rejected popup.
function showTaskRejectedPopup(reason) {
  popupContainer.innerHTML = `
      <div id="task-rejected-popup">
        <h2>Task Rejected</h2>
        <p>Reason: ${reason || 'No reason provided'}</p>
        <select id="state-select">
          <option value="">Select a state</option>
          <option value="Available">Available</option>
          <option value="Busy">Busy</option>
          <option value="On Break">On Break</option>
        </select>
        <button id="submit-button">Submit</button>
      </div>
    `;
  popupContainer.style.display = 'block';

  document.getElementById('submit-button').addEventListener('click', function() {
    var selectedState = document.getElementById('state-select').value;
    if (selectedState) {
      changeAgentState(selectedState);
    }
    popupContainer.style.display = 'none';
    popupContainer.innerHTML = '';
  });
}