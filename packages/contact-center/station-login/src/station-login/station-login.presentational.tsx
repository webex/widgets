import {StationLoginPresentationalProps} from './station-login.types';
import React, {useState} from 'react';
import './station-login.style.scss';
import {Input, Checkbox, Select, ButtonCircle, Icon} from '@momentum-ui/react-collaboration';

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {name, teams, loginOptions, login, logout} = props;
  const [handleCallsUsing, setHandleCallsUsing] = useState('Dial Number');
  const [dialNumber, setDialNumber] = useState('987654321');
  const [team, setTeam] = useState('Debit card');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    alert('Login Success! Preferences confirmed!');
  };

  const handleSignOut = () => {
    alert('Signed out!');
  };

  return (
    <div>
      <h3 style={{marginBottom: '16px'}}>Confirm your interaction preferences</h3>
      <p style={{marginBottom: '24px'}}>Check your details and confirm to save and continue.</p>

      {/* Handle calls using */}
      <div style={{marginBottom: '16px'}}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
          }}
        >
          <Icon name="phone" size={16} style={{marginRight: '8px'}} />
          Handle calls using
        </label>
        <Select
          defaultValue="Dial Number"
          onSelect={(e) => setHandleCallsUsing(e.value)}
          options={[
            {value: 'Dial Number', label: 'Dial Number'},
            {value: 'Softphone', label: 'Softphone'},
          ]}
        />
      </div>

      {/* Dial Number */}
      <div style={{marginBottom: '16px'}}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
          }}
        >
          <Icon name="dialpad" size={16} style={{marginRight: '8px'}} />
          Dial Number
        </label>
        <Input value={dialNumber} onChange={(e) => setDialNumber(e.target.value)} placeholder="Enter number" />
      </div>

      {/* Team */}
      <div style={{marginBottom: '16px'}}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
          }}
        >
          <Icon name="group" size={16} style={{marginRight: '8px'}} />
          Your team
        </label>
        <Select
          defaultValue="Debit card"
          onSelect={(e) => setTeam(e.value)}
          options={[
            {value: 'Debit card', label: 'Debit card'},
            {value: 'Credit card', label: 'Credit card'},
            {value: 'Support', label: 'Support'},
          ]}
        />
      </div>

      {/* Don't show this again */}
      <div style={{marginBottom: '24px'}}>
        <Checkbox
          label="Don't show this again"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
        />
      </div>

      {/* Buttons */}
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <ButtonCircle onPress={handleSignOut} type="submit">
          Sign out
        </ButtonCircle>
        <ButtonCircle onPress={handleConfirm} type="submit">
          Confirm
        </ButtonCircle>
      </div>
    </div>
  );
};

export default StationLoginPresentational;
