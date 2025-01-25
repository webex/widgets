import React from 'react';

import {IUserState} from './user-state.types';

import './user-state.scss';

const UserStateComponent: React.FunctionComponent<IUserState> = (props) => {
  const {idleCodes,setAgentStatus,isSettingAgentStatus, errorMessage, elapsedTime, currentState, currentTheme} = props;

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className={`box ${currentTheme === 'DARK' ? 'dark-theme' : 'light-theme'}`}>
        <section className='sectionBox'>
          <fieldset className='fieldset'>
            <legend data-testid='user-state-title' className='legendBox'>Agent State</legend>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }} />
            <select
              id="idleCodes"
              value={currentState.id}
              className='select'
              onChange={
                (event) => {
                  const code = idleCodes?.filter(code => code.id === event.target.value)[0];
                  setAgentStatus(code);
                }
              }
              disabled={isSettingAgentStatus}
            >
              {idleCodes?.filter(code => !code.isSystem).map((code) => {
                return (
                  <option
                    key={code.id}
                    value={code.id}
                  >
                      {code.name}
                  </option>
                );
            })}
            </select>
            {/* @ts-ignore */}
            <md-button color={`${currentTheme === 'DARK' ? 'white' : 'dark-grey'}`}>Test Button</md-button>
            <div className={`elapsedTime ${isSettingAgentStatus ? 'elapsedTime-disabled' : ''}`}>{formatTime(elapsedTime)}</div>
            {
              errorMessage && <div style={{color: 'red'}}>{errorMessage}</div>
            }
          </fieldset>
        </section>
      </div>
    </>
  );
};

export default UserStateComponent;
