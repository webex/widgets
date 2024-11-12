import { useEffect } from "react";

export const useStationLogin = (sdk: { webex: any; teamsList: any[]; loginVoiceOptions: any[]; }) => {
  const teamsDropdown = document.getElementById('teamsDropdown') as HTMLSelectElement;
  const agentLogin = document.querySelector('#LoginOption') as HTMLSelectElement;
  const agentLoginButton = document.querySelector('#AgentLogin') as HTMLButtonElement;
  const dialNumber: HTMLInputElement = document.querySelector('#dialNumber');

  const webex = sdk.webex;
  let deviceType: any;

  useEffect(() => {
    if (teamsDropdown) {
      teamsDropdown.innerHTML = '';
      sdk.teamsList.forEach((team) => {
        const option = document.createElement('option');
        option.value = team.id;
        option.text = team.name;
        teamsDropdown.add(option);
      });
    }
    if(sdk.loginVoiceOptions.length > 0) agentLoginButton.disabled = false;
      sdk.loginVoiceOptions.forEach((voiceOptions)=> {
        const option = document.createElement('option');
        option.text = voiceOptions;
        option.value = voiceOptions;
        agentLogin.add(option);
      });
      agentLogin.innerHTML = '<option value="" selected>Choose Agent Login ...</option>';
      dialNumber.value = '';
      dialNumber.disabled = true;
  }, [sdk.teamsList, sdk.loginVoiceOptions]);

  const selectLoginOption = (event: { target: { value: string; }; }) => {
    const value = event.target.value;
    deviceType = value
    if (value === 'AGENT_DN' || 'EXTENSION') {
      dialNumber.disabled = false;
    } else {
      dialNumber.disabled = true;
    }
  };

  const login = () => {
    webex.cc.stationLogin({teamId: teamsDropdown.value, loginOption: deviceType, dialNumber: dialNumber.value})
      .then((res) => {
        console.log('Successful Agent login: ', res);
      }).catch((error) => {
        console.log(error);
      });
  };

  return {name: 'StationLogin', selectLoginOption, login};
};


