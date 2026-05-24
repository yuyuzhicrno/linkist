import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout, ChannelLayout } from './components/layout/AppLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import ForumPage from './pages/ForumPage.jsx';
import PostDetailPage from './pages/PostDetailPage.jsx';
import NewPostPage from './pages/NewPostPage.jsx';
import ChannelsPage from './pages/ChannelsPage.jsx';
import ColumnsPage from './pages/ColumnsPage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import UserProfilePage from './pages/UserProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Main app layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/forum" element={<ForumPage />} />
        <Route path="/forum/new" element={<NewPostPage />} />
        <Route path="/forum/:id" element={<PostDetailPage />} />
        <Route path="/columns" element={<ColumnsPage />} />
        <Route path="/columns/:columnId" element={<ColumnsPage />} />
        <Route path="/columns/:columnId/articles/:articleId" element={<ColumnsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/user/:username" element={<UserProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Channel layout (full height, no scroll padding) */}
      <Route element={<ChannelLayout />}>
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/channels/:channelId" element={<ChannelsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
