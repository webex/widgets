import React, {CSSProperties, useMemo} from 'react';

import {IUserState} from './use-state.types';

const getStyles = (isSettingAgentStatus: boolean): Record<string, CSSProperties> => ({
  box: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },

  sectionBox: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px'
  },

  fieldset:  {
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px',
    marginBottom: '20px',
    position: 'relative'
  } as CSSProperties,

  legendBox: {
    fontWeight: 'bold',
    color: '#0052bf'
  },

  btn: {
    padding: '10px 20px',
    backgroundColor: '#0052bf',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    marginRight: '8px'
  },

  select: {
    width: '100%',
    padding: '8px',
    marginTop: '8px',
    marginBottom: '12px',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },

  input: {
    width: '97%',
    padding: '8px',
    marginTop: '8px',
    marginBottom: '12px',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },

  elapsedTime: {
    position: 'absolute',
    right: '30px',
    top: '25px',
    color: isSettingAgentStatus ? 'grey' : 'black'
  } as CSSProperties
});

const UserStatePresentational: React.FunctionComponent<IUserState> = (props) => {
  const {idleCodes,setAgentStatus,isSettingAgentStatus, errorMessage, elapsedTime, currentState} = props;

  const styles = useMemo(() => getStyles(isSettingAgentStatus), [isSettingAgentStatus]);

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div style={styles.box}>
        <section style={styles.sectionBox}>
          <fieldset style={styles.fieldset}>
            <legend data-testid='user-state-title' style={styles.legendBox}>Agent State</legend>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}></div>
            <select
              id="idleCodes"
              value={currentState.id}
              style={styles.select}
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
            <div style={styles.elapsedTime}>{formatTime(elapsedTime)}</div>
            {
              errorMessage && <div style={{color: 'red'}}>{errorMessage}</div>
            }
          </fieldset>
        </section>
      </div>
    </>
  );
};

export default UserStatePresentational;
