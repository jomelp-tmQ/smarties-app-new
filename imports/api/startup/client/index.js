import { createRoot } from "react-dom/client";
import { Meteor } from "meteor/meteor";
import React from "react";

import Client from "../../client/Client";
import { Loader } from 'lucide-react';
import Router from "../../../ui/Router";

const LoaderPage = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            backgroundColor: '#f8f9fa',
            flexDirection: 'column',
            gap: '20px'
        }}>
            <Loader
                data-testid="loader-icon"
                width={48}
                height={48}
                color="#007bff"
                className="loader-spin"
            />
            <div style={{
                fontSize: '18px',
                color: '#6c757d',
                fontWeight: '500'
            }}>
                Please wait while we connect to the server...
            </div>
        </div>
    );
};

Meteor.startup(() => {
    if (Meteor.isClient) {
        const container = document.getElementById("react-target");
        const root = createRoot(container);
        root.render(<LoaderPage data-testid="loader-icon" width={32} height={32} color="#555" className="loader-spin" />);
        const start = () => {
            Client.startHandshake().then((success) => {
                if (success)
                    root.render(<Router />);
                else
                    start();
            }).catch(() => {
                root.render(<h5>Invalid Client version!</h5>);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            });
        };
        start();
    }
});
