import React from 'react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import { IUserState } from './user-state.types';
import { formatTime } from '../../utils';

import './user-state.scss';

const UserStateComponent: React.FunctionComponent<Omit<IUserState, "setCurrentState">> = (props) => {
  const { idleCodes, setAgentStatus, isSettingAgentStatus, errorMessage, elapsedTime, currentState, currentTheme } = props;

  return (
    <div className={`box ${currentTheme === 'DARK' ? 'dark-theme' : 'light-theme'}`}>
      <section className='sectionBox'>
        <fieldset className='fieldset'>
          <legend data-testid='user-state-title' className='legendBox'>Agent State</legend>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }} />
          
          <FormControl variant="outlined" fullWidth disabled={isSettingAgentStatus} className='formControl'>
            <InputLabel id="idleCodes-label">Idle Codes</InputLabel>
            <Select
              labelId="idleCodes-label"
              id="idleCodes"
              value={currentState?.id || ''}
              onChange={(event) => {
                const code = idleCodes?.find(code => code.id === event.target.value);
                setAgentStatus(code);
              }}
              label="Idle Codes"
            >
              {idleCodes?.filter(code => !code.isSystem).map((code) => (
                <MenuItem key={code.id} value={code.id}>
                  {code.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button style={{ color: currentTheme === 'DARK' ? 'white' : 'dark-grey' }}>
            Test Button
          </Button>
          <div className={`elapsedTime ${isSettingAgentStatus ? 'elapsedTime-disabled' : ''}`}>
            {formatTime(elapsedTime)}
          </div>
          {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
        </fieldset>
      </section>
    </div>
  );
};

export default UserStateComponent;