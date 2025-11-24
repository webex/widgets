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
import {StationLogoutResponse} from '@webex/contact-center';
import {ERROR_TRIGGERING_IDLE_CODES} from '@webex/cc-store';
import Webex from 'webex';
import {
  ThemeProvider,
  IconProvider,
  Icon,
  Button,
  Checkbox,
  Text,
  Select,
  Option,
} from '@momentum-design/components/dist/react';
import {PopoverNext} from '@momentum-ui/react-collaboration';
import './App.scss';
import {observer} from 'mobx-react-lite';
import EngageWidget from './EngageWidget';

// This is not to be included to a production app.
// Have added here for debugging purposes
window['store'] = store;
const defaultWidgets = {
  stationLogin: true,
  stationLoginProfile: false,
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
  const [showOutdialFailedModal, setShowOutdialFailedModal] = useState(false);
  const [outdialFailedReason, setOutdialFailedReason] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [incomingTasks, setIncomingTasks] = useState([]);
  const [loginType, setLoginType] = useState('token');
  const [showAgentProfile, setShowAgentProfile] = useState(false);
  const [doStationLogout, setDoStationLogout] = useState(true);

  const [collapsedTasks, setCollapsedTasks] = React.useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [toast, setToast] = useState<{type: 'success' | 'error'} | null>(null);
  const [integrationEnv, setintegrationEnv] = useState(() => {
    const savedintegrationEnv = window.localStorage.getItem('integrationEnv');
    return savedintegrationEnv === 'true';
  });
  const [conferenceEnabled, setConferenceEnabled] = useState(() => {
    const savedMultiPartyConferenceEnabled = window.localStorage.getItem('conferenceEnabled');
    return savedMultiPartyConferenceEnabled !== null ? savedMultiPartyConferenceEnabled === 'true' : true;
  });
  const [hideDesktopLogin, setHideDesktopLogin] = useState(() => {
    const savedHideDesktopLogin = window.localStorage.getItem('hideDesktopLogin');
    return savedHideDesktopLogin === 'true';
  });

  const handleSaveStart = () => {
    setShowLoader(true);
    setToast(null);
  };

  const handleSaveEnd = (isComplete: boolean) => {
    setShowLoader(false);
    if (isComplete) {
      setToast({type: 'success'});
    } else {
      setToast({type: 'error'});
    }
  };

  const onIncomingTaskCB = ({task}) => {
    console.log('Incoming task:', task);
    setIncomingTasks((prevTasks) => [...prevTasks, task]);
    playNotificationSound();
  };

  useEffect(() => {
    if (window.location.hash) {
      const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));

      const accessToken = urlParams.get('access_token');

      if (accessToken) {
        window.localStorage.setItem('accessToken', accessToken);
        setAccessToken(accessToken);
        // Clear the hash from the URL to remove the token from browser history
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    } else {
      const storedAccessToken = window.localStorage.getItem('accessToken');
      if (storedAccessToken) {
        setAccessToken(storedAccessToken);
      }
    }
  }, []);

  const webexConfig = {
    fedramp: false,
    logger: {
      level: 'log',
    },
    cc: {
      allowMultiLogin: isMultiLoginEnabled,
    },
    ...(integrationEnv && {
      services: {
        discovery: {
          u2c: 'https://u2c-intb.ciscospark.com/u2c/api/v1',
        },
      },
    }),
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
    window.location.reload();
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

  const onTaskDeclined = (task, reason) => {
    console.log('onTaskDeclined invoked for task:', task);
    setRejectedReason(reason);
    setShowRejectedPopup(true);
  };

  const onTaskSelected = ({task, isClicked}) => {
    console.log('onTaskSelected invoked for task:', task, 'isClicked:', isClicked);
    console.log(
      `onTaskSelected invoked for task with title : ${task?.data?.interaction?.callAssociatedDetails?.ani}, and mediaType : ${task?.data?.mediaType}`
    );
  };

  const onHoldResume = ({isHeld, task}) => {
    console.log('onHoldResume invoked', {isHeld, task});
  };

  const onRecordingToggle = ({isRecording, task}) => {
    console.log('onRecordingToggle invoked', {isRecording, task});
  };

  const onEnd = ({task}) => {
    console.log('onEnd invoked', {task});
  };

  const onWrapUp = (params) => {
    console.log('onWrapup invoked', params);
    //the below log is used by e2e tests
    if (params && params.wrapUpReason) console.log(`onWrapup invoked with reason : ${params.wrapUpReason}`);
  };

  const onToggleMute = ({isMuted, task}) => {
    console.log('onToggleMute invoked', {isMuted, task});
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
        if ('data' in response) {
          store.setCurrentState(response.data.auxCodeId);
          store.setLastStateChangeTimestamp(response.data.lastStateChangeTimestamp);
          store.setLastIdleCodeChangeTimestamp(response.data.lastIdleCodeChangeTimestamp);
          console.log('Agent state updated to', newState);
        }
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

  const handlePopoverClose = () => {
    setShowRejectedPopup(false);
    setSelectedState('');
  };

  const doOAuthLogin = () => {
    let redirectUri = `${window.location.protocol}//${window.location.host}`;

    if (window.location.pathname) {
      redirectUri += window.location.pathname;
    }

    // Reference: https://developer.webex-cx.com/documentation/integrations
    const ccMandatoryScopes = ['cjp:config_read', 'cjp:config_write', 'cjp:config', 'cjp:user'];

    const webRTCCallingScopes = ['spark:webrtc_calling', 'spark:calls_read', 'spark:calls_write', 'spark:xsi'];

    const additionalScopes = [
      'spark:kms', // to avoid token downscope to only spark:kms error on SDK init
    ];

    const requestedScopes = Array.from(
      new Set(ccMandatoryScopes.concat(webRTCCallingScopes).concat(additionalScopes))
    ).join(' ');

    const webexConfig = {
      config: {
        appName: 'sdk-samples',
        appPlatform: 'testClient',
        fedramp: false,
        logger: {
          level: 'info',
        },
        credentials: {
          ...(integrationEnv && {authorizeUrl: 'https://idbrokerbts.webex.com/idb/oauth2/v1/authorize'}),
          client_id: integrationEnv
            ? 'Cd0dd53db1f470a5a9941e5eee31575bd0889d7006e3a80a1443ad12a42049da1'
            : 'C04ef08ffce356c3161bb66b15dbdd98d26b6c683c5ce1a1a89efad545fdadd74',
          redirect_uri: redirectUri,
          scope: requestedScopes,
        },
      },
    };

    const webex = Webex.init(webexConfig);

    webex.once('ready', () => {
      webex.authorization.initiateLogin();
    });
  };

  // Store accessToken changes in local storage
  useEffect(() => {
    if (accessToken.trim() !== '') {
      window.localStorage.setItem('accessToken', accessToken);
    }
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
    window.localStorage.setItem('integrationEnv', JSON.stringify(integrationEnv));
  }, [integrationEnv]);
  useEffect(() => {
    window.localStorage.setItem('conferenceEnabled', JSON.stringify(conferenceEnabled));
  }, [conferenceEnabled]);
  useEffect(() => {
    window.localStorage.setItem('hideDesktopLogin', JSON.stringify(hideDesktopLogin));
  }, [hideDesktopLogin]);

  useEffect(() => {
    store.setIncomingTaskCb(onIncomingTaskCB);
    store.setOnError(onError);
    store.setOutdialFailed(onOutdialFailed);

    return () => {
      store.setOnError(undefined);
      store.setTaskRejected(undefined);
      store.setOutdialFailed(undefined);
      store.setIncomingTaskCb(undefined);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showOutdialFailedModal) {
        setShowOutdialFailedModal(false);
      }
    };

    if (showOutdialFailedModal) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showOutdialFailedModal]);

  const onError = (widgetName: string, error: Error) => {
    console.log('Error in widgets:', widgetName, error);
  };

  const onOutdialFailed = (reason: string) => {
    console.log('Outdial failed:', reason);
    setOutdialFailedReason(reason);
    setShowOutdialFailedModal(true);
  };

  const onStateChange = (status) => {
    console.log('onStateChange invoked', status);
    //adding a log to be used for automation
    console.log('onStateChange invoked with state name:', status?.name);
    if (!status || !status.name) return;
    if (!Object.values(ERROR_TRIGGERING_IDLE_CODES).includes(status.name)) {
      setShowRejectedPopup(false);
      setRejectedReason('');
    }
  };

  const stationLogout = () => {
    store.cc
      .stationLogout({logoutReason: 'User requested logout'})
      .then((res: StationLogoutResponse) => {
        if ('data' in res) console.log('Agent logged out successfully', res.data);
      })
      .catch((error: Error) => {
        console.log('Agent logout failed', error);
      });
  };

  const formatWidgetName = (widget: string) => {
    switch (widget) {
      case 'callControlCAD':
        return 'Call Controls with Call Associated Data (CAD)';
      default:
        return widget.charAt(0).toUpperCase() + widget.slice(1).replace(/([A-Z])/g, ' $1');
    }
  };

  return (
    <div className="app mds-typography">
      <ThemeProvider
        themeclass={currentTheme === 'LIGHT' ? 'mds-theme-stable-lightWebex' : 'mds-theme-stable-darkWebex'}
      >
        <IconProvider iconSet="momentum-icons">
          <div className="webexTheme">
            <h1>Contact Center Widgets in a React app</h1>
            {showLoader && (
              <div className="profile-loader-overlay">
                <div className="profile-loader-spinner" aria-label="Loading" />
              </div>
            )}

            {toast && toast.type === 'success' && (
              <div className="toast toast-success" role="status" aria-live="polite">
                <div className="toast-icon" aria-hidden="true">
                  <Icon name="check-circle-bold" />
                </div>
                <div className="toast-content">
                  <div className="toast-title">Interaction preferences changes</div>
                  <div>Your interaction preference is updated</div>
                </div>
                <Button
                  size={32}
                  variant="tertiary"
                  color="default"
                  prefix-icon="cancel-bold"
                  postfix-icon=""
                  type="button"
                  role="button"
                  aria-label="Close"
                  onClick={() => setToast(null)}
                  className="toast-close"
                />
              </div>
            )}

            <div className="box">
              <section className="section-box">
                <fieldset className="fieldset">
                  <legend className="legend-box">&nbsp;Authentication&nbsp;</legend>
                  <Select
                    label="Select Login Method"
                    value={loginType}
                    onChange={(e: CustomEvent) => {
                      const selectedType = e.detail.value;
                      if (selectedType !== 'token' && selectedType !== 'oauth') return;
                      setLoginType(selectedType);
                    }}
                  >
                    <Option data-testid="samples:login_option_token" key={1} value="token">
                      Access Token
                    </Option>
                    <Option data-testid="samples:login_option_oauth" key={2} value="oauth">
                      Login with Webex
                    </Option>
                  </Select>

                  <div className="accessTokenTheme" style={{marginTop: '15px'}}>
                    {loginType === 'token' && (
                      <div>
                        <span>Your access token: </span>
                        <input type="text" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
                      </div>
                    )}
                    {loginType === 'oauth' && (
                      <Button data-testid="samples:login_with_webex_button" onClick={doOAuthLogin} variant="primary">
                        Login with Webex
                      </Button>
                    )}
                  </div>
                </fieldset>
              </section>
            </div>
            <br />
            <div className="settings-container" style={{display: 'flex', gap: '20px'}}>
              <div className="box" style={{flex: 1}}>
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
                              data-testid={`samples:widget-${widget}`}
                            />
                            &nbsp;
                            {formatWidgetName(widget)}&nbsp;
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

              <div className="box" style={{flex: 1}}>
                <section className="section-box">
                  <fieldset className="fieldset">
                    <legend className="legend-box">&nbsp;Sample App Toggles and Operations&nbsp;</legend>
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
                      data-testid="samples:show-agent-profile-checkbox"
                      checked={showAgentProfile}
                      aria-label="theme checkbox"
                      id="theme-checkbox"
                      label="Show Agent Profile"
                      // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
                      onchange={() => {
                        setShowAgentProfile(!showAgentProfile);
                      }}
                    />
                    <Checkbox
                      checked={integrationEnv}
                      aria-label="integration env checkbox"
                      id="integration-env-checkbox"
                      label="Enable Integration Env"
                      // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
                      onchange={() => {
                        setintegrationEnv(!integrationEnv);
                      }}
                    />
                    {store.isAgentLoggedIn && (
                      <Button
                        id="logoutAgent"
                        onClick={stationLogout}
                        color="positive"
                        className="stationLogoutButtonClass"
                        data-testid="samples:station-logout-button"
                      >
                        Station Logout
                      </Button>
                    )}
                  </fieldset>
                </section>
                <br />
                <section className="section-box">
                  <fieldset className="fieldset">
                    <legend className="legend-box">&nbsp;SDK Toggles&nbsp;</legend>
                    <label style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                      <input
                        data-testid="samples:multi-login-enable-checkbox"
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
                            SDK. Changes to this setting after SDK initialization will not take effect. Please ensure
                            you configure this option before clicking the "Init Widgets" button.
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
                  setShowLoader(true);
                  store.init({webexConfig, access_token: accessToken}).then(() => {
                    setIsSdkReady(true);
                    setShowLoader(false);
                  });
                }}
                data-testid="samples:init-widgets-button"
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
                        <div style={{marginBottom: '15px'}}>
                          <Checkbox
                            data-testid="samples:hide-desktop-login-checkbox"
                            checked={hideDesktopLogin}
                            aria-label="hide desktop login checkbox"
                            id="hide-desktop-login-checkbox"
                            label="Hide Desktop Login Mode"
                            // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
                            onchange={() => {
                              setHideDesktopLogin(!hideDesktopLogin);
                            }}
                          />
                          <Checkbox
                            checked={doStationLogout}
                            aria-label="do station logout checkbox"
                            id="do-station-logout-checkbox"
                            label="Do Station Logout"
                            // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
                            onchange={() => {
                              setDoStationLogout(!doStationLogout);
                            }}
                          />
                        </div>
                        <div className="station-login">
                          <StationLogin
                            onLogin={onLogin}
                            onLogout={onLogout}
                            onCCSignOut={onCCSignOut}
                            profileMode={false}
                            doStationLogout={doStationLogout}
                            hideDesktopLogin={hideDesktopLogin}
                          />
                        </div>
                      </fieldset>
                    </section>
                  </div>
                )}
                {selectedWidgets.stationLoginProfile && store.isAgentLoggedIn && (
                  <div className="box">
                    <section className="section-box">
                      <fieldset className="fieldset">
                        <legend className="legend-box">Station Login (Profile Mode)</legend>
                        <div style={{marginBottom: '15px'}}>
                          <Checkbox
                            data-testid="samples:hide-desktop-login-profile-checkbox"
                            checked={hideDesktopLogin}
                            aria-label="hide desktop login checkbox"
                            id="hide-desktop-login-profile-checkbox"
                            label="Hide Desktop Login Mode"
                            // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
                            onchange={() => {
                              setHideDesktopLogin(!hideDesktopLogin);
                            }}
                          />
                        </div>
                        <div className="station-login">
                          <StationLogin
                            profileMode={true}
                            onSaveStart={handleSaveStart}
                            onSaveEnd={handleSaveEnd}
                            hideDesktopLogin={hideDesktopLogin}
                          />
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

                    <div className="box">
                      <section className="section-box">
                        <fieldset className="fieldset">
                          <legend className="legend-box">&nbsp;Call Control and Call Control with CAD&nbsp;</legend>
                          <Checkbox
                            checked={conferenceEnabled}
                            aria-label="onference enabled checkbox"
                            id="conference-enabled-checkbox"
                            label="Enable Conference Feature"
                            // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
                            onchange={() => {
                              setConferenceEnabled(!conferenceEnabled);
                            }}
                          />
                          {selectedWidgets.callControl && store.currentTask && (
                            <fieldset className="fieldset">
                              <legend className="legend-box">Call Control</legend>

                              <CallControl
                                onHoldResume={onHoldResume}
                                onEnd={onEnd}
                                onWrapUp={onWrapUp}
                                onRecordingToggle={onRecordingToggle}
                                onToggleMute={onToggleMute}
                                conferenceEnabled={conferenceEnabled}
                              />
                            </fieldset>
                          )}
                          {selectedWidgets.callControlCAD && store.currentTask && (
                            <fieldset className="fieldset">
                              <legend className="legend-box">Call Control with Call Associated Data (CAD)</legend>
                              <CallControlCAD
                                onHoldResume={onHoldResume}
                                onEnd={onEnd}
                                onWrapUp={onWrapUp}
                                onRecordingToggle={onRecordingToggle}
                                callControlClassName={'call-control-outer'}
                                callControlConsultClassName={'call-control-consult-outer'}
                                onToggleMute={onToggleMute}
                                conferenceEnabled={conferenceEnabled}
                              />
                            </fieldset>
                          )}
                        </fieldset>
                      </section>
                    </div>

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
                                data-testid={`samples:incoming-task-${task.data.mediaType}`}
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
                            <TaskList
                              onTaskAccepted={onTaskAccepted}
                              onTaskDeclined={onTaskDeclined}
                              onTaskSelected={onTaskSelected}
                            />
                          </fieldset>
                        </section>
                      </div>
                    )}
                    {selectedWidgets.outdialCall && (
                      <div className="box">
                        <section className="section-box">
                          <fieldset className="fieldset">
                            <legend className="legend-box">Outdial Call</legend>
                            <OutdialCall />
                          </fieldset>
                        </section>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {showRejectedPopup && (
              <div className="task-rejected-popup" data-testid="samples:rona-popup">
                <button className="close-btn" onClick={handlePopoverClose}>
                  ×
                </button>
                <Text>
                  <div style={{textAlign: 'center', fontSize: '1.25rem', fontWeight: 600}}>Task Rejected</div>
                </Text>
                <Text>
                  <div style={{fontSize: '0.875rem', textAlign: 'center', color: 'rgb(171, 10, 21)'}}>
                    Reason: {rejectedReason}
                  </div>
                </Text>
                <Select
                  value={selectedState}
                  placeholder="Select a state"
                  onChange={(e: CustomEvent) => {
                    setSelectedState(e.detail.value);
                  }}
                  data-testid="samples:rona-select-state"
                >
                  <Option key={1} value="Available" data-testid="samples:rona-option-available">
                    Available
                  </Option>
                  <Option key={2} value="Idle" data-testid="samples:rona-option-idle">
                    Idle
                  </Option>
                </Select>
                <div style={{display: 'flex', justifyContent: 'center'}}>
                  <Button
                    disabled={selectedState === ''}
                    onClick={handlePopoverSubmit}
                    variant="primary"
                    data-testid="samples:rona-button-confirm"
                  >
                    Confirm State Change
                  </Button>
                </div>
              </div>
            )}

            {showOutdialFailedModal && (
              <div className="task-rejected-popup" data-testid="samples:outdial-failed-modal">
                <button className="close-btn" onClick={() => setShowOutdialFailedModal(false)}>
                  ×
                </button>
                <Text>
                  <div style={{textAlign: 'center', fontSize: '1.25rem', fontWeight: 600}}>Outdial Failed</div>
                </Text>
                <Text>
                  <div style={{fontSize: '0.875rem', textAlign: 'center', color: 'rgb(171, 10, 21)'}}>
                    Reason: {outdialFailedReason}
                  </div>
                </Text>
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
