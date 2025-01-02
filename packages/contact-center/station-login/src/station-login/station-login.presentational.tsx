import React, {useEffect, useRef} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import '@uuip/unified-ui-platform-common-components';
import "@momentum-ui/web-components";
import "@uuip/unified-ui-platform-sdk";

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {name, teams, loginOptions, login, logout, setDeviceType, setDialNumber, setTeam} = props;
  console.log('props is', props);
  console.log('teams is', teams);
  console.log('loginOptions is', loginOptions);
  
  // Below is the Representation of the new CC Widget UI, the below required props can be extracted from the props object and passed to the uuip-wc-user-station-login Web Component.

  const dialNumbers = ["123456001", "123456002", "123456003", "123456004"];
  const extensions = ["201", "202", "203", "204"];
  const roles = ["agent"];

  // We also have this.
  const loginVoiceOptions = ["AGENT_DN", "EXTENSION", "BROWSER"];
 
  // We have this.
  const teams1 = [
    { teamId: "1", teamName: "Team 1" },
    { teamId: "2", teamName: "Team 2" }
  ];

  const userStationLoginRef = useRef(null);

  useEffect(() => {
    const userStationLogin = userStationLoginRef.current;
    console.log('userStationLogin is', userStationLogin);

    const handleSignoutClicked = () => {
      console.log("User logged out");
      logout();
    };

    const handleConfirmClicked = (event) => {
      console.log('event is', event);
      console.log("User logged in");
      login();
    };

    userStationLogin.addEventListener('signout-clicked', handleSignoutClicked);
    userStationLogin.addEventListener('confirm-clicked', handleConfirmClicked);

    return () => {
      console.log('inside cleanup');
      userStationLogin.removeEventListener('signout-clicked', handleSignoutClicked);
      userStationLogin.removeEventListener('confirm-clicked', handleConfirmClicked);
    };
  }, []);

  return (
    <div>
      <h3>This is the new CC Station Login Widget UI</h3>
          <uuip-wc-user-station-login
          ref={userStationLoginRef}
          isModalOpen={true}
          userRoles={JSON.stringify(roles)}
          teams={JSON.stringify(teams1)}
          defaultTeam={JSON.stringify(teams1[0])}
          extensions={JSON.stringify(extensions)}
          dialNumbers={JSON.stringify(dialNumbers)}
          loginVoiceOptions={JSON.stringify(loginVoiceOptions)}
        ></uuip-wc-user-station-login>
    </div>
  );
}

export default StationLoginPresentational;
