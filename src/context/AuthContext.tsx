import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, loadStoredToken, onSessaoExpirada, setToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
import type { AuthResponse, User } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  carregando: boolean;
  login: (u: User, token: string) => void;
  logout: () => void;
  /** Após trocar a senha provisória ou preferências, relê o perfil do servidor. */
  recarregarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  const encerrarSessao = useCallback(() => {
    disconnectSocket();
    void clearToken();
    setUser(null);
  }, []);

  useEffect(() => { onSessaoExpirada(encerrarSessao); }, [encerrarSessao]);

  const abrirSessao = useCallback((u: User) => {
    // MANAGER_MASTER não recebe eventos de task — mesma regra do desktop.
    if (u.perfil !== 'MANAGER_MASTER' && !u.precisaTrocarSenha) {
      const t = getToken();
      if (t) connectSocket(t);
    }
    setUser(u);
  }, []);

  useEffect(() => {
    (async () => {
      const salvo = await loadStoredToken();
      if (!salvo) { setCarregando(false); return; }
      try {
        abrirSessao(await api.get<User>('/auth/me'));
      } catch {
        await clearToken();
      } finally {
        setCarregando(false);
      }
    })();
  }, [abrirSessao]);

  const login = useCallback((u: User, token: string) => {
    void setToken(token);
    abrirSessao(u);
  }, [abrirSessao]);

  const recarregarPerfil = useCallback(async () => {
    try {
      abrirSessao(await api.get<User>('/auth/me'));
    } catch {
      encerrarSessao();
    }
  }, [abrirSessao, encerrarSessao]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, carregando, login, logout: encerrarSessao, recarregarPerfil }),
    [user, carregando, login, encerrarSessao, recarregarPerfil],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return ctx;
}

export type { AuthResponse };
