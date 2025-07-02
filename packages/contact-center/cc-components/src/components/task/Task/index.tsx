import React from 'react';
import {ButtonPill, ListItemBase, ListItemBaseSection, Text} from '@momentum-ui/react-collaboration';
import {Avatar, Brandvisual, Tooltip} from '@momentum-design/components/dist/react';
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
  const isNonVoiceMedia = currentMediaType.labelName !== 'Call';
  // Create unique IDs for tooltip trigger and tooltip
  const tooltipTriggerId = `tooltip-trigger-${interactionId}`;
  const tooltipId = `tooltip-${interactionId}`;
  // Helper function to get the correct CSS class
  const getTitleClassName = () => {
    if (isNonVoiceMedia && isIncomingTask) {
      return 'incoming-digital-task-title';
    }
    if (isNonVoiceMedia && !isIncomingTask) {
      return 'task-digital-title';
    }
    return 'task-title';
  };
  const renderTitle = () => {
    if (!title) return null;

    const textComponent = (
      <Text
        tagName="span"
        type={selected ? 'body-large-bold' : 'body-large-medium'}
        className={getTitleClassName()}
        id={isNonVoiceMedia ? tooltipTriggerId : undefined}
      >
        {title}
      </Text>
    );

    if (isNonVoiceMedia) {
      return (
        <>
          {textComponent}
          <Tooltip
            color="contrast"
            delay="0,0"
            id={tooltipId}
            placement="top-start"
            offset={4}
            tooltip-type="description"
            triggerID={tooltipTriggerId}
            className="task-tooltip"
          >
            <Text tagName="small" className="task-tooltip-text">
              {title}
            </Text>
          </Tooltip>
        </>
      );
    }

    return textComponent;
  };

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
          {renderTitle()}
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
