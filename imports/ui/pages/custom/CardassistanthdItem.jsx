import React from 'react';
import CardassistanthdleftItem from './CardassistanthdleftItem';

const CardassistanthdItem = ({ dataWId, divText, description }) => {
  return (
    <div
      data-w-id={dataWId || '379fe386-af88-ed7e-3780-62a6bbc10999'}
      className={'card-assistant-hd'}
    >
      <CardassistanthdleftItem
        divText={divText}
        description={description}
      />
      <div className={'assistant-arrow'}>
        <img
          width={'16'}
          height={'16.000688552856445'}
          alt={''}
          src={
            'https://cdn.prod.website-files.com/681bd50cca2b1f41b87287dc/681cc3b22a53d368aff451c3_smarties-icon-arrow-down.svg'
          }
          loading={'lazy'}
          className={'smarties-icon-arrow-down'}
        />
      </div>
    </div>
  );
};

export default CardassistanthdItem;
