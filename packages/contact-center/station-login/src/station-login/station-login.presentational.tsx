import React, {useEffect, useRef, useState} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import '@uuip/unified-ui-platform-common-components';
import '@uuip/unified-ui-platform-sdk';

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {name, teams, loginOptions, logout, login} = props;

  // Below is the Representation of the new CC Widget UI, the below required props can be extracted from the props object and passed to the uuip-wc-user-station-login Web Component.

  const dialNumbers = [];
  const extensions = [];
  const roles = ['agent'];

  const [isModalOpen, setIsModalOpen] = useState(true);

  const formattedTeams = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
  }));

  const userStationLoginRef = useRef(null);

  useEffect(() => {
    const userStationLogin = userStationLoginRef.current;

    const handleConfirmClicked = (event) => {
      let dialNumber = '';
      if (event.detail.data.loginOption === 'AGENT_DN') {
        dialNumber = event.detail.data.dialNumber;
      } else if (event.detail.data.loginOption === 'EXTENSION') {
        dialNumber = event.detail.data.extensionNumber;
      }
      const loginOption = event.detail.data.loginOption;
      const teamId = event.detail.data.team.teamId;
      login(teamId, loginOption, dialNumber);
      setIsModalOpen(false);
    };

    const handleSignoutClicked = () => {
      console.log('User logged out');
      logout();
    };

    if (userStationLogin) {
      userStationLogin.addEventListener('signout-clicked', handleSignoutClicked);
      userStationLogin.addEventListener('confirm-clicked', handleConfirmClicked);
    }

    return () => {
      if (userStationLogin) {
        userStationLogin.removeEventListener('signout-clicked', handleSignoutClicked);
        userStationLogin.removeEventListener('confirm-clicked', handleConfirmClicked);
      }
    };
  }, [login, logout]);

  return (
    <div>
      <h3>This is the new CC {name} Widget UI</h3>
      {isModalOpen && (
        <uuip-wc-user-station-login
          ref={userStationLoginRef}
          isModalOpen={isModalOpen}
          userRoles={JSON.stringify(roles)}
          teams={JSON.stringify(formattedTeams)}
          defaultTeam={JSON.stringify(formattedTeams[0])}
          extensions={JSON.stringify(extensions)}
          dialNumbers={JSON.stringify(dialNumbers)}
          loginVoiceOptions={JSON.stringify(loginOptions)}
        ></uuip-wc-user-station-login>
      )}
    </div>
  );
};

export default StationLoginPresentational;
