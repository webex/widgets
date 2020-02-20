import React from 'react';
import ReactDOM from 'react-dom';
import {WebexMeeting} from './';

import './App.css';

export default function App() {
  return <WebexMeeting />;
}

ReactDOM.render(<App />, document.getElementById('root'));
