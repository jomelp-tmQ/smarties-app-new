import React from 'react';
import ConvodividercontentItem from './ConvodividercontentItem';

const ConvodividerItem = ({ src, divText }) => {
    return (
        <div className={'convo-divider'}>
            <ConvodividercontentItem
                src={'images/smarties-head.png'}
                divText={'SMARTIES is responding in real-time'}
            />
        </div>
    );
};

export default ConvodividerItem;
