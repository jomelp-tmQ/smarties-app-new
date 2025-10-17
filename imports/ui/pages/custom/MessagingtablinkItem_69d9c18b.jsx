import React from 'react';

const MessagingtablinkItem_69d9c18b = ({ dataWTab, divText, isActive = false, onClick = () => { }, count = 0 }) => {
  return (
    <a
      data-w-tab={dataWTab || 'Tab 2'}
      className={`messaging-tablink w-inline-block w-tab-link ${isActive ? 'w--current' : ''}`}
      onClick={onClick}
    >
      <div>{divText || 'Active'}</div>
      <div className={'messaging-tablink-notify-count'}>{count}</div>
    </a>
  );
};

export default MessagingtablinkItem_69d9c18b;
