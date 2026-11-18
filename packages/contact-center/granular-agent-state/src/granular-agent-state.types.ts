import {IGranularAgentState} from '@webex/cc-components';
import {IContactCenter} from '@webex/cc-store';

export type IGranularAgentStateProps = Pick<IGranularAgentState, 'onStateChange'>;

export type UseGranularAgentStateProps = Pick<
  IGranularAgentState,
  'channelStatesMap' | 'idleCodes' | 'logger' | 'onStateChange'
> & {
  cc: IContactCenter;
  agentId: string;
};
