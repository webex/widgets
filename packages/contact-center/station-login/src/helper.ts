import {useEffect} from 'react';

export const useStationLogin = (props, store) => {
  const {isSdkInitialised} = store;
  store.setSdkConfig({
    config: props.sdkConfig,
    from: 'cc-station-login',
  });

  useEffect(() => {
    // Do whatever you want with the SDK
  }, [isSdkInitialised]);

  return {
    name: 'StationLogin',
    ...props,
  };
};
