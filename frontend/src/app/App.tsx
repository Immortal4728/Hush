import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { CreateRoomPage } from '../pages/CreateRoomPage';
import { JoinRoomPage } from '../pages/JoinRoomPage';
import { ChatRoomPage } from '../pages/ChatRoomPage';
import { ExpiredPage } from '../pages/ExpiredPage';
import { AnalyticsDashboardPage } from '../pages/AnalyticsDashboardPage';
import { HowItWorksPage } from '../pages/HowItWorksPage';
import { AboutPage } from '../pages/AboutPage';

import { RetroBackground } from '../components/retro/RetroBackground';
import { AsciiBackground } from '../components/retro/AsciiBackground';
import { CRTScanlines } from '../components/retro/CRTScanlines';
import { CRTPowerOnOverlay } from '../components/retro/CRTPowerOnOverlay';

import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminProtectedRoute } from '../components/admin/AdminProtectedRoute';

const AppContent: React.FC = () => {
  return (
    <>
      <CRTPowerOnOverlay />
      <RetroBackground />
      <AsciiBackground />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/room/:code" element={<ChatRoomPage />} />
        <Route path="/expired" element={<ExpiredPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboardPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CRTScanlines />
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
