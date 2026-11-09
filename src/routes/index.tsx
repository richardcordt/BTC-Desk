import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/desk";
import { getMarket } from "@/lib/market.functions";

export const Route = createFileRoute("/")({
  loader: () => getMarket(),
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  const query = useQuery({
    queryKey: ["btc-market"],
    queryFn: () => getMarket(),
    initialData: initial,
    initialDataUpdatedAt: initial.fetchedAt,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return (
    <Desk
      market={query.data}
      stale={query.isError}
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={() => void query.refetch()}
    />
  );
}
