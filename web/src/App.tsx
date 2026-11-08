import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Banner from './components/Banner';
import AiChatPanel from './components/AiChatPanel';
import { ChatProvider } from './context/ChatContext';
import PredictPage from './pages/PredictPage';
import ViewerPage from './pages/ViewerPage';
import DifferencePage from './pages/DifferencePage';
import ResultsPage from './pages/ResultsPage';
import SequencePage from './pages/SequencePage';
import InsatPage from './pages/InsatPage';
import AboutPage from './pages/AboutPage';
import { fetchHealth } from './api';
import type { HealthInfo } from './types';

const AppLayout: React.FC<{
  health?: HealthInfo;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}> = ({ health, theme, onToggleTheme }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ff-bg)] text-[var(--ff-text)] transition-colors">
      {/* Persistent Warning Banner (Hard Rule 3) */}
      <Banner />

      {/* Global Navigation Bar */}
      <Navbar health={health} theme={theme} onToggleTheme={onToggleTheme} />

      {/* Main Content Area with generous upper space and padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-14">
        <div key={location.pathname} className="ff-page-enter">
          <Routes>
            <Route path="/" element={<PredictPage />} />
            <Route path="/predict" element={<PredictPage />} />
            <Route path="/viewer" element={<ViewerPage />} />
            <Route path="/viewer/:jobId" element={<ViewerPage />} />
            <Route path="/difference" element={<DifferencePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/sequence" element={<SequencePage />} />
            <Route path="/insat" element={<InsatPage />} />
            <Route path="/about" element={<AboutPage health={health} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {/* AI Assistant (kept down at the bottom as requested) */}
      <AiChatPanel />

      {/* Workstation Footer */}
      <footer className="border-t border-[var(--ff-border)] bg-[var(--ff-workspace)] py-4 px-4 sm:px-6 text-xs text-[var(--ff-text-secondary)] font-mono transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>FrameFill v0.1.0 · Geostationary Thermal-IR Temporal Interpolation (PS-12)</span>
          <span>NOAA GOES-19 ABI L2 CMIPF Ch13 · Research Prototype · Not for Operational Forecasting</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthInfo | undefined>(undefined);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('framefill_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark'; // FrameFill defaults to dark satellite console
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    try {
      localStorage.setItem('framefill_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    fetchHealth()
      .then((h) => setHealth(h))
      .catch((e) => console.warn('Could not fetch health:', e));
  }, []);

  return (
    <ChatProvider>
      <Router>
        <AppLayout health={health} theme={theme} onToggleTheme={toggleTheme} />
      </Router>
    </ChatProvider>
  );
};

export default App;
