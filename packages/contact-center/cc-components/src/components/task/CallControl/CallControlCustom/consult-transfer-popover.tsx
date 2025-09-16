import React, {useState} from 'react';
import {Text, TabListNext, TabNext, ListNext} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps} from '../../task.types';
import ConsultTransferEmptyState from './consult-transfer-empty-state';
import {
  isAgentsEmpty,
  isQueuesEmpty,
  handleTabSelection,
  handleAgentSelection,
  handleQueueSelection,
  getEmptyStateMessage,
} from './call-control-custom.utils';
import DialNumberUI from './consult-transfer-dial-number';
import {AGENTS, DIAL_NUMBER, QUEUES} from '../../constants';

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverComponentProps> = ({
  heading,
  buttonIcon,
  buddyAgents,
  queues,
  onAgentSelect,
  onQueueSelect,
  onDialNumberSelect,
  allowConsultToQueue,
  logger,
}) => {
  const [selectedTab, setSelectedTab] = useState(AGENTS);
  const filteredAgents = buddyAgents;
  const filteredQueues = queues;

  const noAgents = isAgentsEmpty(filteredAgents);
  const noQueues = isQueuesEmpty(filteredQueues);
  const showTabs = true; // Always show tabs to allow dial number option

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
            handleTabSelection(key as string, setSelectedTab, logger);
          }}
        >
          <TabNext key={AGENTS} className="agent-tab" active={selectedTab === AGENTS}>
            Agents
          </TabNext>
          <TabNext
            key={QUEUES}
            className="queue-tab"
            active={selectedTab === QUEUES}
            disabled={!allowConsultToQueue}
            style={!allowConsultToQueue ? {display: 'none'} : undefined}
          >
            Queues
          </TabNext>
          <TabNext key={DIAL_NUMBER} className="dial-number-tab" active={selectedTab === DIAL_NUMBER}>
            Dial Number
          </TabNext>
        </TabListNext>
      )}

      {/* If both are empty, show the big empty state */}
      {!showTabs && <ConsultTransferEmptyState message={getEmptyStateMessage(selectedTab, showTabs)} />}

      {/* If agents tab is selected and empty */}
      {showTabs && selectedTab === AGENTS && noAgents && (
        <ConsultTransferEmptyState message={getEmptyStateMessage(selectedTab, showTabs)} />
      )}

      {/* If queues tab is selected and empty */}
      {showTabs && selectedTab === QUEUES && noQueues && (
        <ConsultTransferEmptyState message={getEmptyStateMessage(selectedTab, showTabs)} />
      )}

      {/* Render lists if not empty */}
      {showTabs &&
        selectedTab === AGENTS &&
        !noAgents &&
        renderList(
          filteredAgents,
          (agent) => agent.agentId,
          (agent) => agent.agentName,
          (id, name) => {
            handleAgentSelection(id, name, onAgentSelect, logger);
          }
        )}

      {showTabs &&
        selectedTab === QUEUES &&
        !noQueues &&
        renderList(
          filteredQueues,
          (queue) => queue.id,
          (queue) => queue.name,
          (id, name) => {
            handleQueueSelection(id, name, onQueueSelect, logger);
          }
        )}
      {showTabs && selectedTab === DIAL_NUMBER && (
        <DialNumberUI
          title="Dial Number"
          buttonIcon={buttonIcon}
          onButtonPress={(dialNumber) => {
            onDialNumberSelect(dialNumber);
          }}
          logger={logger}
        />
      )}
    </div>
  );
};

export default ConsultTransferPopoverComponent;
