import { useQuery } from "@tanstack/react-query";
import { api } from ".";
import { useSession } from "../../providers/SessionProvider";
export function useResource<T>(
  path: string,
  options: { enabled?: boolean; poll?: number } = {},
) {
  const { session } = useSession();
  return useQuery({
    queryKey: [session?.user.id, path],
    queryFn: ({ signal }) => api<T>(path, { signal }),
    enabled: !!session && options.enabled !== false,
    refetchInterval: options.poll,
    retry: 1,
  });
}
