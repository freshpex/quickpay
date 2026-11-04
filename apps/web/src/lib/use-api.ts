"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@quickpay/api-client";
export function useApi<T>(path: string) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void refresh();
    window.addEventListener("quickpay:connection-restored", refresh);
    return () =>
      window.removeEventListener("quickpay:connection-restored", refresh);
  }, [refresh]);
  return { data, error, loading, refresh };
}
