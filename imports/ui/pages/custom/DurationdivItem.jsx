import React from 'react';
import DurationtooltipItem from './DurationtooltipItem';

const DurationdivItem = ({ dataWId, divText }) => {
  return (
    <div className={'duration-div'}>
      <div
        data-w-id={dataWId || 'b4729139-7f78-8afa-aaa9-4ab7545ae1b0'}
        className={'messaging-inbox-duration'}
      >
        {divText || '2:15 PM'}
      </div>
      <DurationtooltipItem divText={'Jul 31, 2025 • 2:15 PM'} />
    </div>
  );
};

export default DurationdivItem;
