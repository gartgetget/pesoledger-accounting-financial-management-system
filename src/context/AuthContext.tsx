import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface BackendUser {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  workspaces: string[];
}

interface BackendWorkspace {
  _id: string;
  name: string;
  ownerId: string;
  settings: {
    currency: string;
    businessName: string;
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: BackendUser | null;
  workspaces: BackendWorkspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: BackendWorkspace | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, workspaceName: string) => Promise<void>;
  logout: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, businessName?: string) => Promise<void>;
  fetchUserWorkspaces: () => Promise<void>;
  fetchWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    workspaces: [],
    activeWorkspaceId: null,
    activeWorkspace: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const validateToken = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false, isAuthenticated: false }));
      return;
    }
    try {
      const user = await api.get<BackendUser>('/api/auth/me');
      const workspaces = await api.get<BackendWorkspace[]>('/api/workspaces');
      const activeWorkspaceId = user.workspaces?.[0] || null;
      const activeWorkspace = activeWorkspaceId
        ? workspaces.find((w) => w._id === activeWorkspaceId) || null
        : null;
      setState({ user, workspaces, activeWorkspaceId, activeWorkspace, isAuthenticated: true, isLoading: false });
    } catch {
      api.clearToken();
      setState({ user: null, workspaces: [], activeWorkspaceId: null, activeWorkspace: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: BackendUser; workspace: BackendWorkspace }>('/api/auth/login', { email, password });
    localStorage.setItem('chaching_backend_token', data.token);
    localStorage.setItem('chaching_backend_user', JSON.stringify(data.user));
    await validateToken();
  };

  const register = async (fullName: string, email: string, password: string, workspaceName: string) => {
    const data = await api.post<{ token: string; user: BackendUser; workspace: BackendWorkspace }>('/api/auth/register', {
      fullName, email, password, workspaceName,
    });
    localStorage.setItem('chaching_backend_token', data.token);
    localStorage.setItem('chaching_backend_user', JSON.stringify(data.user));
    await validateToken();
  };

  const logout = async () => {
    api.clearToken();
    setState({ user: null, workspaces: [], activeWorkspaceId: null, activeWorkspace: null, isAuthenticated: false, isLoading: false });
  };

  const selectWorkspace = (workspaceId: string) => {
    const workspace = state.workspaces.find((w) => w._id === workspaceId) || null;
    setState((prev) => ({ ...prev, activeWorkspaceId: workspaceId, activeWorkspace: workspace }));
    localStorage.setItem('active_workspace_id', workspaceId);
  };

  const createWorkspace = async (name: string, businessName?: string) => {
    await api.post<BackendWorkspace>('/api/workspaces', { name, businessName });
    await validateToken();
  };

  const fetchUserWorkspaces = async () => {
    await validateToken();
  };

  const fetchWorkspaces = async () => {
    await validateToken();
  };

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, selectWorkspace, createWorkspace, fetchUserWorkspaces, fetchWorkspaces }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { BackendUser, BackendWorkspace };
