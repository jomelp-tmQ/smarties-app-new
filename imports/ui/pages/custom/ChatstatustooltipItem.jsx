import React from 'react';

const ChatstatustooltipItem = ({ divText }) => {
  return (
    <div className={'chat-status-tooltip'}>
      <div>{divText || 'Active'}</div>
    </div>
  );
};

export default ChatstatustooltipItem;
