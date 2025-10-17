import React from 'react';

const Divblock32Item = ({ download = () => { }, deleteAttachment = () => { } }) => {
  return (
    <div className={'div-block-32'}>
      <div className={'btn-asset-action'} onClick={download}>
        <img
          loading={'lazy'}
          src={'images/smarties-icon-download.svg'}
          alt={''}
        />
      </div>
      <div className={'btn-asset-action'} onClick={deleteAttachment}>
        <img
          loading={'lazy'}
          src={'images/smarties-icon-delete.svg'}
          alt={''}
        />
      </div>
    </div>
  );
};

export default Divblock32Item;
