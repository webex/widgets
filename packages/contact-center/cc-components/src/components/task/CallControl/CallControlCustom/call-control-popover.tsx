import React, {useState} from 'react';
import {Text, TabListNext, TabNext, ListNext} from '@momentum-ui/react-collaboration';
import CallControlListItemComponent from './call-control-list-item';

export interface CallControlPopoverComponentProps {
  heading: string;
  buttonIcon: string;
  buddyAgents: Array<{agentId: string; agentName: string; dn: string}>;
  onAgentSelect: (agentId: string, agentName: string) => void;
}

const CallControlPopoverComponent: React.FC<CallControlPopoverComponentProps> = ({
  heading,
  buttonIcon,
  buddyAgents,
  onAgentSelect,
}) => {
  const [selectedTab, setSelectedTab] = useState('Agents');
  const filteredAgents = buddyAgents;

  return (
    <div className="agent-popover-content">
      <Text tagName="h3" className="agent-popover-title" type="body-large-bold" style={{margin: '0 0 0 0'}}>
        {heading}
      </Text>
      <TabListNext
        aria-label="Tabs"
        className="agent-tablist"
        hasBackground={false}
        style={{marginTop: '0'}}
        onTabSelection={(key) => setSelectedTab(key as string)}
      >
        <TabNext key="Agents" className="agent-tab" active={selectedTab === 'Agents'}>
          Agents
        </TabNext>
      </TabListNext>
      <ListNext listSize={filteredAgents.length} className="agent-agent-list">
        {filteredAgents.map((agent) => (
          <div
            key={agent.agentId}
            onMouseDown={(e) => e.stopPropagation()}
            style={{cursor: 'pointer', pointerEvents: 'auto'}}
          >
            <CallControlListItemComponent
              title={agent.agentName}
              buttonIcon={buttonIcon}
              onButtonPress={() => onAgentSelect(agent.agentId, agent.agentName)}
            />
          </div>
        ))}
      </ListNext>
      {filteredAgents.length === 0 && (
        <Text tagName="small" type="body-secondary">
          No agents found
        </Text>
      )}
    </div>
  );
};

export default CallControlPopoverComponent;
