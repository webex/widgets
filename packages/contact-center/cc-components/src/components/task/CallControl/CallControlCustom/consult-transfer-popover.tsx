import React, {useState} from 'react';
import {Text, TabListNext, TabNext, ListNext} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps} from '../../task.types';

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverComponentProps> = ({
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
            <ConsultTransferListComponent
              title={agent.agentName}
              buttonIcon={buttonIcon}
              onButtonPress={() => onAgentSelect(agent.agentId)}
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

export default ConsultTransferPopoverComponent;
