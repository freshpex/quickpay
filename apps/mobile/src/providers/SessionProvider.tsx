import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useQueryClient } from "@tanstack/react-query";
import { api, setUnauthorizedHandler } from "../services/api";
import { secure, clearAuthStorage } from "../services/secure-storage";
import { authClient } from "../services/session/auth-client";
import { SingleFlight } from "../services/session/coordinator";
import { clearPrivateState } from "../services/session/cleanup";
import { ApiFailure, mutation } from "@quickpay/api-client";
type Session = {
  user: { id: string; name: string; email: string; emailVerified: boolean };
  session: { id: string; expiresAt: string };
};
type Context = {
  session: Session | null;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Context | null>(null);
const flight = new SingleFlight<Session | null>();
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null);
  const cache = useQueryClient();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  const generation = useRef(0);
  const currentUser = useRef<string | null>(null);
  const clear = useCallback(async () => {
    generation.current++;
    await clearPrivateState(cache, clearAuthStorage);
    currentUser.current = null;
    setSession(null);
    setError(null);
  }, [cache]);
  const refresh = useCallback(async () => {
    const version = generation.current;
    try {
      if (!(await secure.get("token"))) {
        setSession(null);
        return;
      }
      const next = await flight.run(() =>
        api<Session | null>("/auth/get-session"),
      );
      if (version !== generation.current) return;
      if (!next) {
        await clear();
        return;
      }
      if (currentUser.current && currentUser.current !== next.user.id) {
        await cache.cancelQueries(); cache.clear();
        await Promise.all([secure.remove("pending"), secure.remove("gift_draft")]);
      }
      currentUser.current = next.user.id;
      setSession(next);
      setError(null);
    } catch (err) {
      if (version !== generation.current) return;
      if (err instanceof ApiFailure && err.status === 401) await clear();
      else
        setError(
          err instanceof Error
            ? err.message
            : "Please reconnect to restore your session.",
        );
    } finally {
      setReady(true);
    }
  }, [cache, clear]);
  useEffect(() => {
    setUnauthorizedHandler(clear);
    void refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [clear, refresh]);
  const logout = async () => {
    // Revoke on the server first; offline users can retry rather than silently leaving a live session.
    const installationId = await secure.get("installation");
    if (installationId)
      await api("/notifications/devices", {
        ...mutation({ installationId }),
        method: "DELETE",
      });
    await api("/auth/sign-out", mutation({}));
    await clear();
    await authClient.signOut().catch(() => {});
    await clearAuthStorage();
  };
  return (
    <Context.Provider value={{ session, ready, error, refresh, logout }}>
      {children}
    </Context.Provider>
  );
}
export const useSession = () => {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider missing");
  return value;
};
