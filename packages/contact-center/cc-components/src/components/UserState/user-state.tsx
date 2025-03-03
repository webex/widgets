import React from 'react';

import {IUserState} from './user-state.types';
import {formatTime} from '../../utils';
import {Icon} from '@momentum-design/components/dist/react';

import {ButtonPill} from '@momentum-ui/react-collaboration';

import './user-state.scss';

const UserStateComponent: React.FunctionComponent<IUserState> = (props) => {
  const {
    idleCodes,
    setAgentStatus,
    isSettingAgentStatus,
    errorMessage,
    elapsedTime,
    currentState,
    currentTheme,
    customState,
  } = props;

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
            value={customState?.developerName || currentState}
            className="select"
            onChange={(event) => {
              setAgentStatus(event.target.value);
            }}
            disabled={isSettingAgentStatus}
          >
            {customState && (
              <option value={customState.developerName} hidden>
                {customState.name}
              </option>
            )}
            {idleCodes.map((code) => {
              return (
                <option key={code.id} value={code.id} hidden={code.name === 'RONA'}>
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
