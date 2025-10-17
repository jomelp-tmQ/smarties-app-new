import React, { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import AccountWatcher from '../api/client/watchers/AccountWatcher';
import { useWatcher } from '../api/client/Watcher2';

/**
 * PrivateRoute renders children if user is logged in, otherwise redirects to /
 */
const PrivateRoute = ({ children }) => {
    const watcher = useRef(AccountWatcher).current;
    useWatcher(watcher);
    if (!watcher.UserId) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default PrivateRoute;
