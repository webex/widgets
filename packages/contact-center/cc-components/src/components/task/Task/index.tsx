import React from 'react';
import {ButtonPill, ListItemBase, ListItemBaseSection, Text} from '@momentum-ui/react-collaboration';
import {Avatar, Brandvisual, Tooltip} from '@momentum-design/components/dist/react';
import {PressEvent} from '@react-types/shared';
import TaskTimer from '../TaskTimer';
import type {MEDIA_CHANNEL as MediaChannelType} from '../task.types';
import {extractTaskComponentData, getTaskListItemClasses} from './task.utils';
import './styles.scss';

export interface TaskProps {
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
  disableDecline?: boolean;
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
  disableDecline = false,
  declineText,
  mediaType,
  mediaChannel,
}) => {
  // Extract all computed data using the utility function
  const taskData = extractTaskComponentData({
    mediaType,
    mediaChannel,
    isIncomingTask,
    interactionId,
    state,
    queue,
    ronaTimeout,
    startTimeStamp,
  });

  const renderTitle = () => {
    if (!title) return null;

    const textComponent = (
      <Text
        tagName="span"
        type={selected ? 'body-large-bold' : 'body-large-medium'}
        className={taskData.titleClassName}
        id={taskData.isNonVoiceMedia ? taskData.tooltipTriggerId : undefined}
        data-testid="task:title"
      >
        {title}
      </Text>
    );

    if (taskData.isNonVoiceMedia) {
      return (
        <>
          {textComponent}
          <Tooltip
            color="contrast"
            delay="0,0"
            id={taskData.tooltipId}
            placement="top-start"
            offset={4}
            tooltip-type="description"
            triggerID={taskData.tooltipTriggerId}
            className="task-tooltip"
          >
            {title}
          </Tooltip>
        </>
      );
    }

    return textComponent;
  };

  return (
    <ListItemBase
      className={getTaskListItemClasses(selected, styles)}
      onPress={onTaskSelect ? onTaskSelect : undefined}
      id={interactionId}
    >
      <ListItemBaseSection position="start">
        {taskData.currentMediaType.isBrandVisual ? (
          <div className="brand-visual-background">
            <Brandvisual name={taskData.currentMediaType.iconName} className={taskData.currentMediaType.className} />
          </div>
        ) : (
          <Avatar icon-name={taskData.currentMediaType.iconName} className={taskData.currentMediaType.className} />
        )}
      </ListItemBaseSection>

      <ListItemBaseSection position="fill">
        <section className="task-details">
          {renderTitle()}
          {taskData.shouldShowState && (
            <Text
              tagName="span"
              type="body-midsize-regular"
              className="task-text"
              data-testid={`${interactionId}-state`}
            >
              {taskData.capitalizedState}
            </Text>
          )}

          {taskData.shouldShowQueue && (
            <Text
              tagName="span"
              type="body-midsize-regular"
              className="task-text"
              data-testid={`${interactionId}-queue`}
            >
              {taskData.capitalizedQueue}
            </Text>
          )}

          {/* Handle Time should render if it's an incoming call without ronaTimeout OR if it's not an incoming call */}
          {taskData.shouldShowHandleTime && (
            <Text
              tagName="span"
              type="body-midsize-regular"
              className="task-text"
              data-testid={`${interactionId}-handle-time`}
            >
              Handle Time: {'  '}
              <TaskTimer startTimeStamp={startTimeStamp} data-testid="task-list:timer" />
            </Text>
          )}

          {/* Time Left should render if it's an incoming call with ronaTimeout */}
          {taskData.shouldShowTimeLeft && (
            <Text
              tagName="span"
              type="body-midsize-regular"
              className="task-text"
              data-testid={`${interactionId}-time-left`}
            >
              Time Left: {'  '}
              <TaskTimer countdown={true} ronaTimeout={ronaTimeout} />
            </Text>
          )}
        </section>
      </ListItemBaseSection>

      <ListItemBaseSection position="end">
        <div className="task-button-container">
          {acceptText ? (
            <ButtonPill onPress={acceptTask} color="join" disabled={disableAccept} data-testid="task:accept-button">
              {acceptText}
            </ButtonPill>
          ) : null}
          {declineText ? (
            <ButtonPill
              onPress={declineTask}
              color="cancel"
              disabled={disableDecline}
              data-testid="task:decline-button"
            >
              {declineText}
            </ButtonPill>
          ) : null}
        </div>
      </ListItemBaseSection>
    </ListItemBase>
  );
};

export default Task;
