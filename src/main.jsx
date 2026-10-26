import React from 'react';
import ReactDOM from 'react-dom/client';
import ArtemisConnection from './ArtemisConnection';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ArtemisConnection>
    <App />
  </ArtemisConnection>
);