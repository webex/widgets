import Webex from 'webex';
import IAgentProfile from '@webex/plugin-cc';

const sdk = {
  token: 'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLlpTcC1aWmd2R0Z6ei1ZOXpRX21QbHcuWWhEa1hQQVRqS0RIUVQ4UGQxY3d6OUZUTW1IdmhJdUtDNEhxMGx0blh1TS01WWJDN2ltd1NaVHEwYzd0UVRidVRDalJpZjZqYTlkLUNSYTAzQ000Y3RTdjVuOFpZdS1qM0VCeXNlcS14dHdlQ3dOeTFTVllSZzlSM01qLU51S2tjRmFMSEFKelNmVlctUnk2WUJMLWUzS2g1REpkaEI5bDIwb0RIeVozYXF5dnFWZjgxSjRIU21zNElVSVhGZTVHeUV3RmxPTFQ3R2M3NUR4VkJYeUFyT0pXb1dXTHV3Y3lKa29oT2xsazdMcXNKY3hDNFNsQWxMQnpMR0M3VjlMb2xZWXM1T0lxV3hVWTdUV19wdkZKZFloUjFXUHhQMnRTTlRQUEVzQWRieEszeTZYZGhDRUxOQjBWWG9KakNHVlA1NUtET29hc09IUkctSFZ6dE9PNGZfdW9VLWNtVFRJV1BBVGYyU3J1ajF3dlR3eElKS3ljeU5pSUtFTUhaR2JXOHctMGNXMHk0QWc5SHZzSG5hMHlZNzRqY2MzNlVsbjhfMmdhNlh3WGlhMDd1eF9uSVpTeXNnNVhubzZFMGNEbFBzYmhseFN4SGlwWV80VVg3R0llaFhjSFRfRi05dmFFZ0wyZjlubDh5Wnpmb2FGUDNoM0IxZHdTWGlXQ0d6Sl9pcEVOeEtoLXNjNURXdVdBV1g4TjF4aFc0cUF6V1FXNGljb0NlejIzUkQ5WElsbHBFRjBpZ1Q3RmVpaHI3X3lTVHlTNFFMaDA0bXlzdTlfWjRuOWJjbElwWExvXzJMMnhrVVRvQ3h5YXNBMUc5YW51bGg3NmVLRFcwWVVaN1F0MXNhTkx2aVVIcmxsQmFjMEpTSEFXNmd3Y3R5RmpQZ2NfN3pOQ0RHZEk3amxDWXN5TFBqdWxxUm5GRkZxMmZxTncwT3JTQ1dkWUlhRjdFRnVyQlV4REZlZmFsSlJFbkVBZ2RpSDRIZzZHLVJnMTRiOVFMYlJQUTdNYXlJY1FLRjdKZ1UyRDJuR0pLY3NINUFGa1lOaFdtdTQyeC1NQTJUTEJsVjlydHF4YjRJbHJVdnBwajZQUndKX3EwNVh2dWhLcU4yeEdWbThXSEZHUjJScGhmWTI1TUlTdkpaYnBpLXNXeXp2RHlGUlVQTVFxM0JUbDFHelZGMTloR1BtZ2lBS1hQZnpoRXNKbGlJTmRZTVRacmN5VHRhSXpFenBZRF9QcUxOSlM4aDhOcEp3LlhWdVctRlhnVEQ0SWNXSUl5b2E0ckEiLCJ1c2VyX3R5cGUiOiJ1c2VyIiwidG9rZW5faWQiOiJBYVozcjBPREUyT0dGbFpEQXRaRGczTXkwME5HVXlMV0pqWVRJdE16a3dZV016WTJGaFpUVTFOR1F6TlRaak1qa3RZelJqIiwicmVmZXJlbmNlX2lkIjoiNWNkZDg1YzEtMGI1NC00ODc5LTk5NDAtOWJhNjE2OWRhZWFlIiwiaXNzIjoiaHR0cHM6XC9cL2lkYnJva2VyLWItdXMud2ViZXguY29tXC9pZGIiLCJ1c2VyX21vZGlmeV90aW1lc3RhbXAiOiIyMDI0MDkxMjA5MDkwOC45MDFaIiwicmVhbG0iOiI2ZWNlZjIwOS05YTM0LTRlZDEtYTA3YS03ZGRkMWRiZTkyNWEiLCJjaXNfdXVpZCI6IjZiMzEwZGZmLTU2OWUtNGFjNy1iMDY0LTcwZjgzNGVhNTZkOCIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJleHBpcnlfdGltZSI6MTczMTk3ODYyNTkyOCwiY2xpZW50X2lkIjoiQzU4MjU0ZjM4Y2UwMGVjN2FmZDFiNjA2NmY5N2UzYzI2ODBmODE5ZmFlZmU2OGE5NjUyMTk3YTNhOWUxODg3YzQifQ.Qhxd4En7IIhR2YQUNzxSaC6XEHLdAW-fxt3RO1U-ZSi1DtIIW-QAnXMIW3juAm30Q3UwvfJTZy9W3ox5Uu_yPJbjneFZ6ZbdKbXXzz8DJq_igOWRYX3oxWAWq1NjlBiP5Ov_qj3boRZEbddfg_IPPhJ1azz3UF0iVGhh_K9Yo9xb7SGvHRaZPSCE90MQmbWY61W99Ew2MLxzJOtB4LHfUZHaRoRDDlsONoxwSXiA_nihfr3wXRTlANTEsdI0u7g3G7oi8TxoCOE4icmcC2wtFOGhejGpSh-bcahPcWMVN3sV0VdPyG7T8P2TtqhsvypGL_i8TU_1Jtem83p9Nq-7_Q',
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
