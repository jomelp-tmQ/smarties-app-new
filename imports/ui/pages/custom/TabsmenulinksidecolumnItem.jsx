import React from 'react';

const TabsmenulinksidecolumnItem = ({ dataWTab, src, divText, isActive, onClick = () => [] }) => {
  return (
    <a
      data-w-tab={dataWTab || 'Tab 2'}
      className={`tabs-menu-link-side-column w-inline-block w-tab-link ${isActive ? ' w--current' : ''}`}
      onClick={onClick}
    >
      <div className={'icon-link-side-column'}>
        <img
          loading={'lazy'}
          src={src || 'images/smartties-tab-journey.svg'}
          alt={''}
        />
      </div>
      <div>{divText || 'Journey'}</div>
    </a>
  );
};

export default TabsmenulinksidecolumnItem;
