import React from 'react';
import ChatstatusItem from './ChatstatusItem';
import ChatstatustooltipItem from './ChatstatustooltipItem';

const ChatstatusdivItem = ({ dataWId, initialText }) => {
  return (
    <div className={'chat-status-div'}>
      <ChatstatusItem dataWId={'da766056-4c22-deca-22ff-455fcbcfc86a'} initialText={initialText} />
      <ChatstatustooltipItem divText={'Active'} />
    </div>
  );
};

export default ChatstatusdivItem;
