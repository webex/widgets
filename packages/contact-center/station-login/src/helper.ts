import {useEffect} from "react";
import {StationLoginSuccess, StationLogoutSucces} from '@webex/plugin-cc';
import {UseStationLoginProps} from "./station-login/station-login.types";

export const useStationLogin = (props: UseStationLoginProps) => {
  const webex = props.webex;
  const teams = props.teams;
  const loginOptions = props.loginOptions;
  let loginSuccess: StationLoginSuccess;
  let loginFailure: Error;
  let deviceType: string;
  let team: string

  useEffect(() => {
    const teamsDropdown = document.getElementById('teamsDropdown') as HTMLSelectElement;
    const agentLogin = document.querySelector('#LoginOption') as HTMLSelectElement;
    const dialNumber = document.querySelector('#dialNumber') as HTMLInputElement;
    if (teamsDropdown) {
      teamsDropdown.innerHTML = '';
      teams.forEach((team) => {
        const option = document.createElement('option');
        option.value = team.id;
        option.text = team.name;
        teamsDropdown.add(option);
      });
      team = teamsDropdown.value;
      dialNumber.value = '';
      dialNumber.disabled = true;
    }
    if(loginOptions.length > 0) {
      loginOptions.forEach((options)=> {
        const option = document.createElement('option');
        option.text = options;
        option.value = options;
        agentLogin.add(option);
      });
    }
  }, [teams, loginOptions]);

  const selectLoginOption = (event: { target: { value: string; }; }) => {
    const dialNumber = document.querySelector('#dialNumber') as HTMLInputElement;
    const value = event.target.value;
    deviceType = value;
    if (deviceType === 'AGENT_DN' || deviceType === 'EXTENSION') {
      dialNumber.disabled = false;
    } else {
      dialNumber.disabled = true;
    }
  };

  const login = () => {
    const dialNumber = document.querySelector('#dialNumber') as HTMLInputElement;
    webex.cc.stationLogin({teamId: team, loginOption: deviceType, dialNumber: dialNumber.value})
      .then((res: StationLoginSuccess) => {
        console.log('Successful Agent login: ', res);

      }).catch((error: any) => {
        console.log(error);
        loginFailure = error;
      });
  };

  const logout = () => {
    webex.cc.stationLogout({logoutReason: 'User requested logout'})
      .then((res: StationLogoutSucces) => {
        console.log('Successful Agent logout: ', res);
        loginSuccess = res;
      }).catch((error: any) => {
        console.log(error);
      });
  };

  return {name: 'StationLogin', selectLoginOption, login, logout, loginSuccess, loginFailure};
};

