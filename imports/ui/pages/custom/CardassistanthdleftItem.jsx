import React from 'react';

const CardassistanthdleftItem = ({ divText, description }) => {
  return (
    <div className={'card-assistant-hd-left'}>
      <div className={'text-assistant-card-hd'}>{divText || 'Model'}</div>
      <div className={'text-assistant-card-description'}>
        {description || 'Configure the behavior of the assistant.'}
      </div>
    </div>
  );
};

export default CardassistanthdleftItem;
