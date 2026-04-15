import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CreateEventPage from './pages/host/CreateEventPage';
import EventResultPage from './pages/host/EventResultPage';
import MyEventsPage from './pages/host/MyEventsPage';
import DashboardPage from './pages/host/DashboardPage';
import GuestUploadPage from './pages/guest/GuestUploadPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/create" element={<CreateEventPage />} />
      <Route path="/events/:id/result" element={<EventResultPage />} />
      <Route path="/my-events" element={<MyEventsPage />} />
      <Route path="/dashboard/:id" element={<DashboardPage />} />
      <Route path="/g/:token" element={<GuestUploadPage />} />
    </Routes>
  );
}
