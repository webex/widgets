import React, {useEffect, useState} from 'react';
import store from '@webex/cc-store';
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';

function App() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  const webexConfig = {
    fedramp: false,
    logger: {
      level: 'log',
    },
  };

  const onLogin = () => {
    console.log('Agent login has been succesful');
  };

  const onLogout = () => {
    console.log('Agent logout has been succesful');
  };

  return (
    <>
      <h1>Contact Center widgets in a react app</h1>
      <input
        type="text"
        placeholder="Enter your access token"
        value={accessToken}
        onChange={(e) => setAccessToken(e.target.value)}
      />
      <button
        disabled={accessToken.trim() === ''}
        onClick={() => {
          store
            .init({
              webexConfig,
              access_token:
                'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLmhjaE02Nkx6QVZPUFRnSjJWVURheUEuODdwYWVJOHh1RWNOSUk5SFVVQ0YzVUZVNjgzUHNCT3dVNDBtWjBKVHJ3akhMTDRUU0dEWnRnLVJVekZncFZ5ODluM2RhSjJXdG80NmIzWTdfYkpUdzZDLVh1ZGFPcEQ5UkJTUjQ2OGhmc21xbTk0MlEyM3Y5TWhNaExzbWxlQWY5WnlISEs0OE5oRHBiaUFhbmtxRk1RS2FnRTNzSVgxNTNRSHlfcGNYNVJCdW5rY29BMHpRM1ktUHdMeUU5Nm52T2FhLTBZcWFaUnA0bU43T1JmOC1jLXdRRWN5clFNVllvUlFLRTBjb0NxcXJhRlZLc1dwWkQza0lXb2F5MXJtS1F3R3BMLUhzeWJOWjN1c3hhRHZGZVJkRS1wYWpXMlJ1bHZJbUJJSXk2anZOLVhsVGp3UVFzUkpuM1JpNm9vUzdmN082aVJQSTFXejNraHZQbmlsd0RVbkJiUTl5clVIbDJfU2dGNG4ybFk2MTBGUmZBRnNZOGdNYnF0XzBBWDVjQWF4Vks1SFplYURpNWQ1N2xfU0JmMURfVjFGcjlOdGFjVXpkX3JYb1lwNXlaZ3JiWUtlN2U3MkhjUDQyQkxwbkR2SWJxWmF4aUxYdnRLV1NpOTc5LTNlaVhjWFhEbk94dzlYempfdnprZXp2V2E2bWYtOS1wV2ZMeEl2VHFZdUdiV01PTXNBVHZ2THNLNGdSZmJzeWpRU3pJVjctdXZueFNrc0M4N1UyaTJoYXJrVjZhMEFKZ2ZjX0E4M2k3azM4a1RRWTFUb2EtX3BMcTVSR2xpWHhmSHdidGRaSU81LWtWR2tkaUlrQjF2ZW01VmZ0ck1QZWltN0NHNXVZYTIwNmJLNU5oTEZDSUczVnJJQWJlVThXTUlmX3g3Qi1ZUG5zMXBHX29uVE0zZlBPODFya0RqNUUxYWN1TGpJTnJnUFllLWdkNmdGMi02OVlXZWZxS1pLRWhaeWxHOUpVR1VrUDlXWXBBMkFBQlhDUmg2QzlWSlNTeUhrdEl5OFBZQkJhOHkzSXIya2I0Vk5odHYzUWlRX2hFNGJUU2d5X1NEaVk4RlBVb2lYTXJJYVh1MHE2SjRuREhFVmdGOHc5SE02NkREenpRbjg5TUNJNXBRbHJVeW5tRW9OUDF6b09nUk1BY28tRGxkUjg5YUxHdW9fTmhVc2piaWdhNi1zSWd6dDNBMWhDdDA1WG5zOHN3YThiM09QSlRKWUYtazBvaFY4MHhvNmJxb05QTERvLnJ2ZUdHSmxxN1FKSlNSYjRvVEhnVmciLCJyZWZlcmVuY2VfaWQiOiJhYTEwN2M4OC0xZmVlLTRlOGEtODYwMi1mMjZmNzk2Nzc2M2UiLCJpc3MiOiJodHRwczovL2lkYnJva2VyLWItdXMud2ViZXguY29tL2lkYiIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJjbGllbnRfaWQiOiJDNTgyNTRmMzhjZTAwZWM3YWZkMWI2MDY2Zjk3ZTNjMjY4MGY4MTlmYWVmZTY4YTk2NTIxOTdhM2E5ZTE4ODdjNCIsInVzZXJfdHlwZSI6InVzZXIiLCJ0b2tlbl9pZCI6IkFhWjNyME1UZGhOelptTjJNdE1qYzVaaTAwWTJFeExUZzJaVEF0WlRSa1lqazJaamhsWVdNMk9UUmlaV0ZqTmpRdE9HRXkiLCJ1c2VyX21vZGlmeV90aW1lc3RhbXAiOiIyMDI0MDgyNTE2NDkyNy45NTZaIiwicmVhbG0iOiIxNzg0MjI0MC1kZjY5LTQ2MjAtODdkNy1lNDhmZDE3OGY3OWIiLCJjaXNfdXVpZCI6IjAxYmIwMDIxLTZlZGUtNDlkNC1hNDdkLWZkNWFmOTc1MjY2NSIsImV4cGlyeV90aW1lIjoxNzM1MDExODUwMjgxfQ.K5q_6RZYx0iGQeCgMZ5BkZDJHWzhccHE4cJceSmu_in8_pEYflDpUoZ4MflVKc-KQJBYb6jWONtaKkg19DMt3WTsMBDdCbO5uJTtSc83kpCcUwRH1ZNSZYpYDfgkAyVV4noAqjqNYWmP_Uw79q4kyCEXDcsE_6W61uGIn0kjY16rUOAnhQLys1HUHzaI1n6nhb1F4FZCpLNZSqAeDCXBHIJXJQWr3lYqC_MITk-a6_y58_8oNg3Vr0PsJGUUMtSL8iJhksS8b7ITzZTaP2DsFKdzX6wuACpr4aXHbeWHQw7mjlI0VrPIMgesuqbWI5EJEP7M-RuAbTsErBOJ_IadwA',
            })
            .then(() => {
              setIsSdkReady(true);
            });
        }}
      >
        Init Widgets
      </button>
      {/* write code to check if sdk is ready and load components */}
      {isSdkReady && (
        <>
          <StationLogin onLogin={onLogin} onLogout={onLogout} />
          <UserState />
        </>
      )}
    </>
  );
}

export default App;
