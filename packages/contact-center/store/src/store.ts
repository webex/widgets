import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex';
import {AgentLogin, IAgentProfile, Team} from '@webex/plugin-cc';

class Store {
  teams: Team[] = [];
  loginOptions: string[] = [];
  loginReqParam: AgentLogin = {teamId: '', loginOption: '', dialNumber: ''};
  webex: Webex = {};
  token = 'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLjZkclhSMkRLMlFrcnZCODMtUXZNVHcuN2xtT2hCSzh2by1RTC1OS2RZTV9fR1d2aU5QMU1LR0YzeWJ2LTU5R25hN1EzUkJBamMtaS1CZHdpbGYwdDZHMGRBWlBsR3FxOTNnYlRuWkkwbm0xMGZoTE5Nd2VmYlkycm5nRXEzbUdTWjJhd1o0YWFPVzZfZUFUaTh1YkNWZXB6OW1KTjBUUGQwbDVURWRUT1lmeWJIaGx6YnVTUm5kaHMxbkdNTXFXNG1rUlJ3R1N6cVNZUVV4S2NLR3RmbTFmX3JDOHV6eVJqc2xsUkwtUnRLZUJfNlVIMFRZM1V3NkJpSlRRT1I1RExwaHBHMmVleE85dzlYOTdmenMzdnBDcWhnbVh3dXVXMXlrNWhSWFJWenF1bUs3d1VPSWJNdDJlVzNzbnVBVVVQQ1hfUmExcWRadHptV2JWNThsNnNtZU9mS19pSHFnQV9TUWtWM1B6V1RKa0JUSW56OUVnWDNHM2dTc1NJcWNvdjhTckhjc3Y4SnEwN0UwT3VWdjVBZ3RHRTdKLTJqejRfNktibzJZUGoxZFZiazBydHktWGl5dkd6NXJHbVdkamFCNlNlYTV3cTdDb2kzMUNMd0N1alZGQldGZkZCbW9aMWc2Q0M0M3JLNm4yYWt3RDhqaGRBMGRsVjQxUFpGbzduZjF1Ykk2TkNoWEMxMDlGMThOdnZpaTlWbjBZY2tGNERhTDBrdUI2RGdYM3o0M0VaRHVaejdDQVRJTTB2YlYwQkNOZktKNGljUl92NWxTLWhPdkxHX3d0VFdTRTNpOTFuMkdYQzZCN3ZYdmE0SnRRcU9LTUJIVmRvVENsZHFNTms3MHFUMUZXZkVBSjBhajFFQVBfbWwxSU13Q0p4Tk5ldWh1QW5oS0Npb0JrS2ZmYkc4TUpvaVZRcWY2R1RaNFlTcGhkNVJSckR2VWVrbjNTRHRfaUlNdzdWLTEyZGh5TDJQZW0wal9SbUNPRkVkb1VLeUVRT3l5R0NMa2hHODRZT2lET1hMb1pEMVRva2ZCRmE0eHdZeTNDaGpQZU9KckN6cXl0MEc3eXd1b3JVZmw4WUc1a3JSVF9NdnVYdFFVMGk1TnVHdk5jZEM0WDlaVUlPR0duT1kzNnFjN01oWWZtNmhwSmlGWjJ3bkxzdl9GeTRNTFVtMUpkazN2UHNMdzVDUzUyeGZsVzJlMFM5bWxaYzU2WGM5YzVIRTBhTVU4dTlWNXBhYVRObWFWRHM1SUx6emthQWh6a0xvcnpFU2NOdUI4LkNxUU1qOUk4YmFjem1VZVhRbmhpVkEiLCJ1c2VyX3R5cGUiOiJ1c2VyIiwidG9rZW5faWQiOiJBYVozcjBNbU0xTnpCaU5USXRaR0l6WmkwME16SXpMVGczT0RFdE9USmlORGhoT0dGak5XVmhaVFEwWmpBNVlUY3RaR000IiwicmVmZXJlbmNlX2lkIjoiNWNkZDg1YzEtMGI1NC00ODc5LTk5NDAtOWJhNjE2OWRhZWFlIiwiaXNzIjoiaHR0cHM6XC9cL2lkYnJva2VyLWItdXMud2ViZXguY29tXC9pZGIiLCJ1c2VyX21vZGlmeV90aW1lc3RhbXAiOiIyMDI0MDkxMjA5MDkwOC45MDFaIiwicmVhbG0iOiI2ZWNlZjIwOS05YTM0LTRlZDEtYTA3YS03ZGRkMWRiZTkyNWEiLCJjaXNfdXVpZCI6IjZiMzEwZGZmLTU2OWUtNGFjNy1iMDY0LTcwZjgzNGVhNTZkOCIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJleHBpcnlfdGltZSI6MTczMjAyNjc3OTY0MCwiY2xpZW50X2lkIjoiQzU4MjU0ZjM4Y2UwMGVjN2FmZDFiNjA2NmY5N2UzYzI2ODBmODE5ZmFlZmU2OGE5NjUyMTk3YTNhOWUxODg3YzQifQ.YgKIlPEfrkBNBttVSIcX2M_TB6bM-OuR460Pd6RPcPtHTs6BrKW1Y_tt7TVUzqL8rTIwzRnd4jMHZYg6wTfLmUEqXVhcNA_8avC5nTHZcvubDh2lUxo3YCrOYTp_0VnJkUtRh_3Odc9bNSt150dJv36MjYopmUpfxL24yM1OKFHPikEZA_8uZw-RBSTddaAzMUiZVSfKvw5Fz_IrLc7tfcJeG93boSM1WGAOgvHhV5qei7Ipas6ptGW92bTBFNmVvhemzZYwIeWHGkKTHxUe29ojgORn-F0pmJUvzliwNA3XWT_RTPGlS9-5vGnPa9VdiM33H9b35YjjikQ53UzT7Q'

  constructor() {
    const webexConfig = {
      fedramp: false,
      logger: {
        level: 'log'  // TODO: We will add more logging levels later and set the righ levels
      },
    }
 
    makeAutoObservable(this);

    this.init(webexConfig).catch((error) => {
      console.error('CC SDK initialization failed:', error);
    });
  }

  async init(webexConfig: any) { 
    this.webex = Webex.init({
      config: webexConfig,
      credentials: {
        access_token: this.token
      }
    });

    this.webex.once('ready', () => {
      this.webex.cc.register(true).then((response: IAgentProfile) => {
        this.teams = response.teams;
        this.loginOptions = response.loginVoiceOptions;
      })
      .catch((error) => {
        console.error('Websocket subscription failed', error);
      })
    })
  }

  setDeviceType = (deviceType: string) => {
    this.loginReqParam.loginOption = deviceType;
  }

  setDialNumber = (dn: string) => {
    this.loginReqParam.dialNumber = dn;
  }

  setTeam = (team: string) => {
    this.loginReqParam.teamId = team;
  }
}

const store = new Store();
export default store;
