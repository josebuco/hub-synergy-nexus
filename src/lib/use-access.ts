import { queryOptions, useQuery } from "@tanstack/react-query";
import { getMyAccess } from "@/lib/access.functions";

export const accessOptions = queryOptions({
  queryKey: ["access"],
  queryFn: () => getMyAccess(),
  staleTime: 60_000,
});

export function useAccess() {
  const { data } = useQuery(accessOptions);
  return data ?? { isAdmin: false, name: "", sectors: [] as string[], loading: true };
}
