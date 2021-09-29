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

`WebexMeetingWidget` takes an optional function to define custom controls for a meeting. The `controls` function should expect a boolean parameter that indicates whether the meeting is active and returns an array of control names to display on active (in-meeting) or inactive (interstitial) state of the meeting.
The default control names are set to `['mute-audio', 'mute-video', 'share-screen', 'member-roster', 'settings', 'leave-meeting']` if meeting is active and `['mute-audio', 'mute-video', 'settings', 'join-meeting']` otherwise.
This meeting controls come from the [SDK adapter](https://github.com/webex/sdk-component-adapter).

Use `supportedControls()` of the meetings adapter to obtain the names of the implemented controls by the adapter.

To maintain the same controls regardless of meeting state, ignore the boolean parameter passed to your control function.

```js
const myControls = (isActive) => isActive ? ['leave-meeting'] : ['join-meeting'];

<WebexMeetingWidget 
  acessToken="<YOUR_ACCESS_TOKEN>" 
  meetingDestination="meetingDestination" 
  controls={myControls} 
/>
```
