import React from 'react';

const SessionsummarymainItem = ({ src, divText }) => {
  return (
    <div className={'session-summary-main'}>
      <div className={'icon-small-2 smaller'}>
        <img
          loading={'lazy'}
          src={src || 'images/smarties-icon-journey-page.svg'}
          alt={''}
        />
      </div>
      <div>{divText || '5'}</div>
    </div>
  );
};

export default SessionsummarymainItem;
