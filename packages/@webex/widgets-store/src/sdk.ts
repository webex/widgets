import {Webex, IAgentProfile} from 'webex';

const sdk = {
  token: 'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLnlxMWVVR1hlbXBvWGRHbUhQR3NMNFEuMnZBemItRTI4MG5RX2NzSGJMc0lUejB6WVBEWmRGc1VBZTZDbGR1akduY3NlOEZwaXJrMWNfaFZXbXA2TXlscEJyNGhqTnhnaTZfYzBjVkltamNTMjVPYTRwZGRMcU55c1dweWpGb003YWNFTDlYOVZ5OXJPMWlILWhIMkxkV3NPbERUSW8xbF9fR3VtdGpMQl95MWdLT0tkX3dwbmxNMFJqb3ZGWUUzRnJabHotcmx2ZVdDTVpjaFMydUNKWlRjcDIyaTU5Wk1QeWVIcDJta1dLVnZPWXBvUXFiQUozYWh1YnA1clpGekZrZE5JeXdVNXBJekJnOVVjV01ZZGlELXp4RVZsUzF1T2NvQUE5ZDRMTmpRaHpuTFRGbDNtZHBTUEJTNXl6b25DbVI5SjhNOWhaY2pMMHJ0QnZxMVNRbUYtOEEtb1JoUmx1RkVBbkdoQmFWQ1V4NEtZVmJMbm9QdFlyRVc4US0wR1l0aEVNdENrTTdXVVNmM2dSV2h1dGotZkxabkFNTlp1US1xUk14ekJKZ2NkZjRmTlBOUUVzMzJFcDVpdzFsMk5pX25UYWFmZmFNVjFsa2ZwM1g0dU1Udk1RU19MMURpeFo5MjdJa0FsSU8ya2U2OUliNFZSM0ZobzloWFo2YzhPdGNaYmpaTTQyRENwOGdFVzlMZWE5QXg0eWY0SG5ycGlFSFA5VWV6TDRDRjlwZ0hsVzNjazdfZm5YSGtYdzBzdVY5TmtFc0d3R3ktVmJVajRsUVBPd3p1QWtqVnNuOHNyT3lsTUdLaFNIa2x1bEdmM2NCUlh3dmpOZ1ppZ29WWVNCWS0xYU01MjA0NWN0M0R1RnZlSkJMVzlIVmpWVUUzQnFpdGNOV2RSWkwxbXRxSUFjN21rbUwzaFRxM2g1T28zSmFwWEpTbU55akowVXdsWnlQYzNsUkZIMEprcGRYWUlrT1l0QkZyMG5tdkRFQVI0R3dyNGJZQll6SThGQnBpS2JvdDlSTThKbGxwaHVydVlIRVdqM0ZqU0FMYm1Nay1vTHFQclhMbTlyYi1tQ2VJQ3ZNaWxSOWl5Q1UwRHRrYnlsSHZtR29rR1N3ZnVZazlUcnNKejJxd2JFTURXT2ZnVGtxWlVyenZfc1l2a3JIVEZxQ3dTWjVIWnh5RWNMNGRkZENGemVCZUJVRkZ2N3EyUG9FaU9UOWJmdFhTTS1ZSkZuTVQ2Nzh1ZnNDbjhyRm5BVjh5RmRSaEoxZ1BJUnRkX0NrLlZ2Smc5WmcxLXlsaU9saGFNOUwzZnciLCJ1c2VyX3R5cGUiOiJ1c2VyIiwidG9rZW5faWQiOiJBYVozcjBPR1E1TUdGa1pEQXROamMzWmkwME4yWTJMV0ZoTWpNdE9UWmtabU0yTWpobFltSmxZVGxoTlRoak9EWXRaRGszIiwicmVmZXJlbmNlX2lkIjoiNWNkZDg1YzEtMGI1NC00ODc5LTk5NDAtOWJhNjE2OWRhZWFlIiwiaXNzIjoiaHR0cHM6XC9cL2lkYnJva2VyLWItdXMud2ViZXguY29tXC9pZGIiLCJ1c2VyX21vZGlmeV90aW1lc3RhbXAiOiIyMDI0MDkxMjA5MDkwOC45MDFaIiwicmVhbG0iOiI2ZWNlZjIwOS05YTM0LTRlZDEtYTA3YS03ZGRkMWRiZTkyNWEiLCJjaXNfdXVpZCI6IjZiMzEwZGZmLTU2OWUtNGFjNy1iMDY0LTcwZjgzNGVhNTZkOCIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJleHBpcnlfdGltZSI6MTczMTcyNTU4OTU0MSwiY2xpZW50X2lkIjoiQzU4MjU0ZjM4Y2UwMGVjN2FmZDFiNjA2NmY5N2UzYzI2ODBmODE5ZmFlZmU2OGE5NjUyMTk3YTNhOWUxODg3YzQifQ.DPmJ5SkkHgfXzK6MjEO3wRKHSF9vENGG22oupinuowYihpXVolq-OouQ9fTq2IXuLIx8mvI4L5pyZO0CDHTOsyd927MpJq-8ymA5shWxeINuOynP6K4Z1nggwwZn84rCxW1C-jLkBgzBW8PH1aGGDmoAGhw1oH0nkkFDjO2vbhe3wUo9OcZZCSq_iTY-5wjuY50y0mOiL-naVKSIktMeVEzf83GyP06DlDQleqd2tMFilA5QtEw9S7ptnid49I9Sz1o7y0Y8Lti35p_E-4LdSdwNVabveMe2PgtYj9O65xqw8Eh9ynfsjakSnFY-nCBakERV7bD8VEkcWzC7wpi8dA',
  callbacks: {},
  webex: {},
  init: async function(webexConfig: any, updateTeamsList: any, updateLoginVoiceOptions: any) {
    this.webex = Webex.init({
      config: webexConfig,
      credentials: {
        access_token: this.token
      }
    });

    this.webex.once('ready', () => {
      console.log('webex: ', this.webex);
      this.webex.cc.register(true).then((response: IAgentProfile) => {
        updateTeamsList(response.teams);
        updateLoginVoiceOptions(response.loginVoiceOptions);
      })
      .catch((error) => {
        console.log('Event subscription failed', error);
      })
    })
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
