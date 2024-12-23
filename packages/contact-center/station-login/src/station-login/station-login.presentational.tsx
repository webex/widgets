import React, {useEffect, useRef} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import '@uuip/unified-ui-platform-common-components';

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {name, teams, loginOptions, login, logout, setDeviceType, setDialNumber, setTeam} = props;
  console.log('props is', props);
  console.log('teams is', teams);
  console.log('loginOptions is', loginOptions);
  const userProfileRef = useRef(null);

  // useEffect(() => {
  //   console.log(props);
  // }, [loginOptions, props]);

  // const selectLoginOption = (event: {target: {value: string}}) => {
  //   const deviceType = event.target.value;
  //   setDeviceType(deviceType);
  // };

  // Below is a dummy representation of the new CC Widget UI, the below required props can be extracted from the props object and passed to the uuip-cc-user-profile Web Component.

  const isEmergencyNotificationEnabled = true;
  const isEmergencyNotificationAlreadyDisplayed = false;
  const dialNumbers = ['123456001', '123456002', '123456003', '123456004'];
  const extensions = ['201', '202', '203', '204'];
  const isCallMonitoringEnabled = false;
  const loginVoiceOptions = ['AGENT_DN', 'EXTENSION', 'BROWSER'];
  const preferenceRoleName = 'agent_supervisor';
  const roles = ['agent', 'supervisor'];
  const teams1 = [
    {teamId: '1', teamName: 'Team 1'},
    {teamId: '2', teamName: 'Team 2'},
  ];

  const [isModalOpen, setIsModalOpen] = React.useState(true);
  const [isSubmitBusy, setIsSubmitBusy] = React.useState(false);

  return (
    <div>
      <h3>This is the new CC Widget UI</h3>
      <uuip-wc-user-station-login
        isModalOpen={isModalOpen}
        isRememberMeChecked={false}
        isSubmitBusy={isSubmitBusy}
        isDesktopEmergencyNotificationEnabled={isEmergencyNotificationEnabled}
        isEmergencyNotificationAlreadyDisplayed={isEmergencyNotificationAlreadyDisplayed}
        userRoles={roles}
        teams={teams}
        defaultTeam={teams[0]}
        extensions={extensions}
        isCallMonitoringEnabled={isCallMonitoringEnabled}
        dialNumbers={dialNumbers}
        defaultDialNumber={dialNumbers[0]}
        loginVoiceOptions={loginVoiceOptions}
        preferenceRoleName={preferenceRoleName}
        signout-clicked={() => {
          setIsModalOpen(false);
          setIsSubmitBusy(false);
        }}
        confirm-clicked={(e) => setIsSubmitBusy(true)}
      ></uuip-wc-user-station-login>
    </div>
  );
};

export default StationLoginPresentational;
