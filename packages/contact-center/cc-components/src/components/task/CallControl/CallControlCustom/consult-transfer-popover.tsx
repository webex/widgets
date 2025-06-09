import React, {useState} from 'react';
import {Text, TabListNext, TabNext, ListNext} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps} from '../../task.types';

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverComponentProps> = ({
  heading,
  buttonIcon,
  buddyAgents,
  queues,
  onAgentSelect,
  onQueueSelect,
  allowConsultToQueue,
  logger,
}) => {
  const [selectedTab, setSelectedTab] = useState('Agents');
  const filteredAgents = buddyAgents;
  const filteredQueues = queues;

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
            logger={logger}
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
        aria-label="Tabs"
        className="agent-tablist"
        hasBackground={false}
        style={{marginTop: '0'}}
        onTabSelection={(key) => {
          setSelectedTab(key as string);
          logger.log(`CC-Widgets: ConsultTransferPopover: tab selected: ${key}`, {
            module: 'consult-transfer-popover.tsx',
            method: 'onTabSelection',
          });
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
          (id, name) => {
            logger.info(`CC-Widgets: ConsultTransferPopover: agent selected: ${id}`, {
              module: 'consult-transfer-popover.tsx',
              method: 'onAgentSelect',
            });
            onAgentSelect(id, name);
          }
        )}

      {selectedTab === 'Queues' &&
        allowConsultToQueue &&
        renderList(
          filteredQueues,
          (queue) => queue.id,
          (queue) => queue.name,
          (id, name) => {
            logger.log(`CC-Widgets: ConsultTransferPopover: queue selected: ${id}`, {
              module: 'consult-transfer-popover.tsx',
              method: 'onQueueSelect',
            });
            (onQueueSelect || (() => {}))(id, name);
          }
        )}
    </div>
  );
};

export default ConsultTransferPopoverComponent;
