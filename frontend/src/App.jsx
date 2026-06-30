import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import Campaigns from './pages/Campaigns.jsx';
import History from './pages/History.jsx';
import WhatsApp from './pages/WhatsApp.jsx';

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/contacts"   element={<Contacts />} />
          <Route path="/campaigns"  element={<Campaigns />} />
          <Route path="/history"    element={<History />} />
          <Route path="/whatsapp"   element={<WhatsApp />} />
        </Routes>
      </main>
    </div>
  );
}
