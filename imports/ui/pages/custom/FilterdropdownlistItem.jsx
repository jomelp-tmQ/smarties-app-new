import React from 'react';

const FilterdropdownlistItem = ({}) => {
  return (
    <nav className={'filterdropdown-list w-dropdown-list'}>
      <a href={'#'} className={'filter-dropdownlink w-dropdown-link'}>
        {'Newest'}
      </a>
      <a href={'#'} className={'filter-dropdownlink w-dropdown-link'}>
        {'Older'}
      </a>
    </nav>
  );
};

export default FilterdropdownlistItem;
