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
import Webex from 'webex/contact-center';
import {ThemeProvider, IconProvider, Icon, Button, Checkbox, Text, Select, Option} from '@momentum-design/components/dist/react';
import {PopoverNext} from '@momentum-ui/react-collaboration';
import './App.scss';
import {observer} from 'mobx-react-lite';
import EngageWidget from './EngageWidget';

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
window['AGENTX_SERVICE'] = {}; // Make it available in the window object for global access for engage widgets

function App() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState(() => {
    const savedWidgets = window.localStorage.getItem('selectedWidgets');
    return savedWidgets ? JSON.parse(savedWidgets) : defaultWidgets;
  });
  // Initialize accessToken from local storage if available
  const [accessToken, setAccessToken] = useState('');
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
  const [incomingTasks, setIncomingTasks] = useState([]);
  const [loginType, setLoginType] = useState('token');
  const [showAgentProfile, setShowAgentProfile] = useState(false);

  const [collapsedTasks, setCollapsedTasks] = React.useState([]);

  const onIncomingTaskCB = ({task}) => {
    console.log('Incoming task:', task);
    setIncomingTasks((prevTasks) => [...prevTasks, task]);
    playNotificationSound();
  };

  useEffect(() => {
    if (window.location.hash) {
      const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    
      const accessToken = urlParams.get('access_token');
      const expiresIn = urlParams.get('expires_in') ?? '0';
    
      if (accessToken) {
        window.localStorage.setItem('accessToken', accessToken);
        // @ts-expect-error: Browser accepts this
        window.localStorage.setItem('date', new Date().getTime() + parseInt(expiresIn, 10));
        setAccessToken(accessToken);
        // Clear the hash from the URL to remove the token from browser history
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );
      }
    }
    else {
      const storedDate = window.localStorage.getItem('date');
      if (storedDate && parseInt(storedDate, 10) > new Date().getTime()) {
        const storedAccessToken = window.localStorage.getItem('accessToken');
        if (storedAccessToken) {
          setAccessToken(storedAccessToken);
        }
      } else {
        window.localStorage.removeItem('accessToken');
      }
    }
  }
  , []);

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
    console.log('Agent login has been successful');
  };

  const onLogout = () => {
    setIsLoggedIn(false);
    console.log('Agent logout has been successful');
  };

  const onCCSignOut = () => {
    console.log('CC Sign out has been successful');
  };

  const onAccepted = ({task}) => {
    setIncomingTasks((prevTasks) => prevTasks.filter((t) => t.data.interactionId !== task.data.interactionId));
    console.log('onAccepted Invoked');
  };

  const onRejected = ({task}) => {
    setIncomingTasks((prevTasks) => prevTasks.filter((t) => t.data.interactionId !== task.data.interactionId));
    console.log('onRejected invoked');
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

  function playNotificationSound() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Use a waveform with richer harmonics, like 'triangle' or 'sawtooth'
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime); // High pitch for metal cling

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Set the volume and create a quick decay to simulate the metallic sound
    gain.gain.setValueAtTime(0.5, ctx.currentTime); // Start loud
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); // Quick decay

    osc.start();
    osc.stop(ctx.currentTime + 3); // Play for 0.3 seconds
  }

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

  const doOAuthLogin = () => {
    let redirectUri = `${window.location.protocol}//${window.location.host}`;

    if (window.location.pathname) {
      redirectUri += window.location.pathname;
    }

    // Reference: https://developer.webex-cx.com/documentation/integrations
    const ccMandatoryScopes = [
      "cjp:config_read",
      "cjp:config_write",
      "cjp:config",
      "cjp:user",
    ];

    const webRTCCallingScopes = [
      "spark:webrtc_calling",
      "spark:calls_read",
      "spark:calls_write",
      "spark:xsi"
    ];

    const additionalScopes = [
      "spark:kms", // to avoid token downscope to only spark:kms error on SDK init
    ];

    const requestedScopes = Array.from(
      new Set(
          ccMandatoryScopes
          .concat(webRTCCallingScopes)
          .concat(additionalScopes))
        ).join(' ');

    const webexConfig = {
      config: {
        "appName": "sdk-samples",
        "appPlatform": "testClient",
        "fedramp": false,
        "logger": {
          "level": "info"
        },
        "credentials": {
          "client_id": "C04ef08ffce356c3161bb66b15dbdd98d26b6c683c5ce1a1a89efad545fdadd74",
          "redirect_uri": redirectUri,
          "scope": requestedScopes,
        }
      }
    };

    const webex = Webex.init(webexConfig);

    webex.once('ready', () => {
      webex.authorization.initiateLogin();
    });
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

    store.setIncomingTaskCb(onIncomingTaskCB);

    return () => {
      store.setTaskRejected(undefined);
      store.setIncomingTaskCb(undefined);
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

            <div className="box">
              <section className="section-box">
                <fieldset className="fieldset">
                  <legend className="legend-box">&nbsp;Authentication&nbsp;</legend>
                  <Select
                    label="Select Login Method"
                    value={loginType}
                    onChange={(e: CustomEvent) => {
                      const selectedType = e.detail.value;
                      if(selectedType !== 'token' && selectedType !== 'oauth') return;
                      setLoginType(selectedType);
                    }}
                  >
                    <Option key={1} value="token">Access Token</Option>
                    <Option key={2} value="oauth">Login with Webex</Option>
                  </Select>
                
                  <div className="accessTokenTheme" style={{ marginTop: '15px' }}>
                    {loginType === 'token' && (
                      <div>
                        <span>Your access token: </span>
                        <input
                          type="text"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                        />
                      </div>
                    )}
                    {loginType === 'oauth' && (
                      <Button
                        onClick={doOAuthLogin}
                        variant="primary"
                      >
                        Login with Webex
                      </Button>
                    )}
                  </div>
                </fieldset>
              </section>
            </div>
            <br/>
            <div className="settings-container" style={{ display: 'flex', gap: '20px' }}>
              <div className="box" style={{ flex: 1 }}>
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
              
              <div className="box" style={{ flex: 1 }}>
                <section className="section-box">
                  <fieldset className="fieldset">
                    <legend className="legend-box">&nbsp;Sample App Toggles&nbsp;</legend>
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
                    <Checkbox
                      checked={showAgentProfile}
                      aria-label="theme checkbox"
                      id="theme-checkbox"
                      label="Show Agent Profile"
                      // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
                      onchange={() => {
                        setShowAgentProfile(!showAgentProfile);
                      }}
                    />
                  </fieldset>
                </section>
                <br/>
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
                {showAgentProfile && store.agentProfile && (
                  <>
                    <section className="section-box">
                      <fieldset className="fieldset" style={{padding: '0 10% 0 10%'}}>
                        <legend className="legend-box">&nbsp;Agent Profile&nbsp;</legend>
                        <label style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}></label>
                        <table style={{borderCollapse: 'collapse', width: '100%'}}>
                          <tbody>
                            <tr>
                              <td className="table-border">
                                <Text tagname={'span'} type="body-large-bold">
                                  Agent Name:
                                </Text>
                              </td>
                              <td className="table-border">{store.agentProfile.agentName}</td>
                            </tr>
                            <tr>
                              <td className="table-border">
                                <Text tagname={'span'} type="body-large-bold">
                                  Profile Type:
                                </Text>
                              </td>
                              <td className="table-border">{store.agentProfile.profileType}</td>
                            </tr>
                            <tr>
                              <td className="table-border">
                                <Text tagname={'span'} type="body-large-bold">
                                  Org ID:
                                </Text>
                              </td>
                              <td className="table-border">{store.agentProfile.orgId}</td>
                            </tr>
                            <tr>
                              <td className="table-border">
                                <Text tagname={'span'} type="body-large-bold">
                                  Handle call using:
                                </Text>
                              </td>
                              <td className="table-border">{store.agentProfile.deviceType}</td>
                            </tr>
                            <tr>
                              <td className="table-border">
                                <Text tagname={'span'} type="body-large-bold">
                                  Roles:
                                </Text>
                              </td>
                              <td className="table-border">{store.agentProfile.roles}</td>
                            </tr>
                            <tr>
                              <td className="table-border">
                                <Text tagname={'span'} type="body-large-bold">
                                  MM Profile:
                                </Text>
                              </td>
                              <td className="table-border">
                                <table style={{borderCollapse: 'collapse', width: '100%'}}>
                                  <tbody>
                                    {store.agentProfile.mmProfile &&
                                      Object.entries(store.agentProfile.mmProfile).map(([channel, count]) => (
                                        <tr key={channel}>
                                          <td className="table-border">
                                            {channel.charAt(0).toUpperCase() + channel.slice(1)}
                                          </td>
                                          <td className="table-border">{count}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </fieldset>
                    </section>
                  </>
                )}
                {selectedWidgets.stationLogin && (
                  <div className="box">
                    <section className="section-box">
                      <fieldset className="fieldset">
                        <legend className="legend-box">Station Login</legend>
                        <div className="station-login">
                          <StationLogin onLogin={onLogin} onLogout={onLogout} onCCSignOut={onCCSignOut} />
                        </div>
                      </fieldset>
                    </section>
                  </div>
                )}
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
                            <CallControlCAD
                              onHoldResume={onHoldResume}
                              onEnd={onEnd}
                              onWrapUp={onWrapUp}
                              callControlClassName={'call-control-outer'}
                              callControlConsultClassName={'call-control-consult-outer'}
                            />
                          </fieldset>
                        </section>
                      </div>
                    )}

                    {selectedWidgets.incomingTask && (
                      <>
                        <div className="incoming-tasks-container">
                          <section className="section-box">
                            {incomingTasks.map((task) => (
                              <div
                                key={task.data.interactionId}
                                className={`incoming-task ${collapsedTasks.includes(task.data.interactionId) ? 'collapsed' : ''}`}
                                onClick={() => {
                                  if (collapsedTasks.includes(task.data.interactionId)) {
                                    setCollapsedTasks((prev) => prev.filter((id) => id !== task.data.interactionId));
                                  }
                                }}
                              >
                                <>
                                  <button
                                    className="close-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIncomingTasks((prevTasks) =>
                                        prevTasks.filter((t) => t.data.interactionId !== task.data.interactionId)
                                      );
                                    }}
                                  >
                                    ×
                                  </button>
                                  <IncomingTask incomingTask={task} onAccepted={onAccepted} onRejected={onRejected} />
                                </>
                              </div>
                            ))}
                          </section>
                        </div>
                      </>
                    )}

                    {selectedWidgets.taskList && (
                      <div className="box">
                        <section className="section-box">
                          <fieldset className="fieldset">
                            <legend className="legend-box">Task List</legend>
                            <TaskList onTaskAccepted={onTaskAccepted} onTaskDeclined={onTaskDeclined} />
                          </fieldset>
                        </section>
                      </div>
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
                <Button onClick={handlePopoverSubmit} variant="primary">
                  Confirm State Change
                </Button>
              </div>
            )}

            {isSdkReady && (store.isAgentLoggedIn || isLoggedIn) && (
              <EngageWidget accessToken={accessToken} currentTheme={currentTheme} isSdkReady={isSdkReady} />
            )}
          </div>
        </IconProvider>
      </ThemeProvider>
    </div>
  );
}

export default observer(App);
