import React from 'react';

const FilterdropdowntoggleItem = ({ divText }) => {
  return (
    <div className={'filter-dropdown-toggle w-dropdown-toggle'}>
      <div className={'icon-2 w-icon-dropdown-toggle'}></div>
      <div className={'text-block'}>{divText || 'Assigned to Me'}</div>
    </div>
  );
};

export default FilterdropdowntoggleItem;
