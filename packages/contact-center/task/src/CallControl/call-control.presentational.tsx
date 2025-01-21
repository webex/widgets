import React, {useState} from 'react';
import './call-control.styles.scss';
import {CallControlPresentationalProps} from '../task.types';
import {WrapupCodes} from '@webex/cc-store';

const CallControlPresentational = (props: CallControlPresentationalProps) => {
  const [isHeld, setIsHeld] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);

  const {currentTask, toggleHold, toggleRecording, endCall, wrapupCall, wrapupCodes, wrapupRequired} = props;
  const handletoggleHold = () => {
    if (isHeld) {
      toggleHold(false);
    } else {
      toggleHold(true);
    }
    setIsHeld(!isHeld);
  };

  const handletoggleRecording = () => {
    if (isRecording) {
      toggleRecording(true);
    } else {
      toggleRecording(false);
    }
    setIsRecording(!isRecording);
  };

  const handleEndCall = () => {
    endCall();
  };

  const handleWrapupCall = () => {
    setSelectedWrapupReason('');
    if (selectedWrapupReason && selectedWrapupId) {
      wrapupCall(selectedWrapupReason, selectedWrapupId);
    }
  };

  const handleWrapupChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = event.target.options[event.target.selectedIndex];
    setSelectedWrapupReason(selectedOption.text);
    setSelectedWrapupId(selectedOption.value);
  };

  return (
    <>
      {currentTask && (
        <div className="box">
          <section className="section-box">
            <fieldset className="fieldset">
              <legend className="legend-box">Call Control</legend>
              <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <button className="btn" onClick={handletoggleHold} disabled={wrapupRequired}>
                    {isHeld ? 'Resume' : 'Hold'}
                  </button>
                  <button className="btn" onClick={handletoggleRecording} disabled={wrapupRequired}>
                    {isRecording ? 'Pause Recording' : 'Resume Recording'}
                  </button>
                  <button className="btn" onClick={handleEndCall} disabled={wrapupRequired}>
                    End
                  </button>
                </div>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                  <select className="select" onChange={handleWrapupChange} defaultValue="" disabled={!wrapupRequired}>
                    <option value="" disabled>
                      Select Wrap-up Reason
                    </option>
                    {wrapupCodes.map((wrapup: WrapupCodes) => (
                      <option key={wrapup.id} value={wrapup.id}>
                        {wrapup.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn"
                    onClick={handleWrapupCall}
                    disabled={!wrapupRequired && !selectedWrapupReason}
                  >
                    Wrap Up
                  </button>
                </div>
              </div>
            </fieldset>
          </section>
        </div>
      )}
    </>
  );
};

export default CallControlPresentational;
