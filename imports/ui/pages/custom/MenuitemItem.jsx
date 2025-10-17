import React from 'react';

const MenuitemItem = ({ src, divText }) => {
  return (
    <div className={'menu-item'}>
      <div className={'menu-item-icon'}>
        <img
          src={src || '../images/smarties-icon-version.svg'}
          loading={'lazy'}
          alt={''}
        />
      </div>
      <div>{divText || 'Version History'}</div>
    </div>
  );
};

export default MenuitemItem;
