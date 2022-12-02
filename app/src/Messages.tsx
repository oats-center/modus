import './Messages.css';
import React from 'react';
import { observer } from 'mobx-react-lite';

import { context } from './state';

export default observer(function Messages() {
  const { state } = React.useContext(context);

  if (state.messages.length < 1) {
    return <React.Fragment/>;
  }
  return (
    <div className="messages-container">
      { state.messages.slice(0,4).map(({type,msg},i) => 
        <div className={`message message-${type}`} key={`message${i}`}>
          {msg}
        </div> 
      ) }
    </div>
  );
});




