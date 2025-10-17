// src/router/Router.jsx
import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { PATHS } from "./paths";

// Guards
import PrivateRoute from "./PrivateRoute";
import PublicRoute from "./PublicRoute";

// Your middleware/pages
import IndexCentralize from "./middleware/IndexCentralize";
import JourneyDashboardCentralize from "./middleware/journey/JourneyDashboardCentralize";
import ContactsCentralize from "./middleware/ContactsCentralize";
import MessagingCentralize from "./middleware/MessagingCentralize";
import JourneyBuzzBuilderCentralize from "./middleware/journey/JourneyBuzzBuilderCentralize";
import JourneyAttractShoppersCentralize from "./middleware/journey/JourneyAttractShoppersCentralize";
import JourneyConvertBuyersCentralize from "./middleware/journey/JourneyConvertBuyersCentralize";
import JourneyBuildLoyaltyCentralize from "./middleware/journey/JourneyBuildLoyaltyCentralize";
import JourneyContentLibraryCentralize from "./middleware/journey/JourneyContentLibraryCentralize";
import JourneyObjectionFeedCentralize from "./middleware/journey/JourneyObjectionFeedCentralize";
import JourneyCustomerMemoryCenterCentralize from "./middleware/journey/JourneyCustomerMemoryCenterCentralize";
import SettingsAccountsCentralize from "./middleware/settings/SettingsAccountsCentralize";
import SettingsBillingCentralize from "./middleware/settings/SettingsBillingCentralize";
import SettingsAssistantCentralize from "./middleware/settings/SettingsAssistantCentralize";
import SettingsPhonenumbersCentralize from "./middleware/settings/SettingsPhonenumbersCentralize";
import SettingsToolsCentralize from "./middleware/settings/SettingsToolsCentralize";
import SettingsFilesCentralize from "./middleware/settings/SettingsFilesCentralize";
import SettingsKnowledgebaseCentralize from "./middleware/settings/SettingsKnowledgebaseCentralize";
import SettingsWidgetConfigurationCentralize from "./middleware/settings/SettingsWidgetConfigurationCentralize";
import SettingsDataEnrichmentCentralize from "./middleware/settings/SettingsDataEnrichmentCentralize";
import SettingsWebcrawlCentralize from "./middleware/settings/SettingsWebcrawlCentralize";
import AdminCentralize from "./middleware/AdminCentralize";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

function NotFound() {
    return <div style={{ padding: 24 }}>NOT FOUND</div>;
}

export default function Router() {
    return (
        <BrowserRouter>
            <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
                <Routes>
                    {/* ---------- PUBLIC ONLY ---------- */}
                    <Route element={<PublicRoute><Outlet /></PublicRoute>}>
                        <Route path={PATHS.login} element={<Login />} />
                        <Route path={PATHS.signup} element={<Signup />} />
                    </Route>

                    {/* ---------- PRIVATE (everything else) ---------- */}
                    <Route element={<PrivateRoute><Outlet /></PrivateRoute>}>
                        {/* Root & Core */}
                        <Route path={PATHS.home} element={<IndexCentralize />} />
                        <Route path={PATHS.messaging} element={<MessagingCentralize />} />
                        <Route path={PATHS.contacts} element={<ContactsCentralize />} />

                        {/* Journey */}
                        <Route path="/journey">
                            <Route path="dashboard" element={<JourneyDashboardCentralize />} />
                            <Route path="buzz-builder-hub" element={<JourneyBuzzBuilderCentralize />} />
                            <Route path="attract-shoppers" element={<JourneyAttractShoppersCentralize />} />
                            <Route path="convert-buyers" element={<JourneyConvertBuyersCentralize />} />
                            <Route path="build-loyalty" element={<JourneyBuildLoyaltyCentralize />} />
                            <Route path="content-library" element={<JourneyContentLibraryCentralize />} />
                            <Route path="objection-feed" element={<JourneyObjectionFeedCentralize />} />
                            <Route
                                path="customer-memory-center"
                                element={<JourneyCustomerMemoryCenterCentralize />}
                            />
                            {/* Default /journey -> dashboard */}
                            <Route index element={<Navigate to="dashboard" replace />} />
                        </Route>

                        {/* Settings */}
                        <Route path="/settings">
                            <Route path="account" element={<SettingsAccountsCentralize />} />
                            <Route path="billing" element={<SettingsBillingCentralize />} />
                            <Route path="assistant" element={<SettingsAssistantCentralize />} />
                            <Route path="phone-numbers" element={<SettingsPhonenumbersCentralize />} />
                            <Route path="tools" element={<SettingsToolsCentralize />} />
                            <Route path="files" element={<SettingsFilesCentralize />} />
                            <Route path="knowledge-base" element={<SettingsKnowledgebaseCentralize />} />
                            <Route path="widget-configuration" element={<SettingsWidgetConfigurationCentralize />} />
                            <Route path="data-enrichment" element={<SettingsDataEnrichmentCentralize />} />
                            {/* Default /settings -> account */}
                            <Route index element={<Navigate to="account" replace />} />
                        </Route>

                        {/* Admin & Utilities */}
                        <Route path={PATHS.admin} element={<AdminCentralize />} />
                        <Route path={PATHS.webCrawl} element={<SettingsWebcrawlCentralize />} />

                        {/* Authenticated 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Route>

                    {/* Unauthenticated fallthrough: send to login */}
                    <Route path="*" element={<Navigate to={PATHS.login} replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
