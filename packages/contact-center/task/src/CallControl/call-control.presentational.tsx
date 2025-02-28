import React, {useEffect, useState} from 'react';
import {WrapupCodes} from '@webex/cc-store';

import {CallControlPresentationalProps} from '../task.types';
import './call-control.styles.scss';
import {ButtonPill} from '@momentum-ui/react-collaboration';

function CallControlPresentational(props: CallControlPresentationalProps) {
  const [isHeld, setIsHeld] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);

  const {currentTask, audioRef, toggleHold, toggleRecording, endCall, wrapupCall, wrapupCodes, wrapupRequired} = props;

  useEffect(() => {
    if (!currentTask || !currentTask.data || !currentTask.data.interaction) return;

    const {interaction, mediaResourceId} = currentTask.data;
    const {media, callProcessingDetails} = interaction;
    const isHold = media && media[mediaResourceId] && media[mediaResourceId].isHold;
    setIsHeld(isHold);

    if (callProcessingDetails) {
      const {isPaused} = callProcessingDetails;
      setIsRecording(!isPaused);
    }
  }, [currentTask]);

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
      setSelectedWrapupReason(null);
      setSelectedWrapupId(null);
    }
  };

  const handleWrapupChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const {text, value} = event.target.options[event.target.selectedIndex];
    setSelectedWrapupReason(text);
    setSelectedWrapupId(value);
  };

  return (
    <>
      <audio ref={audioRef} id="remote-audio" autoPlay></audio>
      {currentTask && (
        <div className="box">
          <section className="section-box">
            <fieldset className="fieldset">
              <legend className="legend-box">Call Control</legend>
              <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <ButtonPill onPress={handletoggleHold} disabled={wrapupRequired} color={isHeld ? 'join' : 'cancel'}>
                    {isHeld ? 'Resume' : 'Hold'}
                  </ButtonPill>
                  <ButtonPill onPress={handletoggleRecording} disabled={wrapupRequired}>
                    {isRecording ? 'Pause Recording' : 'Resume Recording'}
                  </ButtonPill>
                  <ButtonPill onPress={endCall} disabled={wrapupRequired || isHeld}>
                    End
                  </ButtonPill>
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
                  <ButtonPill onPress={handleWrapupCall} disabled={!wrapupRequired && !selectedWrapupReason}>
                    Wrap Up
                  </ButtonPill>
                </div>
              </div>
            </fieldset>
          </section>
        </div>
      )}
    </>
  );
}

export default CallControlPresentational;
