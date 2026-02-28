import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import LoginScreen from './screens/LoginScreen';
import ParentDashboard from './screens/ParentDashboard';
import KidHeroView from './screens/KidHeroView';
import KidSelectorScreen from './screens/KidSelectorScreen';
import RewardsShopScreen from './screens/RewardsShopScreen';
import LandingPage from './screens/LandingPage';

function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          {/* Landing page — always accessible */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth screens — redirect to app if already logged in */}
          <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/app" />} />
          <Route path="/kid-select" element={!user ? <KidSelectorScreen /> : <Navigate to="/app" />} />

          {/* App: role-based entry point */}
          <Route
            path="/app"
            element={
              user ? (
                user.role === 'PARENT' ? <ParentDashboard /> : <KidHeroView />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Parent dashboard: explicit route */}
          <Route
            path="/dashboard"
            element={user?.role === 'PARENT' ? <ParentDashboard /> : <Navigate to="/login" />}
          />

          {/* Kid hero view: explicit route */}
          <Route
            path="/hero"
            element={user?.role === 'KID' ? <KidHeroView /> : <Navigate to="/login" />}
          />

          {/* Kid-only routes */}
          <Route
            path="/rewards"
            element={user?.role === 'KID' ? <RewardsShopScreen /> : <Navigate to="/app" />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
