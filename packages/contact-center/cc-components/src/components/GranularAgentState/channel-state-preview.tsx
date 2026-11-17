import React from 'react';
import {Text} from '@momentum-design/components/dist/react';
import ChannelAvatar from './channel-avatar';
import {ChannelStatePreviewProps} from './granular-agent-state.types';
import {formatDuration} from './granular-agent-state.utils';

const ChannelStatePreview: React.FunctionComponent<ChannelStatePreviewProps> = ({channels}) => (
  <div className="granular-state-preview" role="tooltip" data-testid="granular-state-preview">
    {channels.map((channel) => (
      <div
        key={channel.channelType}
        className="granular-state-preview-item"
        data-testid={`granular-state-preview-item-${channel.channelType}`}
      >
        <ChannelAvatar channel={channel} size={32} />
        <Text tagname="span" type="body-large-regular" className="granular-state-preview-label">
          <strong>{channel.label}</strong> : {channel.displayState}
        </Text>
        <Text tagname="span" type="body-large-regular" className="granular-state-preview-time">
          {formatDuration(channel.elapsedTime)}
        </Text>
      </div>
    ))}
  </div>
);

export default ChannelStatePreview;
