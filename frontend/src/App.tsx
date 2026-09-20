import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { ExpiredPage } from './pages/ExpiredPage';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/room/:code" element={<ChatRoomPage />} />
        <Route path="/expired" element={<ExpiredPage />} />
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
