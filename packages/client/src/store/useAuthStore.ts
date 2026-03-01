import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  role: 'PARENT' | 'KID';
  email?: string;
  avatarSlug?: string;
  householdId: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    // Persist household so the kid selector works even after logout
    if (user.householdId) localStorage.setItem('knownHouseholdId', user.householdId);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));

