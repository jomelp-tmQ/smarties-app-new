import React from 'react';
import ChatstatusdivItem from './ChatstatusdivItem';

const MessaginginboxavatarItem_9c103e5b = ({ src, dataWId, initialText }) => {
  return (
    <div className={'messaging-inbox-avatar'}>
      <img
        loading={'lazy'}
        src={src || 'images/smarties-avatar-01_1smarties-avatar-01.png'}
        alt={''}
      />
      <div className={'dot-online'}></div>
      <ChatstatusdivItem dataWId={'da766056-4c22-deca-22ff-455fcbcfc86a'} initialText={initialText} />
    </div>
  );
};

export default MessaginginboxavatarItem_9c103e5b;
