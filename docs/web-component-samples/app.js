const accessTokenElem = document.getElementById('access_token_elem');
const widgetsContainer = document.getElementById('widgets-container');
const ccStationLogin = document.getElementById('cc-station-login');
const ccUserState = document.createElement('widget-cc-user-state');

if (!ccStationLogin && !ccUserState) {
    console.error('Failed to find the required elements');
}

function switchButtonState(){
    const buttonElem = document.querySelector('button');
    buttonElem.disabled = accessTokenElem.value.trim() === '';
}

function initWidgets(){
    const webexConfig = {
        fedramp: false,
        logger: {
        level: 'log'
        },
    }
    store.init({
        webexConfig,
        access_token: accessTokenElem.value.trim()
    }).then(() => {
        ccStationLogin.onLogin = loginSuccess;
        ccStationLogin.onLogout = logoutSuccess;
        ccStationLogin.classList.remove('disabled');
    }).catch((error) => {
        console.error('Failed to initialize widgets:', error);
    });
}

function loginSuccess(){
    console.log('Agent login has been succesful');
    ccUserState.classList.remove('disabled');
    widgetsContainer.appendChild(ccUserState);
}

function logoutSuccess(){
    console.log('Agent logout has been succesful');
    ccUserState.classList.add('disabled');
}