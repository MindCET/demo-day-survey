
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, initSettings, handleRedirectResult } from './lib/firebase';
import AdminView from './views/AdminView';
import InvestorView from './views/InvestorView';
import DisplayView from './views/DisplayView';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await handleRedirectResult();
        await initSettings();
      } catch (err) {
        console.warn("Init failed:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-mindcet-blue">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-mindcet-orange border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl font-display font-medium text-white/70">Connecting to MindCET Poll...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InvestorView />} />
        <Route path="/display" element={<DisplayView />} />
        <Route path="/admin" element={<AdminView />} />
      </Routes>
    </BrowserRouter>
  );
}
