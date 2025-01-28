import React, {useState} from 'react';
import {WrapupCodes} from '@webex/cc-store';

import {CallControlPresentationalProps} from '../task.types';
import './call-control.styles.scss';

function CallControlPresentational(props: CallControlPresentationalProps) {
  const [isHeld, setIsHeld] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);

  const {currentTask, toggleHold, toggleRecording, endCall, wrapupCall, wrapupCodes, wrapupRequired} = props;
  if (!currentTask) return <> </>;

  const handletoggleHold = () => {
    toggleHold(!isHeld);
    setIsHeld(!isHeld);
  };

  const handletoggleRecording = () => {
    toggleRecording(isRecording);
    setIsRecording(!isRecording);
  };

  const handleWrapupCall = () => {
    if (selectedWrapupReason && selectedWrapupId) {
      wrapupCall(selectedWrapupReason, selectedWrapupId);
      setSelectedWrapupReason('');
    }
  };

  const handleWrapupChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const {text, value} = event.target.options[event.target.selectedIndex];
    setSelectedWrapupReason(text);
    setSelectedWrapupId(value);
  };

  return (
    <>
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
                <button className="btn" onClick={endCall} disabled={wrapupRequired}>
                  End
                </button>
              </div>
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                <select className="select" onChange={handleWrapupChange} disabled={!wrapupRequired}>
                  <option value="">Select the wrap-up reason</option>
                  {wrapupCodes.map((wrapup: WrapupCodes) => (
                    <option key={wrapup.id} value={wrapup.id}>
                      {wrapup.name}
                    </option>
                  ))}
                </select>
                <button className="btn" onClick={handleWrapupCall} disabled={!wrapupRequired && !selectedWrapupReason}>
                  Wrap Up
                </button>
              </div>
            </div>
          </fieldset>
        </section>
      </div>
    </>
  );
}

export default CallControlPresentational;
