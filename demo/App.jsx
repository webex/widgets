import React from 'react';
import ReactDOM from 'react-dom';
import {WebexMeetingWidget} from '../src';

import './App.css';

export default function App() {
  return <WebexMeetingWidget />;
}

ReactDOM.render(<App />, document.getElementById('widgets'));
