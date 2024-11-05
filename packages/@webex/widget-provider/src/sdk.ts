const sdk = {
  accessToken: '',
  callbacks: {},
  init: async function({accessToken}) {
    this.accessToken = accessToken;
  },
  logout: function() {
    this.accessToken = '';
    this.callControls.unmute();
    this.presence.set('busy');
  },
  presence: {
    currentState: 'busy',
    set: function(state) {
      this.currentState = state;
      console.log(
        `%cWxCCSDK\t\t\t%cpresence.set:%c Received`,
        'background: red; color: white;',
        'background: lightgreen; color: black;',
        'background: transparent; color: grey;'
      );
      setTimeout(() => {
        sdk.emit('presence:state', this.currentState);
      }, 1500);
    },
  },
  callControls: {
    currentState: 'unmuted',
    mute: function() {
      this.currentState = 'muted';
      console.log(
        `%cWxCCSDK\t\t\t%ccallControls.mute:%c Received`,
        'background: red; color: white;',
        'background: lightgreen; color: black;',
        'background: transparent; color: grey;'
      );
      setTimeout(() => {
        sdk.emit('callControls:muteState', this.currentState);
      }, 1500);
    },
    unmute: function() {
      this.currentState = 'unmuted';
      console.log(
        `%cWxCCSDK\t\t\t%ccallControls.unmute:%c Received`,
        'background: red; color: white;',
        'background: lightgreen; color: black;',
        'background: transparent; color: grey;'
      );
      setTimeout(() => {
        sdk.emit('callControls:muteState', this.currentState);
      }, 3000);
    },
  },
  on: function(eventName, callback) {
    if (this.callbacks[eventName] === undefined) {
      this.callbacks[eventName] = [];
    }
    this.callbacks[eventName].push(callback);
    return {
      eventName,
      callback,
    };
  },
  off: function(eventName, callback) {
    this.callbacks[eventName] = this.callbacks[eventName].filter((cb) => cb !== callback);
  },
  emit: function(eventName, payload) {
    console.log(
      `%cWxCCSDK\t\t\t%cEmitEvent:%c ${eventName}\t\t%cPayload:%c ${payload}`,
      'background: red; color: white;',
      'background: lightgreen; color: black;',
      'background: transparent; color: grey;',
      'background: lightgreen; color: black;',
      'background: transparent; color: grey;'
    );
    this.callbacks[eventName].forEach((cb) => cb(payload));
  },
};

export default sdk;
