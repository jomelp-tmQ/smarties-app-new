import React from 'react';
import Divblock31Item from './Divblock31Item';
import Divblock32Item from './Divblock32Item';

const AssetitemItem = ({ src, divText, divText1, download = () => { }, deleteAttachment = () => { } }) => {
  return (
    <div className={'asset-item'}>
      <div className={'file-avatar'}>
        <img
          loading={'lazy'}
          src={src || 'images/smarties-icon-asset1.svg'}
          alt={''}
        />
      </div>
      <Divblock31Item
        divText={divText || 'profile-picture.jpg'}
        divText1={divText1 || 'Added 2 days ago'}
      />
      <Divblock32Item download={download} deleteAttachment={deleteAttachment} />
    </div>
  );
};

export default AssetitemItem;
