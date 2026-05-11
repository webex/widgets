import React, {useRef} from 'react';
import {Popover} from '@momentum-design/components/dist/react';
import CampaignTaskListItem from '../CampaignTaskListItem/campaign-task-list-item';
import GlobalVariablesPanel from '../../GlobalVariablesPanel/global-variables-panel';
import {CampaignTaskPopoverProps} from './campaign-task-popover.types';
import {CallAssociatedDataMap, getCallerIdentifier} from '../../task.types';
import {getAgentViewableGlobalVariables} from '../../Task/task.utils';
import {CampaignCallProcessingDetails} from '../campaign-task.types';
import './campaign-task-popover.style.scss';

const POPOVER_WIDTH = '440px';
const POPOVER_DELAY = '200,100';

const getCampaignCpd = (cpd: Record<string, unknown> | undefined): CampaignCallProcessingDetails => {
  if (!cpd) return {};
  return cpd as CampaignCallProcessingDetails;
};

const CampaignTaskPopover: React.FC<CampaignTaskPopoverProps> = ({
  task,
  logger,
  triggerId,
  isAcceptClicked,
  isAcceptDisabled,
  isSkipDisabled,
  isRemoveDisabled,
  onAccept,
  onSkip,
  onRemove,
  onTimeout,
  handleTimestamp,
}) => {
  const cpd = task.data.interaction.callProcessingDetails;
  const campaignCpd = getCampaignCpd(cpd as unknown as Record<string, unknown>);
  const timeoutTimestamp = campaignCpd.campaignPreviewOfferTimeout;

  // @ts-expect-error callAssociatedDetails not yet typed in SDK
  const callAssociatedDetails = task.data.interaction.callAssociatedDetails;
  const ani = callAssociatedDetails?.ani ?? '';
  const dn = callAssociatedDetails?.dn ?? '';
  const customerName = callAssociatedDetails?.customerName;
  const outboundType = task.data.interaction.outboundType;
  const title = customerName || getCallerIdentifier(ani, dn, outboundType);
  const phoneNumber = getCallerIdentifier(ani, dn, outboundType);

  const callAssociatedData = (task.data.interaction as unknown as {callAssociatedData?: CallAssociatedDataMap})
    .callAssociatedData;
  const latestGlobalVariables = getAgentViewableGlobalVariables(callAssociatedData);

  // Persist global variables across task updates — some store refreshes
  // replace the task with a snapshot that omits callAssociatedData.
  const globalVariablesRef = useRef(latestGlobalVariables);
  if (latestGlobalVariables.length > 0) {
    globalVariablesRef.current = latestGlobalVariables;
  }
  const globalVariables = globalVariablesRef.current;

  return (
    <Popover
      triggerID={triggerId}
      trigger="mouseenter"
      placement="right"
      interactive
      delay={POPOVER_DELAY}
      className="campaign-task-popover"
      style={{['--mdc-popover-width' as string]: POPOVER_WIDTH}}
      data-testid="campaign-task-popover"
    >
      <div className="campaign-task-popover__content">
        <CampaignTaskListItem
          title={title}
          phoneNumber={phoneNumber}
          customerName={customerName}
          timeoutTimestamp={timeoutTimestamp}
          isAcceptClicked={isAcceptClicked}
          isAcceptDisabled={isAcceptDisabled}
          isSkipDisabled={isSkipDisabled}
          isRemoveDisabled={isRemoveDisabled}
          onAccept={onAccept}
          onSkip={onSkip}
          onRemove={onRemove}
          onTimeout={onTimeout}
          handleTimestamp={handleTimestamp}
          logger={logger}
          className="campaign-task-popover__list-item"
          testIdPrefix="campaign-popover"
        />

        <GlobalVariablesPanel
          variables={globalVariables}
          layout="two-column"
          panelBackground="var(--mds-color-theme-background-primary-hover)"
        />
      </div>
    </Popover>
  );
};

export default CampaignTaskPopover;
