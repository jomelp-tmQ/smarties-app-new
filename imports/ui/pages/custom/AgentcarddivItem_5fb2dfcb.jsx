import React from 'react';
import AgentcardItem_e6d92931 from './AgentcardItem_e6d92931';

const AgentcarddivItem_5fb2dfcb = ({ dataWId }) => {
  return (
    <div className={'agent-card-div'}>
      <div
        data-w-id={dataWId || 'fc19d0d7-f5e8-4f20-e129-a4d9753767c8'}
        className={'card-inbox-agent-avatar'}
      >
        <img loading={'lazy'} src={'images/smarties-avatar-5.svg'} alt={''} />
      </div>
      <AgentcardItem_e6d92931 />
    </div>
  );
};

export default AgentcarddivItem_5fb2dfcb;
