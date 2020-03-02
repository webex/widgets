import React from 'react';
import ReactDOM from 'react-dom';
import {WebexMeetingWidget} from '../src';

import './App.css';

export default function App() {
  return <WebexMeetingWidget accessToken="<YOUR_ACCESS_TOKEN>" meetingDestination="MEETING_DESTINATION" />;
}

ReactDOM.render(<App />, document.getElementById('widgets'));
