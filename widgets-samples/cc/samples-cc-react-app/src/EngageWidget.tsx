import React, {useState, useEffect, useRef} from 'react';
import {store} from '@webex/cc-widgets';

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

  const attachImiEventListener = (name: string, data: unknown) => {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadChatWidget = (task: any) => {
    if (!engageElmRef.current) return;

    const mediaId = task.data.interaction.callAssociatedDetails.mediaResourceId;
    engageElmRef.current.style.height = '500px';
    engageElmRef.current.innerHTML = `
      <imi-engage 
        theme="${currentTheme}"
        lang="en-US" 
        conversationid="${mediaId}"
      ></imi-engage>
    `;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadEmailWidget = (task: any) => {
    if (!engageElmRef.current) return;

    engageElmRef.current.style.height = '900px';
    const mediaId = task.data.interaction.callAssociatedDetails.mediaResourceId;
    engageElmRef.current.innerHTML = `
      <imi-email-composer
        taskId="${mediaId}"
        orgId="${task.data.orgId}"
        agentName="${agentName.current}"
        agentId="${agentId.current}"
        interactionId="${task.data.interactionId}"
      ></imi-email-composer>
    `;
  };

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
          engageElmRef.current.style.height = '0px';
        }
      }
    } else {
      // Clear the widget container when there is no current task
      if (engageElmRef.current) {
        engageElmRef.current.innerHTML = '';
        engageElmRef.current.style.height = '0px';
      }
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

      if (mediaType && chatAndSocial.includes(mediaType) && !store.currentTask.data.wrapUpRequired) {
        loadChatWidget(store.currentTask);
      } else if (mediaType === 'email' && !store.currentTask.data.wrapUpRequired) {
        loadEmailWidget(store.currentTask);
      }
    }
  }, [isEngageInitialized]);

  return (
    <div className="box">
      <section className="section-box">
        <fieldset className="fieldset">
          <legend className="legend-box">IMI Engage Widget</legend>
          <div ref={engageElmRef} style={{height: '0px', transition: 'height 0.3s ease'}}></div>
        </fieldset>
      </section>
    </div>
  );
};

export default EngageWidget;
