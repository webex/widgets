import React, {useState} from 'react';
import {Text, TabListNext, TabNext, ListNext} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps} from '../../task.types';
import ConsultTransferEmptyState from './consult-transfer-empty-state';

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

  const noAgents = !filteredAgents || filteredAgents.length === 0;
  const noQueues = !filteredQueues || filteredQueues.length === 0;
  const showTabs = !(noAgents && noQueues);

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
      <Text tagName="h3" className="agent-popover-title" type="body-large-bold" style={{margin: 0}}>
        {heading}
      </Text>

      {/* Only show tabs if at least one list is available */}
      {showTabs && (
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
      )}

      {/* If both are empty, show the big empty state */}
      {!showTabs && <ConsultTransferEmptyState message="We can’t find any queue or agent available for now." />}

      {/* If agents tab is selected and empty */}
      {showTabs && selectedTab === 'Agents' && noAgents && (
        <ConsultTransferEmptyState message="We can’t find any agent available for now." />
      )}

      {/* If queues tab is selected and empty */}
      {showTabs && selectedTab === 'Queues' && noQueues && (
        <ConsultTransferEmptyState message="We can’t find any queue available for now." />
      )}

      {/* Render lists if not empty */}
      {showTabs &&
        selectedTab === 'Agents' &&
        !noAgents &&
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

      {showTabs &&
        selectedTab === 'Queues' &&
        !noQueues &&
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
