import React, {useState, useEffect} from 'react';
import {Text, TabListNext, TabNext, ListNext} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps} from '../../task.types';

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverComponentProps> = ({
  heading,
  buttonIcon,
  buddyAgents,
  contactServiceQueues,
  onAgentSelect,
  onQueueSelect,
  allowConsultToQueue,
}) => {
  const [selectedTab, setSelectedTab] = useState('Agents');
  const filteredAgents = buddyAgents;
  const filteredQueues = contactServiceQueues || [];

  // Ensure selected tab is valid when allowConsultToQueue changes
  useEffect(() => {
    if (selectedTab === 'Queues' && !allowConsultToQueue) {
      setSelectedTab('Agents');
    }
  }, [allowConsultToQueue, selectedTab]);

  const renderList = (items, getKey, getTitle, handleSelect) => (
    <ListNext listSize={items.length} className="agent-list">
      {items.map((item) => (
        <div
          key={getKey(item)}
          onMouseDown={(e) => e.stopPropagation()}
          style={{cursor: 'pointer', pointerEvents: 'auto'}}
        >
          <ConsultTransferListComponent
            title={getTitle(item)}
            buttonIcon={buttonIcon}
            onButtonPress={() => handleSelect(getKey(item), getTitle(item))}
          />
        </div>
      ))}
      {items.length === 0 && (
        <Text tagName="small" type="body-secondary">
          No {selectedTab.toLowerCase()} found
        </Text>
      )}
    </ListNext>
  );

  return (
    <div className="agent-popover-content">
      <Text tagName="h3" className="agent-popover-title" type="body-large-bold" style={{margin: '0 0 0 0'}}>
        {heading}
      </Text>
      <TabListNext
        key={`tab-list-${allowConsultToQueue ? 'with-queues' : 'agents-only'}`}
        aria-label="Tabs"
        className="agent-tablist"
        hasBackground={false}
        style={{marginTop: '0'}}
        onTabSelection={(key) => {
          if (key === 'Queues' && !allowConsultToQueue) return;
          setSelectedTab(key as string);
        }}
      >
        <TabNext key="Agents" className="agent-tab" active={selectedTab === 'Agents'}>
          Agents
        </TabNext>
        <TabNext
          key="Queues"
          className="queue-tab"
          active={selectedTab === 'Queues'}
          disabled={!allowConsultToQueue}
          style={!allowConsultToQueue ? {display: 'none'} : undefined}
        >
          Queues
        </TabNext>
      </TabListNext>

      {selectedTab === 'Agents' &&
        renderList(
          filteredAgents,
          (agent) => agent.agentId,
          (agent) => agent.agentName,
          onAgentSelect
        )}

      {selectedTab === 'Queues' &&
        allowConsultToQueue &&
        renderList(
          filteredQueues,
          (queue) => queue.id,
          (queue) => queue.name,
          onQueueSelect || (() => {})
        )}
    </div>
  );
};

export default ConsultTransferPopoverComponent;
