/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {store} from '@webex/cc-widgets';
import './EngageWidget.css';

// Define the component props interface
interface EngageWidgetProps {
  accessToken: string;
  currentTheme: string;
  isSdkReady: boolean;
}

const IMI_EVENTS = {
  CONV_LOADED: 'onConversationLoaded',
  CONV_LOAD_ERROR: 'onConversationLoadedError',
  MESSAGE_RECEIVED: 'onMessageReceived',
  LIVECHAT_CHAT_CLOSED: 'LIVECHAT_CHAT_CLOSED',
  IMI_SERVICES_INITIALIZED: 'IMI_SERVICES_INITIALIZED',
};

const EngageWidget: React.FC<EngageWidgetProps> = ({accessToken, currentTheme, isSdkReady}) => {
  const [isBundleLoaded, setIsBundleLoaded] = useState(false);
  const [isEngageInitialized, setIsEngageInitialized] = useState(false);
  const engageElmRef = useRef<HTMLDivElement>(null);
  const agentName = useRef('');
  const agentId = useRef('');
  const [isFloatingWindowOpen, setIsFloatingWindowOpen] = useState(false);
  const [currentTaskType, setCurrentTaskType] = useState<string | null>(null);
  const [hasNewTask, setHasNewTask] = useState(false);

  // Add a ref to track the last rendered task ID and content type
  const lastRenderedTask = useRef<{
    taskId: string | null;
    mediaType: string | null;
    contentType: string | null;
  }>({
    taskId: null,
    mediaType: null,
    contentType: null,
  });

  // Add the CSS links to the document head
  useEffect(() => {
    // TODO: Remove this when we include the momentum-ui in the bundle using npm
    // Add momentum-ui.min.css
    const momentumCss = document.createElement('link');
    momentumCss.rel = 'stylesheet';
    momentumCss.type = 'text/css';
    momentumCss.href = 'https://wc.imiengage.io/v0.9.11/momentum/css/momentum-ui.min.css';
    document.head.appendChild(momentumCss);

    // Add momentum-ui-icons.css
    const momentumIconsCss = document.createElement('link');
    momentumIconsCss.rel = 'stylesheet';
    momentumIconsCss.type = 'text/css';
    momentumIconsCss.href = 'https://wc.imiengage.io/v0.9.11/momentum/css/momentum-ui-icons.css';
    document.head.appendChild(momentumIconsCss);

    // Clean up on unmount
    return () => {
      if (momentumCss.parentNode) {
        momentumCss.parentNode.removeChild(momentumCss);
      }
      if (momentumIconsCss.parentNode) {
        momentumIconsCss.parentNode.removeChild(momentumIconsCss);
      }
    };
  }, []);

  // Load the IMI Engage script
  useEffect(() => {
    // Load the IMI Engage script
    const engageScript = document.createElement('script');
    engageScript.id = 'imi-controller-bundle';
    engageScript.src = 'https://wc.imiengage.io/engage.js';
    engageScript.defer = true;
    engageScript.setAttribute('dc', 'produs1');
    document.head.appendChild(engageScript);

    // Load the Momentum script
    const momentumScript = document.createElement('script');
    momentumScript.id = 'momentum-script';
    momentumScript.src = 'https://wc.imiengage.io/v0.9.11/momentum/momentum.js';
    momentumScript.defer = true;
    document.head.appendChild(momentumScript);

    // Listen for bundle load success
    const handleBundleLoaded = () => {
      console.log('bundle.js has been loaded.');
      setIsBundleLoaded(true);
    };

    document.addEventListener('imi-engage-bundle-load-success', handleBundleLoaded);

    return () => {
      document.removeEventListener('imi-engage-bundle-load-success', handleBundleLoaded);

      // Clean up both scripts on unmount
      if (engageScript.parentNode) {
        engageScript.parentNode.removeChild(engageScript);
      }
      if (momentumScript.parentNode) {
        momentumScript.parentNode.removeChild(momentumScript);
      }
    };
  }, []);

  // Initialize agent info from store when available
  useEffect(() => {
    if (store.agent) {
      agentName.current = store.agent.firstName + ' ' + store.agent.lastName;
      agentId.current = store.agentId || '';
    }
  }, [store.agent, store.agentId]);

  const attachImiEventListener = (name: string, data: any) => {
    switch (name) {
      case IMI_EVENTS.MESSAGE_RECEIVED:
        console.info('onMessageReceived', data);
        break;
      case IMI_EVENTS.CONV_LOADED:
        console.info('Conversation Loaded event', data);
        break;
      case IMI_EVENTS.CONV_LOAD_ERROR:
        console.info('Conversation Loaded Error event', data);
        break;
      case IMI_EVENTS.LIVECHAT_CHAT_CLOSED:
        console.info('Conversation Closed event', data);
        break;
      case IMI_EVENTS.IMI_SERVICES_INITIALIZED:
        console.info('IMI Services initialized event', data);
        setIsEngageInitialized(true);
        break;
      default:
        break;
    }
  };

  // Add function to initialize the engage widget
  const initializeEngageWidget = () => {
    if (isBundleLoaded && accessToken) {
      const config = {
        logger: console,
        cb: (name: string, data) => attachImiEventListener(name, data),
      };

      if (window.ImiEngageWC) {
        const imiEngageWC = new window.ImiEngageWC(config);

        imiEngageWC.setParam('data', {
          jwt: accessToken,
          lang: 'en-US',
          source: 'wxcc',
        });
        // Set flag to indicate engage widget is initialized
        console.log('IMI Engage widget successfully initialized');
      } else {
        console.error('ImiEngageWC not available yet.');
      }
    } else {
      console.error('Bundle not loaded yet or access token missing.');
    }
  };

  // Initialize the widget when isSdkReady, bundle loads and we have a token
  useEffect(() => {
    if (isSdkReady && isBundleLoaded && accessToken) {
      initializeEngageWidget();
    }
  }, [isSdkReady, isBundleLoaded, accessToken]);

  // Add functions to load chat and email widgets
  const loadChatWidget = useCallback(
    (task: any) => {
      // Always set the task type regardless of window state
      setCurrentTaskType('chat');

      // Only update the DOM if the window is open
      if (isFloatingWindowOpen && engageElmRef.current) {
        const mediaId = task.data.interaction.callAssociatedDetails.mediaResourceId;
        const taskId = task.data?.interactionId;
        const mediaType = task.data?.interaction?.mediaType;

        engageElmRef.current.innerHTML = `
        <imi-engage 
          theme="${currentTheme}"
          lang="en-US" 
          conversationid="${mediaId}"
        ></imi-engage>
      `;

        // Update last rendered task
        lastRenderedTask.current = {
          taskId,
          mediaType,
          contentType: 'chat',
        };
      }
    },
    [isFloatingWindowOpen, currentTheme]
  );

  const loadEmailWidget = useCallback(
    (task: any) => {
      // Always set the task type regardless of window state
      setCurrentTaskType('email');

      // Only update the DOM if the window is open
      if (isFloatingWindowOpen && engageElmRef.current) {
        const mediaId = task.data.interaction.callAssociatedDetails.mediaResourceId;
        const taskId = task.data?.interactionId;
        const mediaType = task.data?.interaction?.mediaType;

        engageElmRef.current.innerHTML = `
        <imi-email-composer
          taskId="${mediaId}"
          orgId="${task.data.orgId}"
          agentName="${agentName.current}"
          agentId="${agentId.current}"
          interactionId="${task.data.interactionId}"
        ></imi-email-composer>
      `;

        // Update last rendered task
        lastRenderedTask.current = {
          taskId,
          mediaType,
          contentType: 'email',
        };
      }
    },
    [isFloatingWindowOpen, currentTheme]
  );

  // Handle when task exists before bundle loads and when task changes
  useEffect(() => {
    // Only proceed if bundle is loaded
    if (!isBundleLoaded || !isEngageInitialized) return;

    // Check if we have a current task
    if (store.currentTask) {
      // Define chat and social media types
      const chatAndSocial = ['chat', 'social'];

      // Get the media type safely
      const mediaType = store.currentTask.data?.interaction?.mediaType;

      // Skip telephony tasks
      if (mediaType === 'telephony') {
        console.log('Telephony task detected, not showing in engage widget');
        if (engageElmRef.current) {
          engageElmRef.current.innerHTML = '';
        }
        setCurrentTaskType(null);
        return;
      }

      // Show notification that a new task has arrived
      setHasNewTask(true);
      setTimeout(() => setHasNewTask(false), 5000); // Hide notification after 5 seconds

      // Load the appropriate widget based on media type
      if (mediaType && chatAndSocial.includes(mediaType) && !store.currentTask.data.wrapUpRequired) {
        console.log('Loading chat widget for task:', store.currentTask);
        loadChatWidget(store.currentTask);
      } else if (mediaType === 'email' && !store.currentTask.data.wrapUpRequired) {
        console.log('Loading email widget for task:', store.currentTask);
        loadEmailWidget(store.currentTask);
      } else {
        // Clear the widget container for other media types
        if (engageElmRef.current) {
          engageElmRef.current.innerHTML = '';
        }
        setCurrentTaskType(null);
      }
    } else {
      // Clear the widget container when there is no current task
      if (engageElmRef.current) {
        engageElmRef.current.innerHTML = '';
      }
      setCurrentTaskType(null);
    }
  }, [store.currentTask, isBundleLoaded, isEngageInitialized, currentTheme]);

  // Handle when engage gets initialized with existing task
  useEffect(() => {
    if (isEngageInitialized && store.currentTask) {
      console.log('Engage initialized with existing task, loading widget for:', store.currentTask);

      // Define chat and social media types
      const chatAndSocial = ['chat', 'social'];

      // Get the media type safely
      const mediaType = store.currentTask.data?.interaction?.mediaType;

      // Skip telephony tasks
      if (mediaType === 'telephony') {
        console.log('Telephony task detected, not showing in engage widget');
        return;
      }

      if (mediaType && chatAndSocial.includes(mediaType) && !store.currentTask.data.wrapUpRequired) {
        loadChatWidget(store.currentTask);
      } else if (mediaType === 'email' && !store.currentTask.data.wrapUpRequired) {
        loadEmailWidget(store.currentTask);
      }
    }
  }, [isEngageInitialized]);

  // Toggle floating window
  const toggleFloatingWindow = useCallback(() => {
    const willBeOpen = !isFloatingWindowOpen;
    setIsFloatingWindowOpen(willBeOpen);

    // Only re-render if opening the window (no need to re-render when closing)
    if (willBeOpen && store.currentTask && currentTaskType) {
      const mediaType = store.currentTask.data?.interaction?.mediaType;
      const taskId = store.currentTask.data?.interactionId;
      const chatAndSocial = ['chat', 'social'];

      // Skip telephony tasks
      if (mediaType === 'telephony') {
        console.log('Telephony task detected, not showing in engage widget');
        return;
      }

      // Check if this is the same task we already rendered
      const sameTask =
        taskId === lastRenderedTask.current.taskId &&
        mediaType === lastRenderedTask.current.mediaType &&
        currentTaskType === lastRenderedTask.current.contentType;

      // Only update DOM if it's a new task or different type
      if (!sameTask) {
        setTimeout(() => {
          if (mediaType && chatAndSocial.includes(mediaType) && !store.currentTask.data.wrapUpRequired) {
            // Re-load the chat widget content
            if (engageElmRef.current) {
              const mediaId = store.currentTask.data.interaction.callAssociatedDetails.mediaResourceId;
              engageElmRef.current.innerHTML = `
                <imi-engage 
                  theme="${currentTheme}"
                  lang="en-US" 
                  conversationid="${mediaId}"
                ></imi-engage>
              `;

              // Update last rendered task info
              lastRenderedTask.current = {
                taskId,
                mediaType,
                contentType: 'chat',
              };
            }
          } else if (mediaType === 'email' && !store.currentTask.data.wrapUpRequired) {
            // Re-load the email widget content
            if (engageElmRef.current) {
              const mediaId = store.currentTask.data.interaction.callAssociatedDetails.mediaResourceId;
              engageElmRef.current.innerHTML = `
                <imi-email-composer
                  taskId="${mediaId}"
                  orgId="${store.currentTask.data.orgId}"
                  agentName="${agentName.current}"
                  agentId="${agentId.current}"
                  interactionId="${store.currentTask.data.interactionId}"
                ></imi-email-composer>
              `;

              // Update last rendered task info
              lastRenderedTask.current = {
                taskId,
                mediaType,
                contentType: 'email',
              };
            }
          }
        }, 100); // Short delay to ensure the DOM is ready
      } else {
        console.log('Same task already rendered, skipping re-render');
      }
    }
  }, [isFloatingWindowOpen, store.currentTask, currentTaskType, currentTheme]);

  // Get the icon and title based on task type
  const getTaskIcon = () => {
    if (currentTaskType === 'chat' || currentTaskType === 'social') {
      return {icon: '💬', title: 'Chat Task'};
    } else if (currentTaskType === 'email') {
      return {icon: '✉️', title: 'Email Task'};
    }
    return {icon: '📋', title: 'Task'};
  };

  const {icon, title} = getTaskIcon();

  // Determine button class based on task state
  const getButtonClass = () => {
    const baseClass = 'engage-floating-button';
    if (hasNewTask) {
      return `${baseClass} has-new-task`;
    } else if (currentTaskType) {
      return `${baseClass} has-task`;
    }
    return `${baseClass} no-task`;
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggleFloatingWindow}
        className={getButtonClass()}
        title={currentTaskType ? `Open ${title}` : 'No active tasks'}
      >
        {currentTaskType ? icon : '💬'}
        <div className={`engage-notification ${!hasNewTask ? 'hidden' : ''}`}>!</div>
      </button>

      {/* Floating window */}
      <div className={`engage-floating-window ${!isFloatingWindowOpen ? 'hidden' : ''}`}>
        <div className={`engage-window-header ${currentTheme === 'DARK' ? 'dark' : 'light'}`}>
          <h3 className="engage-window-title">{currentTaskType ? title : 'No Active Task'}</h3>
          <button
            className={`engage-close-button ${currentTheme === 'DARK' ? 'dark' : 'light'}`}
            onClick={toggleFloatingWindow}
          >
            ×
          </button>
        </div>
        <div className="engage-content-area">
          <div ref={engageElmRef} className="engage-widget-container"></div>
          {!currentTaskType && (
            <div className="engage-content-placeholder">
              No active tasks available. When you receive a task, it will appear here.
            </div>
          )}
        </div>
      </div>

      {/* Original widget container (hidden) */}
      <div className="box" style={{display: 'none'}}>
        <section className="section-box">
          <fieldset className="fieldset">
            <legend className="legend-box">IMI Engage Widget</legend>
            <div style={{height: '0px'}}></div>
          </fieldset>
        </section>
      </div>
    </>
  );
};

// Add TypeScript declarations for the global objects
declare global {
  interface Window {
    ImiEngageWC: any;
    store: any;
    AGENTX_SERVICE: any;
  }
}

export default EngageWidget;
