import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import LoginScreen from './screens/LoginScreen';
import ParentDashboard from './screens/ParentDashboard';
import KidHeroView from './screens/KidHeroView';
import KidSelectorScreen from './screens/KidSelectorScreen';
import RewardsShopScreen from './screens/RewardsShopScreen';

function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          {/* Public */}
          <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />
          {/* Kid selector: accessible even without a session (kids don't have parent auth) */}
          <Route path="/kid-select" element={!user ? <KidSelectorScreen /> : <Navigate to="/" />} />

          {/* Home: role-based redirect */}
          <Route
            path="/"
            element={
              user ? (
                user.role === 'PARENT' ? <ParentDashboard /> : <KidHeroView />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Kid-only routes */}
          <Route
            path="/rewards"
            element={user?.role === 'KID' ? <RewardsShopScreen /> : <Navigate to="/" />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
