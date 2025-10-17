import React from 'react';

const TabledoctitleItem = ({ name }) => {
  return (
    <div className={'table-doctitle'}>
      <div className={'table-fileicon'}>
        <img
          src={'../images/smarties-file-dark.svg'}
          loading={'lazy'}
          alt={''}
        />
      </div>
      <div className={'table-doctitle-text'}>{name || 'sample.txt'}</div>
    </div>
  );
};

export default TabledoctitleItem;
