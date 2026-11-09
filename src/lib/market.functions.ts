import { createServerFn } from "@tanstack/react-start";

export type { MarketSnapshot } from "./market-load";

export const getMarket = createServerFn({ method: "GET" }).handler(async () => {
  const { loadMarket } = await import("./market-load");
  return loadMarket();
});
