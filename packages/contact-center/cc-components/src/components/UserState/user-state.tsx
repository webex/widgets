import React from 'react';

import {IUserState} from './user-state.types';
import {formatTime} from '../../utils';
import {Icon} from '@momentum-design/components/dist/react';

import {ButtonPill} from '@momentum-ui/react-collaboration';

import './user-state.scss';

const UserStateComponent: React.FunctionComponent<IUserState> = (props) => {
  const {idleCodes, setAgentStatus, isSettingAgentStatus, errorMessage, elapsedTime, currentState, currentTheme} =
    props;

  return (
    <div className={`box ${currentTheme === 'DARK' ? 'dark-theme' : 'light-theme'}`}>
      <section className="sectionBox">
        <fieldset className="fieldset">
          <legend data-testid="user-state-title" className="legendBox">
            Agent State
          </legend>
          <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}} />
          <Icon name="handset-regular" />
          <select
            id="idleCodes"
            value={currentState}
            className="select"
            onChange={(event) => {
              const code = idleCodes?.filter((code) => code.id === event.target.value)[0];
              setAgentStatus(code);
            }}
            disabled={isSettingAgentStatus}
          >
            {idleCodes
              ?.filter((code) => !code.isSystem)
              .map((code) => {
                return (
                  <option key={code.id} value={code.id}>
                    {code.name}
                  </option>
                );
              })}
          </select>
          <ButtonPill type="button">Set state</ButtonPill>
          <div className={`elapsedTime ${isSettingAgentStatus ? 'elapsedTime-disabled' : ''}`}>
            {formatTime(elapsedTime)}
          </div>
          {errorMessage && <div style={{color: 'red'}}>{errorMessage}</div>}
        </fieldset>
      </section>
    </div>
  );
};

export default UserStateComponent;
