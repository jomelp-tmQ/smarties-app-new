import React from 'react';

const ConvodividercontentItem = ({ src, divText }) => {
    return (
        <div className={'convo-divider-content'}>
            <div className={'convo-divider-avatar'}>
                <img
                    loading={'lazy'}
                    src={src || 'images/smarties-head.png'}
                    alt={''}
                />
            </div>
            <div>{divText || 'SMARTIES is responding in real-time'}</div>
        </div>
    );
};

export default ConvodividercontentItem;
