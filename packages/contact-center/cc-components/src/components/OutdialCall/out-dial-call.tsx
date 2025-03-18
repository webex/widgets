import React, {useState} from 'react';
import {OutdialCallComponentProps} from './out-dial-call.types';
import './out-dial-call.styles.scss';

const OutdialCallComponent: React.FunctionComponent<OutdialCallComponentProps> = (props) => {
  const {startOutdial} = props;
  const [destination, setDestination] = useState('');

  const updateOutboundNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only valid input that is digits, #, *, and +
    const VALID_KEYPAD_CHARS = /[\d#*+]/g;
    const filteredValue = e.target.value.match(VALID_KEYPAD_CHARS)?.join('') || '';
    setDestination(filteredValue);
  };

  // Function to press a key on the outdial keypad.
  const pressKey = (value: string) => {
    setDestination((prev) => prev + value);
  };

  return (
    <div className="box">
      <section className="section-box">
        <fieldset className="fieldset">
          <legend className="legend-box">Outdial Call</legend>
          <div className="keypad">
            <input
              onChange={updateOutboundNumber}
              id="outBoundDialNumber"
              placeholder="Enter number to dial"
              value={destination}
            />
            <div className="keys">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                <div key={key} className="key" onClick={() => pressKey(key)}>
                  {key}
                </div>
              ))}
            </div>
            <button className="call-btn" onClick={() => startOutdial(destination)}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.45 2.33.69 3.58.69a1 1 0 011 1v3.5a1 1 0 01-1 1C10.29 21 3 13.71 3 4.5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.24 2.46.69 3.58a1 1 0 01-.27 1.11l-2.2 2.2z" />
              </svg>
            </button>
          </div>
        </fieldset>
      </section>
    </div>
  );
};

export default OutdialCallComponent;
