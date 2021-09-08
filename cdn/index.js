import React from 'react';
import ReactDOM from 'react-dom';

import WebexMeetingWidget from '../src/widgets/WebexMeeting/WebexMeeting';

window.WebexMeetingWidget = (node, props) => {
  ReactDOM.render(<WebexMeetingWidget {...props}/>, node);
}
