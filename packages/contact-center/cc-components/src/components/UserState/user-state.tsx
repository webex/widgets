import React, { useEffect, useState } from 'react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ArrowDropDownOutlinedIcon from '@mui/icons-material/ArrowDropDownOutlined';
import { IUserState } from './user-state.types';
import { formatTime } from '../../utils';
import './user-state.scss';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        },
        input: {
          padding: 0, // Remove padding
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          border: 'none',
          boxShadow: 'none',
          padding: '6px', // Adjust padding to be minimal
          '&:focus': {
            outline: 'none',
            backgroundColor: 'transparent',
          },
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        },
        input: {
          padding: 0, // Remove padding
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          border: 'none',
          boxShadow: 'none',
          padding: '6px', // Adjust padding to be minimal
          '&:focus': {
            outline: 'none',
            backgroundColor: 'transparent',
          },
        },
      },
    },
  },
});

const UserStateComponent: React.FunctionComponent<Omit<IUserState, "setCurrentState"> & { currentTheme: 'DARK' | 'LIGHT' }> = (props) => {
  const { idleCodes, setAgentStatus, isSettingAgentStatus, errorMessage, elapsedTime, currentState, currentTheme, customState } = props;
  const [selectedState, setSelectedState] = useState({id: currentState, name: null, developerName: null});

  useEffect(() => {
    if (customState?.developerName) {
      setSelectedState(customState);
    }
    else {
      setSelectedState({ id: currentState, name: null, developerName: null });
    }
  }, [idleCodes, currentState, customState, setAgentStatus]);

  const selectStyles = {
    backgroundColor: 'white',
    borderRadius: '50px',
    color: 'black',
  };

  const getIcon = (name, iconColor='gray') => {
    if (name === 'Available') {
      return <CheckCircleOutlineIcon style={{ color: 'green' }} />;
    } else {
      return <RemoveCircleOutlineIcon style={{ color: iconColor }} />;
    }
  };

  const theme = currentTheme === 'DARK' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <FormControl fullWidth disabled={isSettingAgentStatus || customState?.developerName === 'WRAUPUP'} className="formControl" style={selectStyles}>
        <Select
          id="idleCodes"
          value={customState?.developerName || selectedState?.id}
          onChange={(event) => {
            setAgentStatus(event.target.value);
          }}
          renderValue={(selected) => {
            const selectedCode = idleCodes?.find(code => code.id === selected) || (customState?.developerName === selected ? selectedState : null);
            return (
              <div className="selectedValueContainer">
                {getIcon(selectedCode?.name, selectedCode?.iconColor)}
                <span style={{ marginLeft: '8px' }}>{selectedCode ? selectedCode.name : ''}</span>
                <span className="timer">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            );
          }}
          IconComponent={() => <ArrowDropDownOutlinedIcon />}
        >
          {
            customState?.developerName && (
              <MenuItem style={{display: 'none'}} key={customState?.developerName} value={customState?.developerName} hidden>{customState.name}</MenuItem>
            )
          }
          {idleCodes?.filter(code => !code.isSystem).map((code) => (
            <MenuItem key={code.id} value={code.id}>
              {getIcon(code.name)}
              <span style={{ marginLeft: '8px' }}>{code.name}</span>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {errorMessage && (
        <Alert severity="error" className="alert">
          {errorMessage}
        </Alert>
      )}
    </ThemeProvider>
  );
};

export default UserStateComponent;
