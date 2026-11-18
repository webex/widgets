import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Button, Icon, Text, Toggle} from '@momentum-design/components/dist/react';
import {ManageChannelAvailabilityProps, SelectableChannelType} from './granular-agent-state.types';
import {ALL_CHANNELS_ICON, CHANNEL_MANAGE_ICONS, granularAgentStateLabels} from './constant';

type Availability = Partial<Record<SelectableChannelType, boolean>>;

const toAvailability = (channels: ManageChannelAvailabilityProps['channels']): Availability =>
  Object.fromEntries(channels.map((channel) => [channel.channelType, channel.isAvailable]));

const ManageChannelAvailability: React.FunctionComponent<ManageChannelAvailabilityProps> = ({
  channels,
  isSettingAgentState,
  applyError,
  onApply,
  onCancel,
}) => {
  // Keyed on availability values, not the array: `channels` is rebuilt every timer tick.
  const availabilityKey = channels.map((channel) => `${channel.channelType}:${channel.isAvailable}`).join('|');
  const initialAvailability = useMemo(() => toAvailability(channels), [availabilityKey]);
  const [availability, setAvailability] = useState<Availability>(initialAvailability);
  const previousInitialAvailability = useRef(initialAvailability);

  // Merge SDK updates into the draft without discarding choices that have not
  // yet been confirmed. This matters when Apply sends Available then Idle.
  useEffect(() => {
    const previous = previousInitialAvailability.current;
    previousInitialAvailability.current = initialAvailability;
    setAvailability((prev) => {
      const next = {...initialAvailability};
      (Object.keys(initialAvailability) as SelectableChannelType[]).forEach((key) => {
        if (prev[key] !== previous[key]) next[key] = prev[key];
      });
      const keys = Object.keys(next) as SelectableChannelType[];
      const unchanged = keys.length === Object.keys(prev).length && keys.every((key) => prev[key] === next[key]);
      return unchanged ? prev : next;
    });
  }, [initialAvailability]);

  const allAvailable = channels.length > 0 && channels.every((channel) => availability[channel.channelType]);
  const changed = channels
    .filter((channel) => availability[channel.channelType] !== initialAvailability[channel.channelType])
    .reduce<Availability>((acc, channel) => ({...acc, [channel.channelType]: availability[channel.channelType]}), {});
  const hasChanges = Object.keys(changed).length > 0;

  const setAll = (value: boolean) =>
    setAvailability(Object.fromEntries(channels.map((channel) => [channel.channelType, value])));

  const toggleRow = (
    key: string,
    icon: string,
    title: string,
    subtitle: string,
    checked: boolean,
    onToggle: (value: boolean) => void
  ) => (
    <div className="manage-channel-availability-row" key={key} data-testid={`manage-channel-availability-row-${key}`}>
      <Icon name={icon} className="manage-channel-availability-icon" />
      <div className="manage-channel-availability-text">
        <Text tagname="span" type="body-large-medium">
          {title}
        </Text>
        <Text tagname="span" type="body-midsize-regular" className="manage-channel-availability-subtitle">
          {subtitle}
        </Text>
      </div>
      <Toggle
        checked={checked}
        disabled={isSettingAgentState}
        data-aria-label={title}
        onChange={() => onToggle(!checked)}
        data-testid={`manage-channel-availability-toggle-${key}`}
      />
    </div>
  );

  return (
    <div className="manage-channel-availability" data-testid="manage-channel-availability">
      <div className="manage-channel-availability-header">
        <Button
          variant="tertiary"
          prefix-icon="back-bold"
          aria-label={granularAgentStateLabels.goBack}
          onClick={onCancel}
          data-testid="manage-channel-availability-back"
        />
        <Text tagname="h3" type="body-large-bold">
          {granularAgentStateLabels.manageChannelAvailabilityTitle}
        </Text>
      </div>

      <div className="manage-channel-availability-body">
        {toggleRow(
          'all',
          ALL_CHANNELS_ICON,
          granularAgentStateLabels.allChannels,
          granularAgentStateLabels.availableOnAllChannels,
          allAvailable,
          setAll
        )}
        {channels.map((channel) =>
          toggleRow(
            channel.channelType,
            CHANNEL_MANAGE_ICONS[channel.channelType],
            channel.label,
            `${granularAgentStateLabels.stateLabel} : ${channel.displayState}`,
            Boolean(availability[channel.channelType]),
            (value) => setAvailability((prev) => ({...prev, [channel.channelType]: value}))
          )
        )}
      </div>

      {applyError && (
        <Text
          tagname="p"
          type="body-midsize-regular"
          className="manage-channel-availability-error"
          role="alert"
          data-testid="manage-channel-availability-error"
        >
          {applyError}
        </Text>
      )}
      <div className="manage-channel-availability-footer">
        <Button variant="secondary" onClick={onCancel} data-testid="manage-channel-availability-cancel">
          {granularAgentStateLabels.cancel}
        </Button>
        <Button
          variant="primary"
          disabled={!hasChanges || isSettingAgentState}
          onClick={() => onApply(changed)}
          data-testid="manage-channel-availability-apply"
        >
          {granularAgentStateLabels.apply}
        </Button>
      </div>
    </div>
  );
};

export default ManageChannelAvailability;
