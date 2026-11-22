import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { LangProvider } from './lib/i18n.jsx';
import { CoachProvider } from './components/Coach.jsx';
import { Loading } from './components/Shell.jsx';
import Home from './pages/Home.jsx';
import Game from './pages/Game.jsx';
import './fonts.css';
import './styles.css';

const Admin = lazy(() => import('./pages/Admin.jsx'));
const Screen = lazy(() => import('./pages/Screen.jsx'));
const JoinCards = lazy(() => import('./pages/JoinCards.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Ops = lazy(() => import('./pages/Ops.jsx'));   // the owner's console: not linked anywhere

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
    <LangProvider>
      <CoachProvider>
        <HashRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/join" element={<Home />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/g/:id" element={<Game />} />
              <Route path="/screen/:id" element={<Screen />} />
              <Route path="/cards/:id" element={<JoinCards />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/easteregg" element={<Ops />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </CoachProvider>
    </LangProvider>
    </MotionConfig>
  </StrictMode>
);
