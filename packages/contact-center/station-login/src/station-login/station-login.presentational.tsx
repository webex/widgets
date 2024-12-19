import React, {useEffect} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import '@uuip/unified-ui-platform-common-components';

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {name, teams, loginOptions, login, logout, setDeviceType, setDialNumber, setTeam} = props;

  useEffect(() => {}, [teams, loginOptions]);

  const selectLoginOption = (event: {target: {value: string}}) => {
    const deviceType = event.target.value;
    setDeviceType(deviceType);
  };

  // The below is a dummy representation of the new CC Widget UI, the below required props can be extracted from the props object and passed to the uuip-cc-user-profile Web Component.

  return (
    <div>
      <h3>This is the new CC Widget UI</h3>
      <uuip-wc-user-profile
        getProfileDataTriggered={true}
        userRole={'agent'}
        preferenceRoleName={'agent'}
        isCallMonitoringEnabled={true}
        teams={JSON.stringify(['team1', 'team2', 'team3', 'team4', 'team5'])}
        defaultTeam={JSON.stringify({teamId: 123, teamName: 'team1'})}
        loginVoiceOptions={JSON.stringify(['AGENT_DN', 'EXTENSION', 'BROWSER'])}
        trackingId={'12345'}
        extensions={JSON.stringify(['12345'])}
        extensionErrorCases={JSON.stringify({isErrExtRegister: true, isExtAlreadyInUse: true})}
        defaultDn={'12345'}
        allowDefaultDnOverwrite={true}
      />
    </div>
  );
};

export default StationLoginPresentational;
