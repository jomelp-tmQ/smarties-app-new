import React from 'react';
import AgentcarddivItem_5fb2dfcb from './AgentcarddivItem_5fb2dfcb';

const MessaginginboxitemrightItem_d2b9f097 = ({ dataWId, count }) => {
  if (count === 0) return null;
  return (
    <div className={'messaging-inbox-item-right'}>
      <div className={'messaging-notify-text'}>{count}</div>
      <AgentcarddivItem_5fb2dfcb
        dataWId={'fc19d0d7-f5e8-4f20-e129-a4d9753767c8'}
      />
    </div>
  );
};

export default MessaginginboxitemrightItem_d2b9f097;
