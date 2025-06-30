import React from 'react';
import {ButtonPill, ListItemBase, ListItemBaseSection, Text} from '@momentum-ui/react-collaboration';
import {Avatar, Brandvisual} from '@momentum-design/components/dist/react';
import {PressEvent} from '@react-types/shared';
import TaskTimer from '../TaskTimer';
import {getMediaTypeInfo} from '../../../utils';
import type {MEDIA_CHANNEL as MediaChannelType} from '../task.types';
import './styles.scss';

interface TaskProps {
  interactionId?: string;
  title?: string;
  state?: string;
  startTimeStamp?: number;
  ronaTimeout?: number;
  selected?: boolean;
  isIncomingTask?: boolean;
  queue?: string;
  acceptTask?: (e: PressEvent) => void;
  declineTask?: (e: PressEvent) => void;
  onTaskSelect?: (e: PressEvent) => void;
  acceptText?: string;
  declineText?: string;
  disableAccept?: boolean;
  styles?: string;
  mediaType?: MediaChannelType;
  mediaChannel?: MediaChannelType;
}

const Task: React.FC<TaskProps> = ({
  title,
  state,
  startTimeStamp,
  ronaTimeout,
  selected = false,
  styles,
  isIncomingTask = false,
  queue,
  acceptTask,
  declineTask,
  interactionId,
  onTaskSelect,
  acceptText,
  disableAccept = false,
  declineText,
  mediaType,
  mediaChannel,
}) => {
  const capitalizeFirstWord = (str: string) => {
    return str.replace(/^\s*(\w)/, (match, firstLetter) => firstLetter.toUpperCase());
  };
  const currentMediaType = getMediaTypeInfo(mediaType, mediaChannel);
  return (
    <ListItemBase
      className={`task-list-item ${selected ? 'task-list-item--selected' : ''} ${styles}`}
      onPress={onTaskSelect ? onTaskSelect : undefined}
      id={interactionId}
    >
      <ListItemBaseSection position="start">
        {currentMediaType.isBrandVisual ? (
          <div className="brand-visual-background">
            <Brandvisual name={currentMediaType.iconName} className={currentMediaType.className} />
          </div>
        ) : (
          <Avatar icon-name={currentMediaType.iconName} className={currentMediaType.className} />
        )}
      </ListItemBaseSection>

      <ListItemBaseSection position="fill">
        <section className="task-details">
          {title && (
            <Text tagName="span" type={selected ? 'body-large-bold' : 'body-large-medium'} className="task-title">
              {title}
            </Text>
          )}

          {state && !isIncomingTask && (
            <Text tagName="span" type="body-midsize-regular" className="task-text">
              {capitalizeFirstWord(state)}
            </Text>
          )}

          {queue && isIncomingTask && (
            <Text tagName="span" type="body-midsize-regular" className="task-text">
              {capitalizeFirstWord(queue)}
            </Text>
          )}

          {/* Handle Time should render if it's an incoming call without ronaTimeout OR if it's not an incoming call */}
          {(isIncomingTask && !ronaTimeout) || !isIncomingTask
            ? startTimeStamp && (
                <Text tagName="span" type="body-midsize-regular" className="task-text">
                  Handle Time: {'  '}
                  <TaskTimer startTimeStamp={startTimeStamp} />
                </Text>
              )
            : null}

          {/* Time Left should render if it's an incoming call with ronaTimeout */}
          {isIncomingTask && ronaTimeout && (
            <Text tagName="span" type="body-midsize-regular" className="task-text">
              Time Left: {'  '}
              <TaskTimer countdown={true} ronaTimeout={ronaTimeout} />
            </Text>
          )}
        </section>
      </ListItemBaseSection>

      <ListItemBaseSection position="end">
        <div className="task-button-container">
          {acceptText ? (
            <ButtonPill onPress={acceptTask} color="join" disabled={disableAccept}>
              {acceptText}
            </ButtonPill>
          ) : null}
          {declineText ? (
            <ButtonPill onPress={declineTask} color="cancel">
              {declineText}
            </ButtonPill>
          ) : null}
        </div>
      </ListItemBaseSection>
    </ListItemBase>
  );
};

export default Task;
