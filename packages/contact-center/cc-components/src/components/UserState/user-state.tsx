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
  const { idleCodes, setAgentStatus, isSettingAgentStatus, errorMessage, elapsedTime, currentState, currentTheme, customStatus } = props;
  const [selectedState, setSelectedState] = useState({id: currentState, name: null});

  useEffect(() => {
    if (customStatus && customStatus !== '') {
      switch (customStatus) {
        case 'RONA':
          setSelectedState({ id: 'custom1', name: 'RONA' });
          break;
        case 'WRAPUP':
          setSelectedState({ id: 'custom2', name: 'Wrap-Up' });
          break;
        case 'ENGAGED':
          setSelectedState({ id: 'custom3', name: 'Engaged' });
          break;
        default:
          setSelectedState(null);
      }
    }
    else {
      setSelectedState({ id: currentState, name: null });
    }
  }, [idleCodes, currentState, customStatus, setAgentStatus]);

  const selectStyles = {
    backgroundColor: selectedState?.id === 'custom1' ? '#E9C1BC' : 'white',
    borderRadius: '4px',
    padding: '0 8px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: selectedState?.id === 'custom1' ? 'red' : selectedState.id.startsWith('custom') ? 'orange' : 'black',
    cursor: isSettingAgentStatus || customStatus === 'WRAUPUP' ? 'not-allowed' : 'pointer',
  };

  const getIcon = (name) => {
    if (name === 'Available') {
      return <CheckCircleOutlineIcon style={{ color: 'green' }} />;
    } else if (name === 'RONA') {
      return <RemoveCircleOutlineIcon style={{ color: 'red' }} />;
    } else if (name === 'Wrap-Up' || name === 'Engaged') {
      return <RemoveCircleOutlineIcon style={{ color: 'orange' }} />;
    } else {
      return <RemoveCircleOutlineIcon style={{ color: 'gray' }} />;
    }
  };

  const theme = currentTheme === 'DARK' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <FormControl fullWidth disabled={isSettingAgentStatus || customStatus === 'WRAUPUP'} className="formControl" style={selectStyles}>
        <Select
          id="idleCodes"
          value={selectedState?.id || ''}
          onChange={(event) => {
            const code = idleCodes?.find(code => code.id === event.target.value);
            if (customStatus == "" && code) {
              setAgentStatus(code);
            }
            setSelectedState(code);
          }}
          renderValue={(selected) => {
            const selectedCode = idleCodes?.find(code => code.id === selected) || (selectedState?.id.startsWith('custom') ? selectedState : null);
            return (
              <div className="selectedValueContainer">
                {getIcon(selectedCode?.name)}
                <span style={{ marginLeft: '8px' }}>{selectedCode ? selectedCode.name : ''}</span>
                <span className="timer">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            );
          }}
          IconComponent={() => <ArrowDropDownOutlinedIcon />}
        >
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
