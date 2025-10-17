import React, { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import AccountWatcher from '../api/client/watchers/AccountWatcher';
import { useWatcher } from '../api/client/Watcher2';

/**
 * PublicRoute renders children if user is not logged in, otherwise redirects to /plan-form
 */
const PublicRoute = ({ children }) => {
    const watcher = useRef(AccountWatcher).current;
    useWatcher(watcher);
    if (watcher.UserId) {
        return <Navigate to="/" replace />;
    }
    return children;
};

export default PublicRoute;
