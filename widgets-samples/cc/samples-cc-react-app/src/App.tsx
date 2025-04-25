import React, {useState, useEffect} from 'react';
import {
  StationLogin,
  UserState,
  IncomingTask,
  TaskList,
  CallControl,
  CallControlCAD,
  store,
  OutdialCall,
} from '@webex/cc-widgets';
import {ThemeProvider, IconProvider, Icon, Button, Checkbox, Text} from '@momentum-design/components/dist/react';
import {PopoverNext} from '@momentum-ui/react-collaboration';
import './App.scss';
import {observer} from 'mobx-react-lite';

// This is not to be included to a production app.
// Have added here for debugging purposes
window['store'] = store;
const defaultWidgets = {
  stationLogin: true,
  userState: true,
  incomingTask: true,
  taskList: true,
  callControl: true,
  callControlCAD: true,
  outdialCall: true,
};

function App() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState(() => {
    const savedWidgets = window.localStorage.getItem('selectedWidgets');
    return savedWidgets ? JSON.parse(savedWidgets) : defaultWidgets;
  });
  // Initialize accessToken from local storage if available
  const [accessToken, setAccessToken] = useState(() => window.localStorage.getItem('accessToken') || '');
  const [currentTheme, setCurrentTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem('currentTheme');
    return savedTheme ? savedTheme : store.currentTheme;
  });
  const [isMultiLoginEnabled, setIsMultiLoginEnabled] = useState(() => {
    const savedMultiLogin = window.localStorage.getItem('isMultiLoginEnabled');
    return savedMultiLogin === 'true';
  });
  const [showRejectedPopup, setShowRejectedPopup] = useState(false);
  const [rejectedReason, setRejectedReason] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const webexConfig = {
    fedramp: false,
    logger: {
      level: 'log',
    },
    cc: {
      allowMultiLogin: isMultiLoginEnabled,
    },
  };

  const onLogin = () => {
    setIsLoggedIn(true);
    console.log('Agent login has been succesful');
  };

  const onLogout = () => {
    setIsLoggedIn(false);
    console.log('Agent logout has been succesful');
  };

  const onAccepted = () => {
    console.log('onAccepted Invoked');
  };

  const onDeclined = () => {
    console.log('onDeclined invoked');
  };

  const onTaskAccepted = (task) => {
    console.log('onTaskAccepted invoked for task:', task);
  };

  const onTaskDeclined = (task) => {
    console.log('onTaskDeclined invoked for task:', task);
  };

  const onHoldResume = () => {
    console.log('onHoldResume invoked');
  };

  const onEnd = () => {
    console.log('onEnd invoked');
  };

  const onWrapUp = (params) => {
    console.log('onWrapup invoked', params);
  };

  const enableDisableMultiLogin = () => {
    if (isMultiLoginEnabled) {
      setIsMultiLoginEnabled(false);
    } else {
      setIsMultiLoginEnabled(true);
    }
  };

  const handleCheckboxChange = (e) => {
    const {name, checked} = e.target;
    setSelectedWidgets((prev) => ({...prev, [name]: checked}));
  };

  const changeAgentState = (newState: string) => {
    // In the idle codes, we need to search for the 'Idle' state with code name 'Meeting'.
    const lookupCodeName = newState === 'Available' ? 'Available' : 'Meeting';

    const idleCode = store.idleCodes?.find((code) => code.name === lookupCodeName);
    if (!idleCode) {
      console.error('No idle code found for selected state:', newState);
      return;
    }
    const agentId = store.agentId || '';
    store.cc
      .setAgentState({
        state: newState,
        auxCodeId: idleCode.id,
        agentId,
        lastStateChangeReason: newState,
      })
      .then((response) => {
        store.setCurrentState(response.data.auxCodeId);
        store.setLastStateChangeTimestamp(response.data.lastStateChangeTimestamp);
        store.setLastIdleCodeChangeTimestamp(response.data.lastIdleCodeChangeTimestamp);
        console.log('Agent state updated to', newState);
      })
      .catch((error) => {
        console.error('Error updating agent state:', error);
      });
  };

  const handlePopoverSubmit = () => {
    if (selectedState) {
      changeAgentState(selectedState);
    }
    setShowRejectedPopup(false);
    setSelectedState('');
  };

  // Store accessToken changes in local storage
  useEffect(() => {
    window.localStorage.setItem('accessToken', accessToken);
  }, [accessToken]);

  useEffect(() => {
    window.localStorage.setItem('selectedWidgets', JSON.stringify(selectedWidgets));
  }, [selectedWidgets]);

  useEffect(() => {
    window.localStorage.setItem('isMultiLoginEnabled', JSON.stringify(isMultiLoginEnabled));
  }, [isMultiLoginEnabled]);

  useEffect(() => {
    window.localStorage.setItem('currentTheme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    store.setTaskRejected((reason: string) => {
      setRejectedReason(reason);
      setShowRejectedPopup(true);
    });

    return () => {
      store.setTaskRejected(undefined);
    };
  }, []);

  const onStateChange = (status) => {
    console.log('onStateChange invoked', status);
  };

  return (
    <div className="app mds-typography">
      <ThemeProvider
        themeclass={currentTheme === 'LIGHT' ? 'mds-theme-stable-lightWebex' : 'mds-theme-stable-darkWebex'}
      >
        <IconProvider iconSet="momentum-icons">
          <div className="webexTheme">
            <h1>Contact Center widgets in a react app</h1>
            <div className="accessTokenTheme">
              <input
              type="text"
              placeholder="Enter your access token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              />
              <Checkbox
              checked={currentTheme === 'DARK'}
              aria-label="theme checkbox"
              id="theme-checkbox"
              value={currentTheme}
              label="Dark Theme"
              // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
              onchange={() => {
                setCurrentTheme(currentTheme === 'DARK' ? 'LIGHT' : 'DARK');
                store.setCurrentTheme(currentTheme === 'DARK' ? 'LIGHT' : 'DARK');
              }}
              />
            </div>
            <div className="box">
              <section className="section-box">
                <fieldset className="fieldset">
                  <legend className="legend-box">&nbsp;Select Widgets to Show&nbsp;</legend>
                  <div className="widget-checkboxes">
                    {Object.keys(defaultWidgets).map((widget) => (
                      <>
                        <label key={widget}>
                          <input
                            type="checkbox"
                            name={widget}
                            checked={selectedWidgets[widget]}
                            onChange={handleCheckboxChange}
                          />
                          &nbsp;
                          {widget.charAt(0).toUpperCase() + widget.slice(1).replace(/([A-Z])/g, ' $1')}&nbsp;
                          {widget === 'outdialCall' && (
                            <span style={{display: 'inline-flex', alignItems: 'center'}}>
                              <PopoverNext
                                trigger="mouseenter"
                                triggerComponent={<Icon name="info-badge-filled" />}
                                placement="auto-end"
                                closeButtonPlacement="top-left"
                                closeButtonProps={{'aria-label': 'Close'}}
                              >
                                <Text>
                                  <div
                                    style={{color: 'var(--mds-color-theme-text-error-normal)', marginBottom: '10px'}}
                                  >
                                    <strong>Note:</strong> When a number is dialed, the agent gets an incoming task to
                                    accept via an Extension, Dial Number, or Browser. It's recommended to have the
                                    incoming task/task list widget and call controls widget according to your needs.
                                  </div>
                                </Text>
                              </PopoverNext>
                            </span>
                          )}
                        </label>
                      </>
                    ))}
                  </div>
                </fieldset>
              </section>
            </div>
            <div className="box">
              <section className="section-box">
                <fieldset className="fieldset">
                  <legend className="legend-box">&nbsp;SDK Toggles&nbsp;</legend>
                  <label style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                    <input
                      type="checkbox"
                      id="multiLoginFlag"
                      name="multiLoginFlag"
                      onChange={enableDisableMultiLogin}
                      checked={isMultiLoginEnabled}
                    />{' '}
                    &nbsp; Enable Multi Login
                    <PopoverNext
                      trigger="mouseenter"
                      triggerComponent={<Icon name="info-badge-filled" />}
                      placement="auto-end"
                      closeButtonPlacement="top-left"
                      closeButtonProps={{'aria-label': 'Close'}}
                    >
                      <Text>
                        <div
                          className="warning-note"
                          style={{color: 'var(--mds-color-theme-text-error-normal)', marginBottom: '10px'}}
                        >
                          <strong>Note:</strong> The "Enable Multi Login" option must be set before initializing the
                          SDK. Changes to this setting after SDK initialization will not take effect. Please ensure you
                          configure this option before clicking the "Init Widgets" button.
                        </div>
                      </Text>
                    </PopoverNext>
                  </label>
                </fieldset>
              </section>
            </div>
            <br />
            <div>
              <Button
                disabled={accessToken.trim() === ''}
                onClick={() => {
                  store.init({webexConfig, access_token: accessToken}).then(() => {
                    setIsSdkReady(true);
                  });
                }}
              >
                Init Widgets
              </Button>
            </div>
            {isSdkReady && (
              <>
                <div className="station-login">
                  {selectedWidgets.stationLogin && <StationLogin onLogin={onLogin} onLogout={onLogout} />}
                </div>
                {(store.isAgentLoggedIn || isLoggedIn) && (
                  <>
                    {selectedWidgets.userState && (
                      <div className="box">
                        <section className="section-box">
                          <fieldset className="fieldset">
                            <legend className="legend-box">User State</legend>
                            <UserState onStateChange={onStateChange} />
                          </fieldset>
                        </section>
                      </div>
                    )}
                    {selectedWidgets.callControl && store.currentTask && (
                      <div className="box">
                        <section className="section-box">
                          <fieldset className="fieldset">
                            <legend className="legend-box">Call Control</legend>
                            <CallControl onHoldResume={onHoldResume} onEnd={onEnd} onWrapUp={onWrapUp} />
                          </fieldset>
                        </section>
                      </div>
                    )}
                    {selectedWidgets.callControlCAD && store.currentTask && (
                      <div className="box">
                        <section className="section-box">
                          <fieldset className="fieldset">
                            <legend className="legend-box">Call Control CAD</legend>
                            <CallControlCAD onHoldResume={onHoldResume} onEnd={onEnd} onWrapUp={onWrapUp} callControlClassName={"call-control-outer"} callControlConsultClassName={"call-control-consult-outer"} />
                          </fieldset>
                        </section>
                      </div>
                    )}
                    {selectedWidgets.incomingTask && <IncomingTask onAccepted={onAccepted} onDeclined={onDeclined} />}
                    {selectedWidgets.taskList && (
                      <TaskList onTaskAccepted={onTaskAccepted} onTaskDeclined={onTaskDeclined} />
                    )}
                    {selectedWidgets.outdialCall && <OutdialCall />}
                  </>
                )}
              </>
            )}
            {showRejectedPopup && (
              <div className="task-rejected-popup">
                <h2>Task Rejected</h2>
                <p>Reason: {rejectedReason}</p>
                <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                  <option value="">Select a state</option>
                  <option value="Available">Available</option>
                  <option value="Idle">Idle</option>
                </select>
                <Button onClick={handlePopoverSubmit} />
              </div>
            )}
          </div>
        </IconProvider>
      </ThemeProvider>
    </div>
  );
}

export default observer(App);
