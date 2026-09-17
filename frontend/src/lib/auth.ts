import { useSyncExternalStore } from "react";
import { clearToken, getToken, setToken as storeToken } from "../api/client";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Decodes the `sub` (admin email) claim from a JWT without verifying the
 * signature - this is display-only, the backend is the source of truth for
 * whether the token is actually valid. */
function decodeEmail(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const token = useSyncExternalStore(subscribe, getToken);
  return {
    isAuthenticated: !!token,
    email: token ? decodeEmail(token) : null,
    login(newToken: string) {
      storeToken(newToken);
      emit();
    },
    logout() {
      clearToken();
      emit();
    },
  };
}
