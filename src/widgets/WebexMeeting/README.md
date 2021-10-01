# Webex Meeting Widget

Webex Meeting widget displays the complete, default Webex meeting experience.

<p align="center">
  <img src="./WebexMeeting.gif" alt="Default Webex Meeting" />
</p>

## Preview

To get a preview of the Webex Meeting widget, you can run our start script:

```shell
  npm start
```

## Embed

Import the Meeting widget from the `@webex/widgets` library and embed it in your React application.

```js
<WebexMeetingWidget acessToken="<YOUR_ACCESS_TOKEN>" meetingDestination="meetingDestination" />
```

_That's it_! You should have the whole webex meeting experience in your React application!

### Customize Meeting Controls

`WebexMeetingWidget` takes an optional function to specify a custom list of controls for a meeting and an optional range to specify which controls can be collapsed if not enough space is available. The `controls` function receives a boolean parameter which is true when the meeting is active. It should return an array of control names (strings) corresponding to the current state of the meeting (inactive or active). The default control names `['mute-audio', 'mute-video', 'share-screen', 'member-roster', 'settings', 'leave-meeting']` if meeting is active and `['mute-audio', 'mute-video', 'settings', 'join-meeting']` otherwise.
This meeting controls come from the [SDK adapter](https://github.com/webex/sdk-component-adapter).

Use `supportedControls()` of the meetings adapter to obtain the names of the implemented controls by the adapter.

The `controlsCollapseRangeStart` is a zero-based index of the first collapsible control (can be negative).
The `controlsCollapseRangeEnd` is a zero-based index before the last collapsible control (can be negative). Negative numbers are counted from the end of the controls array. For example, if the `controlsCollapseRangeEnd` is -2, the last 2 controls won't collapse.
To maintain the same controls regardless of meeting state, ignore the boolean parameter passed to your control function.

```js
const myControls = (isActive) => isActive ? ['leave-meeting'] : ['join-meeting'];

<WebexMeetingWidget 
  acessToken="<YOUR_ACCESS_TOKEN>"
  meetingDestination="meetingDestination"
  controls={myControls} 
  controlsCollapseRangeStart={0} 
  controlsCollapseRangeEnd={-2}
/>
```
