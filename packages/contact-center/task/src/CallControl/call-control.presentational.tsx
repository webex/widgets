import React, {useState} from 'react';
import './call-control.styles.scss';
import {CallControlPresentationalProps} from '../task.types';

const CallControlPresentational = (props: CallControlPresentationalProps) => {
  const [isHeld, setIsHeld] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(true);
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);

  const {currentTask, holdResume, pauseResumeRecording, endCall, wrapupCall, wrapupCodes, wrapupRequired} = props;
  const handleHoldResume = () => {
    if (isHeld) {
      holdResume(false);
    } else {
      holdResume(true);
    }
    setIsHeld(!isHeld);
  };

  const handlePauseResumeRecording = () => {
    if (isRecordingPaused) {
      pauseResumeRecording(true);
    } else {
      pauseResumeRecording(false);
    }
    setIsRecordingPaused(!isRecordingPaused);
  };

  const handleEndCall = () => {
    endCall();
  };

  const handleWrapupCall = () => {
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
                  <button className="btn" onClick={handleHoldResume} disabled={wrapupRequired}>
                    {isHeld ? 'Resume' : 'Hold'}
                  </button>
                  <button className="btn" onClick={handlePauseResumeRecording} disabled={wrapupRequired}>
                    {isRecordingPaused ? 'Resume Recording' : 'Pause Recording'}
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
                    {wrapupCodes.map((wrapup: any) => (
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
