import React from 'react';

const InboxitemItem_aeb4ecec = ({ divText, onClick = () => { }, isCurrent = false }) => {
  return (
    <a onClick={onClick} href={'#'} className={'inbox-item w-inline-block'} style={{ backgroundColor: isCurrent && "#e1d5d1" }}>
      <div className={'messaging-inbox-avatar bg-gray'}>
        <img
          loading={'lazy'}
          src={'../images/smarties-brandicon-acme.png'}
          alt={''}
        />
      </div>
      <div>{divText || 'Configuration 01'}</div>
    </a>
  );
};

export default InboxitemItem_aeb4ecec;
