import React, {useEffect, useState, ChangeEvent} from 'react';
import {WrapupCodes} from '@webex/cc-store';

import {CallControlPresentationalProps} from '../task.types';
import './call-control.styles.scss';
import { Box, IconButton, TextField, MenuItem } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

function CallControlPresentational(props: CallControlPresentationalProps) {
  const [isHeld, setIsHeld] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);

  const { currentTask, audioRef, toggleHold, toggleRecording, endCall, wrapupCall, wrapupCodes, wrapupRequired } = props;

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

  const handleWrapupChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const selectedOption = wrapupCodes.find((wrapup) => wrapup.id === value);
    if (selectedOption) {
      setSelectedWrapupReason(selectedOption.name);
      setSelectedWrapupId(value);
    }
  };

  return (
    <>
      <audio ref={audioRef} id="remote-audio" autoPlay></audio>
      {currentTask && (
        <Box sx={{ p: 2 }}>
          {!wrapupRequired && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {
                !isHeld && (<IconButton
                    onClick={endCall}
                    sx={{
                      width: 56,
                      height: 40,
                      backgroundColor: '#D3381C',
                      color: 'white',
                      borderRadius: 1,
                      boxShadow: 1,
                      ':hover': {
                        backgroundColor: '#B03018',
                      },
                    }}
                  >
                    <CallEndIcon />
                  </IconButton>
                )
              }
              <IconButton
                onClick={handletoggleHold}
                sx={{
                  width: 56,
                  height: 40,
                  backgroundColor: '#EDEDED',
                  color: 'black',
                  borderRadius: 1,
                  boxShadow: 1,
                  ':hover': {
                    backgroundColor: '#D3D3D3',
                  },
                }}
              >
                {isHeld ? <PlayArrowIcon /> : <PauseIcon />}
              </IconButton>
              <IconButton
                onClick={handletoggleRecording}
                sx={{
                  width: 56,
                  height: 40,
                  backgroundColor: '#EDEDED',
                  color: isRecording ? 'red' : 'black',
                  borderRadius: 1,
                  boxShadow: 1,
                  ':hover': {
                    backgroundColor: '#D3D3D3',
                  },
                }}
              >
                <FiberManualRecordIcon />
              </IconButton>
            </Box>
          )}
          {wrapupRequired && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                select
                label="Wrap-Up Reason"
                variant="standard"
                value={selectedWrapupId || ''}
                onChange={handleWrapupChange}
                fullWidth
                sx={{
                  color: 'black',
                  height: 40,
                }}
              >
                {wrapupCodes.map((wrapup: WrapupCodes) => (
                  <MenuItem key={wrapup.id} value={wrapup.id}>
                    {wrapup.name}
                  </MenuItem>
                ))}
              </TextField>
              <IconButton
                onClick={handleWrapupCall}
                disabled={!selectedWrapupReason}
                sx={{
                  width: 40, // Square shape
                  height: 40,
                  backgroundColor: '#227AA3',
                  color: 'white',
                  borderRadius: '4px',
                  boxShadow: 1,
                  ':hover': {
                    backgroundColor: '#1E698F',
                    cursor: !selectedWrapupReason ? 'not-allowed' : 'pointer',
                    color: !selectedWrapupReason ? 'gray' : 'white', // Show disabled icon color
                  },
                  ...(selectedWrapupReason === null && {
                    backgroundColor: '#227AA3', // Keep the background color
                    color: 'white',
                  }),
                }}
              >
                <CheckCircleOutlineIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      )}
    </>
  );
}

export default CallControlPresentational;
