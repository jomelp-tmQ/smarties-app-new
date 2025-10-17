import React from 'react';

const ChatstatusItem = ({ dataWId, initialText }) => {
  return (
    <div
      data-w-id={dataWId || 'da766056-4c22-deca-22ff-455fcbcfc86a'}
      className={'chat-status'}
    >
      <div>{initialText || 'A'}</div>
    </div>
  );
};

export default ChatstatusItem;
