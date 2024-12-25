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
                'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLndwM1EycFNOajExZ1gxZEdOR2FiQlEuWU1qNjN1Y1M2T1gwZ1NhamxydXljaW83bFl5RGZBeE1FOFQ0MU13RmQxRTgybmN4bFVYeDN2UGY5dVVwQUplcWZYc212SUM2bDRwOFhmaVNodWF6bXRuX0lvcnkzTGR3NFNUWlFzOUlNeHFKOUZqNE44bXYzeGVMbVpjS3R5QnIwRWpyRVFIX3JkLWVycHhqSVBHS0lUZXdZc21WS3pia3dzRU8zQ2JEOHhxS2d6WVZORUY2UjVILUVVbkREQTRlQm9PS2RZR3FUTWdCMVBVNXdtQVlINmZwSm14eVItbDdxQ0R2a2hreGt1X1JtUkh3TlhmWnZkdG5fdG10TFdWM1J1Y0tEbGs5bV9wNkxJTkNvZEZ1R0JfQl9JRHp6b1lWR1dsUld0NHFfRnp6Z2pyOVBMc3BaZkFOX0ZNUm1hNFk1YV92a0ZKcGx6S1pfZFVqVk1sVWRVTEctOGNpb09Gc2N1WWNteHNfV0NEeFppWW8zcF9QXzBNQXJWQm1UdF9fNnp3clltM2s2S05BQVkzOFVfZThGMGw0Z1Q4MjM4Ukl0VGdmall0MTIxd3YzZG1uWVJCWi1sNmFKSDgwMVNUNFFZRGlOeTFPSnl4Rk1oWFNlWWx4UmdhM2xkSnU5VFlwQzFVVUp0czNZVDFCM3hBS1ZhSXpSYWJXNkxrc0s4LWh6MHE4TktPVDJLdTlNS0tyNks3TDcwUkRwaGhLWG1PTC1mS3plRmVELUhYTkZnUER1elJlTURVMmZwdFhNYUNCT2VIbUlFWDlnRC1ESzdtT3VodC13ZDRHVVpoal9NU0lXUnVxTWR4V2RtWTlKaUJaeWlBdEl5WFc5WTI0dlhET0p0MjRwY05kVmRYODNMSmYxUGxTVXpyWjlmRGNiV1NFZHhDdk5JMGJOUWJmbzVUSHBoSXZKNG9mNnNwR29FRXVLdXVrcWtnWDRRal9lYlBUaVp3Y294U0RrRmZVYkFxakp1VEhKSGc4NUZoaFlWc2l5Wk8wUlFmS2JjbWF1c0V5eFlOOGZCQUtneUdrSk8xcFV0NnFsNmJyT1RXRFBIRV9jQ2xqcFBLUXJ2SkJ1UWg0dDVNS3Q5UUxBQW4zUXZvZHpRMk93UFRGYlZiUEJqWUctSGpUbTRpdE96c3BpR3JRb1lUa01fWl9ZRFRvLXhaU0RUam9sNC1RandJaGxVVGk0MUhvcEVsTk91UllfWjBRbVVoLUFKZmhlQW9wckY3VTNkQU1Ma0F3VndBLkRoRnZhZXJFMmEzaktHTHNkWU1zcXciLCJyZWZlcmVuY2VfaWQiOiJhYTEwN2M4OC0xZmVlLTRlOGEtODYwMi1mMjZmNzk2Nzc2M2UiLCJpc3MiOiJodHRwczovL2lkYnJva2VyLWItdXMud2ViZXguY29tL2lkYiIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJjbGllbnRfaWQiOiJDNTgyNTRmMzhjZTAwZWM3YWZkMWI2MDY2Zjk3ZTNjMjY4MGY4MTlmYWVmZTY4YTk2NTIxOTdhM2E5ZTE4ODdjNCIsInVzZXJfdHlwZSI6InVzZXIiLCJ0b2tlbl9pZCI6IkFhWjNyME16UTJZV1pqWXpJdFlqZzBZeTAwT0dZNUxXSTBZbVV0T1RRNE5HUXpNVEExTlRVNFptSm1Nekk0TUdJdFpqUTMiLCJ1c2VyX21vZGlmeV90aW1lc3RhbXAiOiIyMDI0MDgyNTE2NDkyNy45NTZaIiwicmVhbG0iOiIxNzg0MjI0MC1kZjY5LTQ2MjAtODdkNy1lNDhmZDE3OGY3OWIiLCJjaXNfdXVpZCI6IjAxYmIwMDIxLTZlZGUtNDlkNC1hNDdkLWZkNWFmOTc1MjY2NSIsImV4cGlyeV90aW1lIjoxNzM1MTc0NzcyNDYxfQ.DTSfzkiMOQKxKvx-v7DhuyovPXGJVN5oEQYEYBIrtCO8xhhSkPNKFAGUMJQrAitwOV_FHLRi0CLFWYiVv_BqXCSn2q7TwNHFs0pRuN6vGHbU8yUEkPSfobKuRRX7kdOxsHTz9ZK_i3C3Dx2drA56w9XFSazTFYnGmnZ0ur42bvhNspNVfPvMYK67AzsYBKOiJdQgH7TvYRWfLJYKZjRcYawWpBOVW75HoikC03YYj8DNog72lsB2BhaDlz-3xILdS-X_gl6Pq4-Jh7N9oSSfX6mBmiHLQ51pH7LE8fJQGNlIZW-QSVrhSYbb_0LX9dp3aUrIEVl2DyiOVRY7pwPSgg',
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
