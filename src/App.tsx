import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { ToastProvider } from './components/Toast';
import { GameDetailPage } from './pages/GameDetailPage';
import { GamesPage } from './pages/GamesPage';
import { HomePage } from './pages/HomePage';
import { MembersPage } from './pages/MembersPage';
import { MyPage } from './pages/MyPage';
import { RankingPage } from './pages/RankingPage';
import { RecordPage } from './pages/RecordPage';
import { DataProvider } from './state/DataProvider';
import s from './styles/App.module.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const hideNav = pathname === '/record';
  return (
    <DataProvider>
      <ToastProvider>
        <ScrollToTop />
        <div className={s.shell}>
          <main className={[s.main, hideNav ? s.mainNoNav : ''].join(' ')}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/record" element={<RecordPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/games/:id" element={<GameDetailPage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/me" element={<MyPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          {!hideNav && <BottomNav />}
        </div>
      </ToastProvider>
    </DataProvider>
  );
}
