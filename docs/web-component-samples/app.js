const widgetsContainer = document.getElementById('widgets-container');
const accessTokenElem = document.getElementById('access_token_elem');
const ccStationLogin = document.getElementById('cc-station-login');

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
        widgetsContainer.classList.remove('disabled');
    }).catch((error) => {
        console.error('Failed to initialize widgets:', error);
    });
}

function loginSuccess(){
    console.log('Agent login has been succesful');
}

function logoutSuccess(){
    console.log('Agent logout has been succesful');
}