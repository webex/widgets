import React from 'react';
import { TaskListPresentationalProps } from '../task.types';
import { Box, Typography, IconButton } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';

const TaskListPresentational: React.FunctionComponent<TaskListPresentationalProps> = (props) => {
  const { currentTask, taskList, acceptTask, declineTask, isBrowser } = props;

  if (taskList.length <= 0) {
    return null; // hidden component
  }

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 3 }}>
      {taskList.map((task, index) => {
        const callAssociationDetails = task.data.interaction.callAssociatedDetails;
        const { ani, /* dn, */ virtualTeamName } = callAssociationDetails;

        return (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {ani}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {virtualTeamName}
                </Typography>
              </Box>
            </Box>
            {!currentTask && (
              <Box>
                {isBrowser ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton color="success" onClick={() => acceptTask(task)}>
                      <CallIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => declineTask(task)}>
                      <CallEndIcon />
                    </IconButton>
                  </Box>
                ) : null}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default TaskListPresentational;
