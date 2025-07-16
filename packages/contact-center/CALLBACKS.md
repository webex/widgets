# Contact Center Widgets - Callback Documentation

This document provides comprehensive information about all callbacks available for Contact Center widgets.

## Table of Contents

1. [StationLogin](#stationlogin-widget)
2. [UserState](#userstate-widget)
3. [IncomingTask](#incomingtask-widget)
4. [TaskList](#tasklist-widget)
5. [CallControl](#callcontrol-widget)
6. [CallControlCAD](#callcontrolcad-widget)
7. [OutdialCall](#outdialcall-widget)

---

## StationLogin Widget

The StationLogin widget handles agent login management and supports two modes:

1. **Default Mode**: Enables agent login/logout functionality where agents can sign in and sign out from Contact Center. The sign out logic should be implemented by the developer. When sign out is clicked, a confirmation dialog is shown, and clicking confirm triggers the `onCCSignOut` callback.

2. **Profile Mode**: Used to modify agent preferences including:

- Login type (extension, dial number, or desktop)
- Extension or dial number configuration
- Team assignment

### Callbacks

| Callback      | Type                            | Description                                                     | Parameters                           | Example Usage                                                      |
| ------------- | ------------------------------- | --------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `onLogin`     | `() => void`                    | Called when agent login is successful                           | None                                 | `onLogin={() => console.log('Agent logged in')}`                   |
| `onLogout`    | `() => void`                    | Called when agent logout is successful                          | None                                 | `onLogout={() => console.log('Agent logged out')}`                 |
| `onCCSignOut` | `() => void`                    | Called when Contact Center sign out is confirmed (default mode) | None                                 | `onCCSignOut={() => console.log('CC signed out')}`                 |
| `onSaveStart` | `() => void`                    | Called when save operation starts (profile mode)                | None                                 | `onSaveStart={() => setShowLoader(true)}`                          |
| `onSaveEnd`   | `(isComplete: boolean) => void` | Called when save operation ends (profile mode)                  | `isComplete`: Success/failure status | `onSaveEnd={(success) => setToast(success ? 'success' : 'error')}` |

### Props

- `profileMode`: `boolean` - Enables agent profile editing mode

### Usage Example

```tsx
import {StationLogin} from '@webex/cc-widgets';

function MyApp() {
  const handleLogin = () => {
    console.log('Agent logged in successfully');
  };

  const handleLogout = () => {
    console.log('Agent logged out successfully');
  };

  const handleCCSignOut = () => {
    console.log('Contact Center sign out successful');
  };

  const handleSaveStart = () => {
    console.log('Saving new preference');
  };

  const handleSaveEnd = (isComplete: boolean) => {
    alert('Agent preferences changed');
  };

  return (
    <StationLogin
      onLogin={handleLogin}
      onLogout={handleLogout}
      onCCSignOut={handleCCSignOut}
      onSaveStart={handleSaveStart}
      onSaveEnd={handleSaveEnd}
      profileMode={false}
    />
  );
}
```

---

## UserState Widget

The UserState widget manages agent availability states.

### Callbacks

| Callback        | Type                       | Description                     | Parameters                | Example Usage                                                        |
| --------------- | -------------------------- | ------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| `onStateChange` | `(status: string) => void` | Called when agent state changes | `status`: New agent state | `onStateChange={(state) => console.log('State changed to:', state)}` |

### Usage Example

```tsx
import {UserState} from '@webex/cc-widgets';

function MyApp() {
  const handleStateChange = (status: string) => {
    console.log('Agent state changed to:', status);
    alert(`Status changed to ${status}`);
  };

  return <UserState onStateChange={handleStateChange} />;
}
```

---

## IncomingTask Widget

The IncomingTask widget handles incoming task notifications and acceptance/rejection.

> **Important**: This widget requires proper state management setup in your application.
> The widget expects specific state structure and actions to be configured before use.
>
> Please refer to the complete state management setup guide and implementation example:
> https://gist.github.com/Shreyas281299/bb4ea99cd174c23242587b23d19ec9b9

### Callbacks

| Callback     | Type                              | Description                              | Parameters                       | Example Usage                                                  |
| ------------ | --------------------------------- | ---------------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| `onAccepted` | `({task}: {task: ITask}) => void` | Called when an incoming task is accepted | `task`: The accepted task object | `onAccepted={({task}) => console.log('Task accepted:', task)}` |
| `onRejected` | `({task}: {task: ITask}) => void` | Called when an incoming task is rejected | `task`: The rejected task object | `onRejected={({task}) => console.log('Task rejected:', task)}` |

### Usage Example

```tsx
import {IncomingTask} from '@webex/cc-widgets';

function MyApp() {
  const [incomingTasks, setIncomingTasks] = useState([]);

  const handleAccepted = ({task}: {task: ITask}) => {
    console.log('Task accepted:', task);
  };

  const handleRejected = ({task}: {task: ITask}) => {
    console.log('Task rejected:', task);
  };

  return (
    <div>
      {incomingTasks.map((task) => (
        <IncomingTask
          key={task.data.interactionId}
          incomingTask={task}
          onAccepted={handleAccepted}
          onRejected={handleRejected}
        />
      ))}
    </div>
  );
}
```

---

## TaskList Widget

The TaskList widget displays and manages multiple tasks in a list format.

### Callbacks

| Callback         | Type                    | Description                                  | Parameters                       | Example Usage                                                    |
| ---------------- | ----------------------- | -------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `onTaskAccepted` | `(task: ITask) => void` | Called when a task from the list is accepted | `task`: The accepted task object | `onTaskAccepted={(task) => console.log('Task accepted:', task)}` |
| `onTaskDeclined` | `(task: ITask) => void` | Called when a task from the list is declined | `task`: The declined task object | `onTaskDeclined={(task) => console.log('Task declined:', task)}` |
| `onTaskSelected` | `(task: ITask) => void` | Called when a task from the list is selected | `task`: The selected task object | `onTaskSelected={(task) => console.log('Task selected:', task)}` |

### Usage Example

```tsx
import {TaskList} from '@webex/cc-widgets';

function MyApp() {
  const handleTaskAccepted = (task: ITask) => {
    console.log('Task accepted from list:', task);
  };

  const handleTaskDeclined = (task: ITask) => {
    console.log('Task declined from list:', task);
  };

  const handleTaskSelected = (task: ITask) => {
    console.log('Task selected:', task);
  };

  return (
    <TaskList
      onTaskAccepted={handleTaskAccepted}
      onTaskDeclined={handleTaskDeclined}
      onTaskSelected={handleTaskSelected}
    />
  );
}
```

---

## CallControl Widget

The CallControl widget provides basic call control functionality.

### Callbacks

| Callback       | Type                                                                  | Description                                 | Parameters                                                    | Example Usage                                               |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| `onHoldResume` | `() => void`                                                          | Called when hold/resume action is triggered | None                                                          | `onHoldResume={() => console.log('Hold/Resume triggered')}` |
| `onEnd`        | `() => void`                                                          | Called when call end action is triggered    | None                                                          | `onEnd={() => console.log('Call ended')}`                   |
| `onWrapUp`     | `({task, wrapUpReason}: {task: ITask; wrapUpReason: string}) => void` | Called when wrap-up is initiated            | `task`: Current task object<br>`wrapUpReason`: Wrap-up reason | `onWrapUp={(params) => console.log('Wrap-up:', params)}`    |

### Usage Example

```tsx
import {CallControl} from '@webex/cc-widgets';

function MyApp() {
  const handleHoldResume = () => {
    console.log('Hold/Resume action triggered');
  };

  const handleEnd = () => {
    console.log('Call ended');
  };

  const handleWrapUp = ({task, wrapUpReason}: {task: ITask; wrapUpReason: string}) => {
    console.log('Wrap-up initiated:', {task, wrapUpReason});
  };

  return <CallControl onHoldResume={handleHoldResume} onEnd={handleEnd} onWrapUp={handleWrapUp} />;
}
```

---

## CallControlCAD Widget

The CallControlCAD widget provides advanced call control functionality with consult and transfer capabilities.

### Callbacks

| Callback       | Type                                                                  | Description                                 | Parameters                                                    | Example Usage                                               |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| `onHoldResume` | `() => void`                                                          | Called when hold/resume action is triggered | None                                                          | `onHoldResume={() => console.log('Hold/Resume triggered')}` |
| `onEnd`        | `() => void`                                                          | Called when call end action is triggered    | None                                                          | `onEnd={() => console.log('Call ended')}`                   |
| `onWrapUp`     | `({task, wrapUpReason}: {task: ITask; wrapUpReason: string}) => void` | Called when wrap-up is initiated            | `task`: Current task object<br>`wrapUpReason`: Wrap-up reason | `onWrapUp={(params) => console.log('Wrap-up:', params)}`    |

### Props

- `callControlClassName`: `string` - Custom CSS class for main call control
- `callControlConsultClassName`: `string` - Custom CSS class for consult controls

### Usage Example

```tsx
import {CallControlCAD} from '@webex/cc-widgets';

function MyApp() {
  const handleHoldResume = () => {
    console.log('Hold/Resume action triggered in CAD');
    // Update hold state
    setIsCallOnHold((prev) => !prev);
    // Update call timer display
    updateCallTimer();
  };

  const handleEnd = () => {
    console.log('Call ended in CAD');
    // Clean up call resources
    cleanupCallResources();
    // Clear current task
    setCurrentTask(null);
  };

  const handleWrapUp = ({task, wrapUpReason}: {task: ITask; wrapUpReason: string}) => {
    console.log('Wrap-up initiated in CAD:', {task, wrapUpReason});
    // Process wrap-up with additional CAD features
    processAdvancedWrapUp(task, wrapUpReason);
    // Show enhanced wrap-up interface
    setShowAdvancedWrapUp(true);
  };

  return (
    <CallControlCAD
      onHoldResume={handleHoldResume}
      onEnd={handleEnd}
      onWrapUp={handleWrapUp}
      callControlClassName="custom-call-control"
      callControlConsultClassName="custom-consult-control"
    />
  );
}
```

---

TLDR: This documentation covers all the callbacks available across Contact Center widgets. Each callback serves a specific purpose in the agent workflow and should be implemented according to your application's requirements.
