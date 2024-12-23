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
                'eyJhbGciOiJSUzI1NiJ9.eyJjbHVzdGVyIjoiUDBBMSIsInByaXZhdGUiOiJleUpqZEhraU9pSktWMVFpTENKbGJtTWlPaUpCTVRJNFEwSkRMVWhUTWpVMklpd2lZV3huSWpvaVpHbHlJbjAuLlRCZmRGYlFKalo0RExzZV8tUEoyRXcub05BTTJpeFRoRnBFWk1GOTBSQUsyQXhkYVN6andtUkRPV3VqYUU1dExLSHM1ZXZhT2hCRU92ZkpWYlJ2QVFSYW1xSFRyc2ZBM2pJT1pnaUhKbThOeWp4S21LTFBpeEs4MkZmUldMQnJUSU9NbzVwbVJOcGd2Ml9YUEpHNHhncWJ6TGkwNkxZc3ZNZ3NSRjNrRklyRXVYZjJOSUlIMFdPemhHWUtrQlRYYTVjaTV5VHlQN1o2Y1UwZUFUSHowd0FpWk5oak1EQ0ZHdEFpQUJ6MWRfbVYzWlBoZ25nWlRjQzMySEd3SEtlbWYxODByNlhqSlcwY19FV0hERDZiUzFySEYxOXJSRHN3RmZnd0dla1NZb0tTUG9Eal81YWFiLWFRNFdYVTZvZDd1SlhZQ1gyVWdTNmE2Tlpwa0hSZXRpRll1dHE1SUFSeFVLYy1oOENWOHVtQXZaSS1KdU0zQ0FvQTUtcjB3emp0SzUxaXZNQ2lBTFI0NGxnOFpWc3VwSFFUTC13Um1wTlIxcnFzdExIaXctcnFrRm90T1pYZVhFVE44UTR2NlM4U0J0S3lnUzRFcW94V0hhVXlNVVhvX2x3QjluZUJ6UXM2TlgzVWpabVFxb0psY1BBb3l0UG84TnV4V0RGSEtyU0xMeGNwRFB0R21KMVI3SlR0Y3BLazRpTzV4NktXZUl1UmZJUURLRU02ZXJvS0FzVUlTOVhTX2o4TEdNLTh4Yl9UamxxcUZKYTZDd2xScUVFYlNlR1Nkd2ZRS1ZSZWNtWV9CaFZQRFlXY056MS1SWVZwNjFoU0hicDQ1aHk2N1VhcHhDX1UwaW5vQmIxNHJ6Rk91LWtBc2E2WFF6azZDcjBHNVJHZ2xfNF9haTVYcXF2Si13SHpyaGY4M2FHTWpBZlI3UzR0emZvcDZkQlVnMVROaUNaZ3JhbGRFcV8tTC1aRFp3SXczUE13djFaR2VyOGNGdXAwSmRuRFFIRERRc1RvSndRMUxWUUJTRE96WjIxXzFnb1pJdlhIaTdlMzdyeHctaWk1NElUa1dqbmtKc2JFN08yUWV3WWFsVk5Dai12WGtRR1ZKZVJkVVpMcnpMai1MYWVXeUNnWnFZS3hqMzNwVU8yQlBub1Frei1pdnloMlZvT0FRTUVqUHRfSTRqWnB2NC1ZMVJnekV3eGh6S2xFYzU0Wk1HOE9aRGNrd3MyUml6SFlDNm9mRHBKTTRBNVVuU1ZhMGo3eEd3MFNVdVJ0MURrLmxyTUJRR0FDMFVNWEtxanFqdHhSX2ciLCJyZWZlcmVuY2VfaWQiOiJhYTEwN2M4OC0xZmVlLTRlOGEtODYwMi1mMjZmNzk2Nzc2M2UiLCJpc3MiOiJodHRwczovL2lkYnJva2VyLWItdXMud2ViZXguY29tL2lkYiIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJjbGllbnRfaWQiOiJDNTgyNTRmMzhjZTAwZWM3YWZkMWI2MDY2Zjk3ZTNjMjY4MGY4MTlmYWVmZTY4YTk2NTIxOTdhM2E5ZTE4ODdjNCIsInVzZXJfdHlwZSI6InVzZXIiLCJ0b2tlbl9pZCI6IkFhWjNyME1EUXdaVFpqTURZdE56VXpaQzAwWlRNekxUazROMkV0WWpoall6WTBOV0l4Tm1VNE16QmpOR0V5TURFdE5qUmgiLCJ1c2VyX21vZGlmeV90aW1lc3RhbXAiOiIyMDI0MDgyNTE2NDkyNy45NTZaIiwicmVhbG0iOiIxNzg0MjI0MC1kZjY5LTQ2MjAtODdkNy1lNDhmZDE3OGY3OWIiLCJjaXNfdXVpZCI6IjAxYmIwMDIxLTZlZGUtNDlkNC1hNDdkLWZkNWFmOTc1MjY2NSIsImV4cGlyeV90aW1lIjoxNzM0NzUwNzI2NzM5fQ.fnujMmTTkWg-Dz_HmL5m4yZOv42yFfje4OvRivNv0s3PF7GvC4OUryJVq2fKcG6CxLmG1KMwltEt-Pqx6vvlWm2ndQJaCGIpvYIHOVr0HkH7GJasuUK1ClpQc68Rti2r2HFvG33ybcoktz97E_kM8KcLiXDsNa3ZEzVmyI0iidEb5KehM-SCakCu1aByD5ryVhsDboguTmTT6Ee7T30Vxh7ANvgQh2vH9dnPA96PzGo0yn8q6OCVA874YuxdV1brayY17RlB0zE_zyZ6JFZkcQbbAaBs-D_wcUDvnUo2AhqTcTvV0zxYJFzOmpuIt8iaa0uh24SeK5CbIegJMuB_wA',
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
