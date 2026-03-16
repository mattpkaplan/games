import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import GameSelectPage from './pages/GameSelectPage.jsx';
import ShareInvitePage from './pages/ShareInvitePage.jsx';
import WaitingPage from './pages/WaitingPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import RPSGamePage from './pages/RPSGamePage.jsx';
import ProfileEditPage from './pages/ProfileEditPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/:opponentId" element={<GameSelectPage />} />
      <Route path="/share/:token" element={<ShareInvitePage />} />
      <Route path="/waiting/:token" element={<WaitingPage />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="/game/:token" element={<RPSGamePage />} />
      <Route path="/profile/:id/edit" element={<ProfileEditPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
