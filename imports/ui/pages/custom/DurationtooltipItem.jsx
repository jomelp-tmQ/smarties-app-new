import React from 'react';

const DurationtooltipItem = ({ divText }) => {
  return (
    <div className={'duration-tooltip'}>
      <div>{divText || 'Closed'}</div>
    </div>
  );
};

export default DurationtooltipItem;
