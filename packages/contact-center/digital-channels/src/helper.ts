export const useDigitalChannels = ({currentTask, logger, currentTheme, onError}) => {
  return {
    conversationId: currentTask.data.interaction?.callAssociatedDetails?.mediaResourceId,
    logger,
    onError,
    theme: currentTheme,
    accessToken: '',
  };
};
