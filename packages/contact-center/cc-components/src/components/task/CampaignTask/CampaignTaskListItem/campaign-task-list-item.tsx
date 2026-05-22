import React from 'react';
import {Avatar, Button, ListItem, Text, Tooltip} from '@momentum-design/components/dist/react';
import CampaignCountdown from '../../CampaignCountdown/campaign-countdown';
import TaskTimer from '../../TaskTimer/index';
import {CampaignTaskListItemProps} from '../../task.types';
import {
  CAMPAIGN_ACCEPT,
  CAMPAIGN_CONNECTING,
  CAMPAIGN_SKIP,
  CAMPAIGN_SKIP_TOOLTIP,
  CAMPAIGN_SKIP_DISABLED_TOOLTIP,
  CAMPAIGN_REMOVE,
  CAMPAIGN_REMOVE_TOOLTIP,
  CAMPAIGN_REMOVE_DISABLED_TOOLTIP,
  CAMPAIGN_ACTIONS_LABEL,
  HANDLE_TIME,
} from '../../constants';

/**
 * CampaignTaskListItem renders the ListItem row shared between the
 * CampaignTask inline card and the CampaignTaskPopover.
 *
 * Layout: Avatar | Title / Phone / Countdown | Accept + Skip/Remove buttons
 */
const CampaignTaskListItem: React.FC<CampaignTaskListItemProps> = ({
  title,
  phoneNumber,
  customerName,
  timeoutTimestamp,
  isAcceptClicked,
  isAccepted,
  isAcceptDisabled,
  isSkipDisabled,
  isRemoveDisabled,
  onAccept,
  onSkip,
  onRemove,
  onTimeout,
  handleTimestamp,
  logger,
  className,
  testIdPrefix = 'campaign-task',
}) => {
  const skipTooltipText = isSkipDisabled ? CAMPAIGN_SKIP_DISABLED_TOOLTIP : CAMPAIGN_SKIP_TOOLTIP;
  const removeTooltipText = isRemoveDisabled ? CAMPAIGN_REMOVE_DISABLED_TOOLTIP : CAMPAIGN_REMOVE_TOOLTIP;
  const skipButtonId = `${testIdPrefix}-skip-btn`;
  const removeButtonId = `${testIdPrefix}-remove-btn`;

  return (
    <ListItem className={className} data-testid={`${testIdPrefix}-list-item`}>
      <Avatar slot="leading-controls" icon-name="campaign-management-bold" className="campaign-avatar" />

      <Text slot="leading-text-primary-label" type="body-large-medium" data-testid={`${testIdPrefix}-title`}>
        {title}
      </Text>
      {customerName && phoneNumber && phoneNumber !== customerName && (
        <Text slot="leading-text-secondary-label" type="body-midsize-regular" data-testid={`${testIdPrefix}-phone`}>
          {phoneNumber}
        </Text>
      )}
      {!isAccepted && timeoutTimestamp && (
        <div slot="leading-text-tertiary-label">
          <CampaignCountdown timeoutTimestamp={timeoutTimestamp} onTimeout={onTimeout} logger={logger} />
        </div>
      )}
      {isAccepted && handleTimestamp && (
        <Text
          slot="leading-text-tertiary-label"
          tagname="span"
          type="body-midsize-regular"
          className="campaign-task-handle-time"
          data-testid={`${testIdPrefix}-handle-time`}
        >
          {HANDLE_TIME} <TaskTimer startTimeStamp={handleTimestamp} />
        </Text>
      )}

      {!isAccepted && (
        <div
          slot="trailing-controls"
          className="campaign-task-actions"
          aria-label={CAMPAIGN_ACTIONS_LABEL}
          data-testid={`${testIdPrefix}-actions`}
        >
          {!isAcceptClicked ? (
            <Button
              variant="primary"
              color="positive"
              size={28}
              onClick={onAccept}
              disabled={isAcceptDisabled}
              aria-label={CAMPAIGN_ACCEPT}
              data-testid={`${testIdPrefix}-accept-button`}
            >
              {CAMPAIGN_ACCEPT}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size={28}
              disabled
              aria-label={CAMPAIGN_CONNECTING}
              data-testid={`${testIdPrefix}-connecting-button`}
            >
              {CAMPAIGN_CONNECTING}
            </Button>
          )}

          <div
            className="campaign-task-skip-remove"
            role="group"
            aria-label={`${CAMPAIGN_SKIP} and ${CAMPAIGN_REMOVE}`}
            data-testid={`${testIdPrefix}-skip-remove`}
          >
            <Button
              id={skipButtonId}
              variant="secondary"
              size={28}
              prefixIcon="skip-bold"
              onClick={onSkip}
              disabled={isSkipDisabled}
              aria-label={CAMPAIGN_SKIP}
              data-testid={`${testIdPrefix}-skip-button`}
            />
            <Tooltip triggerID={skipButtonId} placement="bottom" tooltipType="label">
              {skipTooltipText}
            </Tooltip>

            <Button
              id={removeButtonId}
              variant="secondary"
              size={28}
              prefixIcon="remove-bold"
              onClick={onRemove}
              disabled={isRemoveDisabled}
              aria-label={CAMPAIGN_REMOVE}
              data-testid={`${testIdPrefix}-remove-button`}
            />
            <Tooltip triggerID={removeButtonId} placement="bottom" tooltipType="label">
              {removeTooltipText}
            </Tooltip>
          </div>
        </div>
      )}
    </ListItem>
  );
};

export default CampaignTaskListItem;
