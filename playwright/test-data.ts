import {env} from 'process';

require('dotenv').config();

export const USER_SETS = {
  SET_1: {
    AGENTS: {
      AGENT1: {username: 'User16', extension: '1016', agentName: 'User16 Agent16'},
      AGENT2: {username: 'user9', extension: '1009', agentName: 'User9 Agent9'},
    },
    QUEUE_NAME: 'Queue 5',
    CHAT_URL: '',
    EMAIL_ENTRY_POINT: '',
    DIAL_NUMBER: env.PW_DIAL_NUMBER3,
  },
  SET_2: {
    AGENTS: {
      AGENT1: {username: 'user1', extension: '1001', agentName: 'User1 Agent1'},
      AGENT2: {username: 'user2', extension: '1002', agentName: 'User2 Agent2'},
    },
    QUEUE_NAME: 'Queue-1',
    CHAT_URL: 'https://widgets.webex.com/chat-client.html',
    EMAIL_ENTRY_POINT: 'ccsdk.wbx.ai@gmail.com',
    DIAL_NUMBER: env.PW_DIAL_NUMBER1,
  },
  SET_3: {
    AGENTS: {
      AGENT1: {username: 'user15', extension: '1015', agentName: 'User15 Agent15'},
    },
    QUEUE_NAME: '',
    CHAT_URL: '',
    EMAIL_ENTRY_POINT: '',
    DIAL_NUMBER: env.PW_DIAL_NUMBER4,
  },
  SET_4: {
    AGENTS: {
      AGENT1: {username: 'user11', extension: '1011', agentName: 'User11 Agent11'},
      AGENT2: {username: 'user13', extension: '1013', agentName: 'User13 Agent13'},
    },
    QUEUE_NAME: 'Queue 4',
    CHAT_URL: 'https://widgets.webex.com/chat-client-e2e.html',
    EMAIL_ENTRY_POINT: 'ccsdk.wbx.ai.e2e@gmail.com',
    DIAL_NUMBER: env.PW_DIAL_NUMBER2,
  },
};
