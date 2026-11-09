import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Side } from "./signal";

export type OpenPosition = {
  id: string;
  side: Side;
  entry: number;
  qty: number;
  leverage: number;
  margin: number;
  stop: number;
  openedAt: number;
};

export type ClosedTrade = {
  id: string;
  side: Side;
  entry: number;
  exit: number;
  qty: number;
  leverage: number;
  margin: number;
  pnl: number;
  liquidated: boolean;
  openedAt: number;
  closedAt: number;
};

type BookState = {
  cash: number;
  leverage: number;
  riskPct: number;
  positions: OpenPosition[];
  history: ClosedTrade[];
  setLeverage: (leverage: number) => void;
  setRiskPct: (riskPct: number) => void;
  openPosition: (input: Omit<OpenPosition, "id" | "openedAt">) => boolean;
  closePosition: (id: string, exit: number) => ClosedTrade | null;
  addCash: (amount: number) => void;
  withdraw: (amount: number) => void;
  reset: () => void;
};

const STARTING_CASH = 10_000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function unrealizedPnl(position: OpenPosition, price: number): number {
  const raw =
    position.side === "long"
      ? (price - position.entry) * position.qty
      : (position.entry - price) * position.qty;
  return Math.max(raw, -position.margin);
}

export const useBook = create<BookState>()(
  persist(
    (set, get) => ({
      cash: STARTING_CASH,
      leverage: 5,
      riskPct: 1,
      positions: [],
      history: [],
      setLeverage: (leverage) => set({ leverage: Math.min(20, Math.max(1, Math.round(leverage))) }),
      setRiskPct: (riskPct) => set({ riskPct }),
      openPosition: (input) => {
        if (!(input.margin > 0) || input.margin > get().cash + 0.001) return false;
        const position: OpenPosition = { ...input, id: newId(), openedAt: Date.now() };
        set({
          cash: round2(get().cash - input.margin),
          positions: [position, ...get().positions],
        });
        return true;
      },
      closePosition: (id, exit) => {
        const position = get().positions.find((item) => item.id === id);
        if (!position || !(exit > 0)) return null;
        const liq =
          position.side === "long"
            ? position.entry * (1 - 1 / position.leverage + 0.004)
            : position.entry * (1 + 1 / position.leverage - 0.004);
        const liquidated = position.side === "long" ? exit <= liq : exit >= liq;
        let pnl =
          position.side === "long"
            ? (exit - position.entry) * position.qty
            : (position.entry - exit) * position.qty;
        if (liquidated || pnl < -position.margin) pnl = -position.margin;
        pnl = round2(pnl);
        const trade: ClosedTrade = {
          id: position.id,
          side: position.side,
          entry: position.entry,
          exit: liquidated ? liq : exit,
          qty: position.qty,
          leverage: position.leverage,
          margin: position.margin,
          pnl,
          liquidated,
          openedAt: position.openedAt,
          closedAt: Date.now(),
        };
        set({
          cash: round2(get().cash + position.margin + pnl),
          positions: get().positions.filter((item) => item.id !== id),
          history: [trade, ...get().history].slice(0, 40),
        });
        return trade;
      },
      addCash: (amount) => {
        if (!(amount > 0) || !Number.isFinite(amount)) return;
        set({ cash: round2(get().cash + amount) });
      },
      withdraw: (amount) => {
        if (!(amount > 0) || !Number.isFinite(amount)) return;
        set({ cash: round2(Math.max(0, get().cash - amount)) });
      },
      reset: () =>
        set({
          cash: STARTING_CASH,
          positions: [],
          history: [],
        }),
    }),
    {
      name: "btc-desk-book-v1",
      skipHydration: true,
      partialize: (state) => ({
        cash: state.cash,
        leverage: state.leverage,
        riskPct: state.riskPct,
        positions: state.positions,
        history: state.history,
      }),
    },
  ),
);
