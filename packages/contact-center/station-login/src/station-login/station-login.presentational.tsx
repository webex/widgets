import React, {useEffect, useRef} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import {Select, MenuItem, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, SelectChangeEvent, Box, Typography, FormControl, InputLabel, Checkbox, FormControlLabel} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './station-login.style.scss';
import {MULTIPLE_SIGN_IN_ALERT_MESSAGE, MULTIPLE_SIGN_IN_ALERT_TITLE} from './constants';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
    },
  },
  components: {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: 'black',
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        text: {
          color: 'black',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: {
          '&:before': {
            borderBottomColor: 'black',
          },
          '&:after': {
            borderBottomColor: 'black',
          },
          '&:hover:not(.Mui-disabled):before': {
            borderBottomColor: 'rgba(0, 0, 0, 0.7)',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'black',
          '&.Mui-focused': {
            color: 'black',
          },
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          color: 'black',
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffffff',
    },
  },
  components: {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: 'white',
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        text: {
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: {
          '&:before': {
            borderBottomColor: 'white',
          },
          '&:after': {
            borderBottomColor: 'white',
          },
          '&:hover:not(.Mui-disabled):before': {
            borderBottomColor: 'rgba(255, 255, 255, 0.7)',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'white',
          '&.Mui-focused': {
            color: 'white',
          },
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          color: 'white',
        },
      },
    },
  },
});

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps & { currentTheme: 'LIGHT' | 'DARK'}> = ({
  name,
  teams,
  loginOptions,
  login,
  logout,
  relogin,
  setDeviceType,
  setDialNumber,
  setTeam,
  isAgentLoggedIn,
  deviceType,
  showMultipleLoginAlert,
  handleContinue,
  currentTheme,
  isReadOnly,
  dialNumber,
  agentName,
}) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (teams.length > 0) {
      setTeam(teams[0].id);
    }
  }, [teams, setTeam]);

  useEffect(() => {
    if (loginOptions.includes('BROWSER') && !deviceType) {
      setDeviceType('BROWSER');
    } else if (loginOptions.length > 0 && !deviceType) {
      setDeviceType(loginOptions[0]);
    }
  }, [loginOptions, setDeviceType, deviceType]);

  useEffect(() => {
    if (showMultipleLoginAlert) {
      handleContinue();
    }
  }, [showMultipleLoginAlert, handleContinue]);

  useEffect(() => {
    if (!isAgentLoggedIn) return;
    if (deviceType) {
      relogin();
    }
  }, [isAgentLoggedIn]);

  const handleSelectLoginOption = (event: SelectChangeEvent<string>) => {
    setDeviceType(event.target.value);
  };

  const handleDialNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDialNumber(event.target.value);
  };

  const getLoginOptionLabel = (option: string) => {
    switch (option) {
      case 'AGENT_DN':
        return 'Dial Number';
      case 'BROWSER':
        return 'Desktop';
      case 'EXTENSION':
        return 'Extension';
      default:
        return option;
    }
  };

  const theme = currentTheme === 'DARK' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ mt: 2 }}>
        <Dialog open={showMultipleLoginAlert} onClose={handleContinue}>
          <DialogTitle>{MULTIPLE_SIGN_IN_ALERT_TITLE}</DialogTitle>
          <DialogContent>
            <Typography>{MULTIPLE_SIGN_IN_ALERT_MESSAGE}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleContinue} color="primary">
              Continue
            </Button>
          </DialogActions>
        </Dialog>
        <Box sx={{ mt: 2 }}>
          {isReadOnly && (
            <>
              <InputLabel className="read-only-label">Agent Name</InputLabel>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {agentName}
              </Typography>
            </>
          )}

          {isReadOnly ? (
          <>
            <InputLabel className="read-only-label">Telephony Option</InputLabel>
            <Typography variant="body1" sx={{ mb: 2 }}>
            {getLoginOptionLabel(deviceType)}
            </Typography>
          </>
          ) : (
          <FormControl fullWidth variant="standard" sx={{ mb: 2 }}>
            <InputLabel>Telephony Option</InputLabel>
            <Select
            name="LoginOption"
            id="LoginOption"
            value={deviceType || ''}
            onChange={handleSelectLoginOption}
            fullWidth
            variant="standard"
            label="Agent Login"
            >
            {loginOptions.map((option) => (
              <MenuItem key={option} value={option}>
              {getLoginOptionLabel(option)}
              </MenuItem>
            ))}
            </Select>
          </FormControl>
          )}

          {(deviceType && deviceType !== 'BROWSER') && (
            isReadOnly ? (
            <>
                <InputLabel className="read-only-label">
                  {deviceType === 'EXTENSION' ? 'Extension' : 'Dial Number'}
                </InputLabel>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {dialNumber}
              </Typography>
            </>
            ) : (
              <TextField
                label={deviceType === 'EXTENSION' ? 'Extension' : 'Dial Number'}
                onChange={handleDialNumberChange}
                value={dialNumber}
                fullWidth
                variant="standard"
                sx={{ mb: 2 }}
              />
            )
          )}

          {isReadOnly ? (
            <>
              <InputLabel className="read-only-label">Team</InputLabel>
              <Typography variant="body1" sx={{ mb: 2 }}>
              {teams[0]?.name || ''}
              </Typography>
            </>
            ) : (
            <FormControl fullWidth variant="standard" sx={{ mb: 2 }}>
              <InputLabel>Team</InputLabel>
              <Select
              id="teamsDropdown"
              value={teams[0]?.id || ''}
              onChange={(e: SelectChangeEvent<string>) => setTeam(e.target.value)}
              fullWidth
              variant="standard"
              label="Select Team"
              >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                {team.name}
                </MenuItem>
              ))}
              </Select>
            </FormControl>
          )}
          
          {!isReadOnly && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    sx={{ color: '#227AA3', '&.Mui-checked': { color: '#227AA3' } }}
                    disabled={isReadOnly}
                  />
                }
                label="Remember my credentials"
                sx={{ mt: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                {isAgentLoggedIn ? (
                  <Button
                    onClick={logout}
                    variant="text"
                    sx={{
                      color: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: `rgba(${theme.palette.primary.main === '#000000' ? '0, 0, 0' : '255, 255, 255'}, 0.1)`,
                      },
                    }}
                  >
                    SIGN OUT
                  </Button>
                ) : (
                  <Button onClick={login} variant="text">
                    SIGN IN
                  </Button>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default StationLoginPresentational;
