export const useUserState = (props, store) => {
  store.setSdkConfig({
    config: props.sdkConfig,
    from: 'cc-user-state',
  });
  return {name: 'UserState'};
};
