import React from 'react';
import {Avatar} from '@momentum-design/components/dist/react';
import {ChannelAvatarProps} from './granular-agent-state.types';
import {CHANNEL_AVATAR_ICONS} from './constant';
import {getPresenceType} from './granular-agent-state.utils';

const ChannelAvatar: React.FunctionComponent<ChannelAvatarProps> = ({channel, size = 32}) => (
  <Avatar
    size={size}
    iconName={CHANNEL_AVATAR_ICONS[channel.channelType]}
    presence={getPresenceType(channel.agentState, channel.pendingIdle)}
    className={`granular-channel-avatar ${channel.channelType}`}
    title={`${channel.label}: ${channel.displayState}`}
    data-testid={`granular-channel-avatar-${channel.channelType}`}
  />
);

export default ChannelAvatar;
