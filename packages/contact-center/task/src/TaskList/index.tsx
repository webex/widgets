import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import TaskListPresentational from './task-list.presentational';
import {useTaskList} from '../helper';

type TaskListComponentProps = {
  title: string;
  subtitle: string;
};

const TaskListComponent: React.FunctionComponent<TaskListComponentProps> = ({title, subtitle}) => {
  const {cc, taskList, currentTask, deviceType, logger} = store;

  const result = useTaskList({cc, deviceType, logger, taskList});
  const props = {
    ...result,
    currentTask,
    title,
    subtitle
  };

  return <TaskListPresentational {...props} />;
};

const TaskList = observer(TaskListComponent);
export {TaskList};
