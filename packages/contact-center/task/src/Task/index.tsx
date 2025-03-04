import React from 'react';
import {ButtonPill, ListItemBase, ListItemBaseSection, Text} from '@momentum-ui/react-collaboration';
import {Avatar} from '@momentum-design/components/dist/react';
import {PressEvent} from '@react-types/shared';
import TaskTimer from '../TaskTimer';
import './styles.scss';

interface TaskProps {
  title?: string;
  state?: string;
  startTimeStamp?: number;
  ronaTimeout?: number;
  selected?: boolean;
  isIncomingTask?: boolean;
  queue?: string;
  acceptTask?: (e: PressEvent) => void;
  declineTask?: (e: PressEvent) => void;
  isBrowser?: boolean;
}

const Task: React.FC<TaskProps> = ({
  title,
  state,
  startTimeStamp,
  ronaTimeout,
  selected = false,
  isIncomingTask = false,
  queue,
  acceptTask,
  declineTask,
  isBrowser,
}) => {
  const capitalizeFirstWord = (str: string) => {
    return str.replace(/^\s*(\w)/, (match, firstLetter) => firstLetter.toUpperCase());
  };

  return (
    <ListItemBase className={`task-list-item ${selected ? 'task-list-item--selected' : ''}`}>
      <ListItemBaseSection position="start" className="task-list-item-start-section">
        <Avatar
          icon-name="handset-filled"
          className={`task-list-item-avatar ${selected ? 'task-list-item-avatar--selected' : ''}`}
        />
      </ListItemBaseSection>

      <ListItemBaseSection position="fill">
        <section className="task-details">
          {title && (
            <Text tagName="span" type={selected ? 'body-large-bold' : 'body-large-medium'} className="task-text">
              {title}
            </Text>
          )}

          {state && !isIncomingTask && (
            <Text tagName="span" type="body-midsize-regular" className="task-text task-text--secondary">
              {capitalizeFirstWord(state)}
            </Text>
          )}

          {queue && isIncomingTask && (
            <Text tagName="span" type="body-midsize-regular" className="task-text task-text--secondary">
              {capitalizeFirstWord(queue)}
            </Text>
          )}

          {/* Handle Time should render if it's an incoming call without ronaTimeout OR if it's not an incoming call */}
          {(isIncomingTask && !ronaTimeout) || !isIncomingTask
            ? startTimeStamp && (
                <Text tagName="span" type="body-midsize-regular" className="task-text task-text--secondary">
                  Handle Time: {'  '}
                  <TaskTimer startTimeStamp={startTimeStamp} />
                </Text>
              )
            : null}

          {/* Time Left should render if it's an incoming call with ronaTimeout */}
          {isIncomingTask && ronaTimeout && (
            <Text tagName="span" type="body-midsize-regular" className="task-text task-text--secondary">
              Time Left: {'  '}
              <TaskTimer countdown={true} ronaTimeout={ronaTimeout} />
            </Text>
          )}
        </section>
      </ListItemBaseSection>

      <ListItemBaseSection position="end">
        {isIncomingTask ? (
          <ButtonPill onPress={acceptTask} color="join" disabled={!isBrowser}>
            Ringing
          </ButtonPill>
        ) : isBrowser ? (
          <ButtonPill onPress={declineTask} color="join">
            End
          </ButtonPill>
        ) : null}
      </ListItemBaseSection>
    </ListItemBase>
  );
};

export default Task;
