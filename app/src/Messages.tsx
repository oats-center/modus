import './Messages.css';
import React from 'react';

export type Message = {
  type: 'good' | 'bad',
  msg: string,
};

export default function Messages({ messages }: { messages: Message[] }) {
  if (messages.length < 1) return <React.Fragment/>;
  return (
    <div className="messages-container">
      { messages.map(({type,msg},i) => 
        <div className={`message message-${type}`} key={`message${i}`}>
          {msg}
        </div> 
      ) }
    </div>
  );
}




