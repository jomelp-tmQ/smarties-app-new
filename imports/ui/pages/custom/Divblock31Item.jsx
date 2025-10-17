import React from 'react';

const Divblock31Item = ({ divText, divText1 }) => {
  return (
    <div className={'div-block-31'}>
      <div className={'text-asset-name'}>
        {divText || 'profile-picture.jpg'}
      </div>
      <div className={'text-asset-date'}>{divText1 || 'Added 2 days ago'}</div>
    </div>
  );
};

export default Divblock31Item;
