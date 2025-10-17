import React from 'react';
import FilterdropdowntoggleItem from './FilterdropdowntoggleItem';
import FilterdropdownlistItem from './FilterdropdownlistItem';

const FilterdropdownItem = ({ divText }) => {
  return (
    <div
      data-delay={'0'}
      data-hover={'false'}
      className={'filter-dropdown w-dropdown'}
    >
      <FilterdropdowntoggleItem divText={'Assigned to Me'} />
      <FilterdropdownlistItem />
    </div>
  );
};

export default FilterdropdownItem;
