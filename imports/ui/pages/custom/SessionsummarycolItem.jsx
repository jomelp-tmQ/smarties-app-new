import React from 'react';
import SessionsummarymainItem from './SessionsummarymainItem';

const SessionsummarycolItem = ({ src, divText, divText1 }) => {
  return (
    <div className={'session-summary-col'}>
      <SessionsummarymainItem
        src={'images/smarties-icon-journey-page.svg'}
        divText={divText || '5'}
      />
      <div>{divText1 || 'Pages Visited'}</div>
    </div>
  );
};

export default SessionsummarycolItem;
