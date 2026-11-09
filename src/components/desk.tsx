import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { MarketSnapshot } from "@/lib/market-load";
import { unrealizedPnl, useBook, type OpenPosition } from "@/lib/book";
import { btc, countdown, money, px, signedMoney, signedPct, utcStamp } from "@/lib/format";
import { planTrade, readSignal, suggestedStop, type RuleId, type Side, type SignalRead } from "@/lib/signal";
import { PriceChart } from "@/components/price-chart";

const RULES: { id: RuleId; label: string; when: string }[] = [
  { id: "buy", label: "Buy", when: "8 crosses above 21" },
  { id: "hold-long", label: "Hold long", when: "8 stays above 21" },
  { id: "sell", label: "Sell", when: "8 crosses below 21" },
  { id: "hold-short", label: "Hold short", when: "8 stays below 21" },
];

const panel = "rounded-2xl border border-line bg-surface p-4";
const field =
  "h-12 w-full rounded-xl border border-line bg-bg px-3 font-mono text-base text-fg outline-none focus-visible:border-accent";

export function Desk({
  market,
  stale,
  refreshing,
  onRefresh,
}: {
  market: MarketSnapshot;
  stale: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [entryText, setEntryText] = useState<string | null>(null);
  const [stopText, setStopText] = useState<string | null>(null);
  const [sideOverride, setSideOverride] = useState<Side | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [exitText, setExitText] = useState("");
  const [fundsText, setFundsText] = useState("1000");
  const [fundsOpen, setFundsOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const cash = useBook((s) => s.cash);
  const positions = useBook((s) => s.positions);
  const history = useBook((s) => s.history);
  const leverage = useBook((s) => s.leverage);
  const riskPct = useBook((s) => s.riskPct);
  const setLeverage = useBook((s) => s.setLeverage);
  const setRiskPct = useBook((s) => s.setRiskPct);
  const openPosition = useBook((s) => s.openPosition);
  const closePosition = useBook((s) => s.closePosition);
  const addCash = useBook((s) => s.addCash);
  const withdraw = useBook((s) => s.withdraw);
  const reset = useBook((s) => s.reset);

  useEffect(() => {
    void useBook.persist.rehydrate();
  }, []);

  const signal = useMemo(
    () => readSignal(market.candles, market.fetchedAt),
    [market.candles, market.fetchedAt],
  );
  const side: Side = sideOverride ?? (signal?.bias === "Bullish" ? "long" : "short");

  const entry = entryText === null ? Number(market.price.toFixed(2)) : Number(entryText);
  const atr = signal?.atr ?? 0;
  const suggested = Number.isFinite(entry) && entry > 0 ? suggestedStop(entry, atr, side) : NaN;
  const stop = stopText === null ? Number(suggested.toFixed(2)) : Number(stopText);

  const marked = useMemo(() => {
    return positions.reduce(
      (sum, position) => {
        const pnl = unrealizedPnl(position, market.price);
        return { upnl: sum.upnl + pnl, locked: sum.locked + position.margin };
      },
      { upnl: 0, locked: 0 },
    );
  }, [positions, market.price]);

  const equity = cash + marked.locked + marked.upnl;
  const realized = history.reduce((sum, trade) => sum + trade.pnl, 0);
  const plan = planTrade({
    side,
    entry,
    stop,
    leverage,
    riskPct,
    equity: Math.max(equity, 0),
    cash,
  });

  const safeLev =
    Number.isFinite(plan.maxLeverage) && plan.maxLeverage >= 1 ? Math.max(1, Math.floor(plan.maxLeverage)) : null;

  function chooseSide(next: Side) {
    setSideOverride(next);
    setStopText(null);
  }

  function logTrade() {
    if (plan.error || !(plan.qty > 0)) return;
    const ok = openPosition({
      side,
      entry,
      qty: plan.qty,
      leverage,
      margin: plan.margin,
      stop,
    });
    if (!ok) {
      setNote("Could not log that — free margin changed.");
      return;
    }
    setNote(`${side === "long" ? "Long" : "Short"} logged at ${px(entry)}.`);
    setEntryText(null);
    setStopText(null);
  }

  function confirmClose(position: OpenPosition) {
    const exit = Number(exitText);
    const trade = closePosition(position.id, exit);
    if (!trade) {
      setNote("Enter the fill price to close.");
      return;
    }
    setClosingId(null);
    setNote(
      trade.liquidated
        ? `Closed as a liquidation. Loss capped at the margin, ${money(trade.pnl)}.`
        : `Closed ${trade.side} for ${signedMoney(trade.pnl)}.`,
    );
  }

  const funds = Number(fundsText);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tracking-wide text-accent">BTC Desk</p>
            <span className="rounded-full border border-line px-2 py-1 text-xs text-muted">BTCUSDT</span>
            <span className="rounded-full border border-line px-2 py-1 text-xs text-muted">4H</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh price"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-fg"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 font-mono text-4xl font-medium tabular-nums text-fg">
            <span className={`live-dot inline-block size-2 shrink-0 rounded-full ${stale ? "bg-down" : "bg-up"}`} />
            {px(market.price)}
          </p>
          <p className={`font-mono text-sm tabular-nums ${market.changePct >= 0 ? "text-up" : "text-down"}`}>
            {signedPct(market.changePct)} today
          </p>
          <p className="text-sm text-muted">
            24h {px(market.low24)} – {px(market.high24)}
          </p>
          <p className="text-xs text-muted">
            <UpdatedAgo fetchedAt={market.fetchedAt} refreshing={refreshing} /> · {market.source}
          </p>
        </div>
      </header>

      {signal ? (
        <SignalCard signal={signal} fetchedAt={market.fetchedAt} />
      ) : (
        <section className={panel}>
          <h1 className="text-2xl font-semibold">Waiting on candles</h1>
          <p className="mt-2 text-muted">The price is in, but there are not enough 4-hour bars to read the averages yet.</p>
        </section>
      )}

      {signal ? (
        <section className={panel}>
          <div className="mb-3 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-fg">4-hour chart</h2>
            <p className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <Legend swatch="bg-fg" label="Price" />
              <Legend swatch="bg-accent" label="8 EMA" />
              <Legend swatch="bg-muted" label="21 EMA" />
            </p>
          </div>
          <PriceChart points={signal.chart} />
          <p className="mt-2 text-xs text-muted">
            The call above uses closed candles only. The last point on the chart is the live candle.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className={panel}>
          <h2 className="text-lg font-semibold">Size the leverage</h2>
          <p className="mt-1 text-sm text-muted">
            Risk is taken off equity. Margin comes out of free cash. Nothing is sent to an exchange.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => chooseSide("long")}
              className={`h-12 flex-1 rounded-xl border font-semibold ${
                side === "long" ? "border-up bg-up text-bg" : "border-line bg-bg text-muted"
              }`}
            >
              Long
            </button>
            <button
              type="button"
              onClick={() => chooseSide("short")}
              className={`h-12 flex-1 rounded-xl border font-semibold ${
                side === "short" ? "border-down bg-down text-bg" : "border-line bg-bg text-muted"
              }`}
            >
              Short
            </button>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted">Leverage</span>
              <span className="font-mono tabular-nums text-fg">{leverage}×</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={leverage}
              aria-label="Leverage"
              onChange={(event) => setLeverage(Number(event.target.value))}
              className="h-11 w-full accent-accent"
            />
            {leverage >= 10 ? (
              <p className="text-sm text-down">10× and above can liquidate on an ordinary 4-hour wick.</p>
            ) : null}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm text-muted">Risk per trade</p>
            <div className="grid grid-cols-3 gap-2">
              {[0.5, 1, 2].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRiskPct(pct)}
                  className={`h-11 rounded-xl border font-mono text-sm tabular-nums ${
                    riskPct === pct ? "border-accent bg-accent text-accent-ink" : "border-line bg-bg text-fg"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-sm text-muted">
              Entry
              <input
                className={`${field} mt-1`}
                inputMode="decimal"
                value={entryText ?? (Number.isFinite(market.price) ? market.price.toFixed(2) : "")}
                onChange={(event) => setEntryText(event.target.value)}
              />
            </label>
            <label className="block text-sm text-muted">
              Stop
              <input
                className={`${field} mt-1`}
                inputMode="decimal"
                value={stopText ?? (Number.isFinite(suggested) ? suggested.toFixed(2) : "")}
                onChange={(event) => setStopText(event.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-accent"
            onClick={() => {
              setEntryText(null);
              setStopText(null);
            }}
          >
            Use live price and a 1.25× ATR stop
          </button>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
            <Stat label="Size" value={plan.qty ? btc(plan.qty) : "—"} />
            <Stat label="Notional" value={plan.notional ? money(plan.notional) : "—"} />
            <Stat label="Margin locked" value={plan.margin ? money(plan.margin) : "—"} />
            <Stat label="Loss if stopped" value={plan.lossAtStop ? money(plan.lossAtStop) : "—"} />
            <Stat label="Stop distance" value={plan.stopDistPct ? signedPct(plan.stopDistPct).replace("+", "") : "—"} />
            <Stat label="Liquidation" value={plan.liq ? px(plan.liq) : "—"} />
          </dl>

          {plan.error ? <p className="mt-3 text-sm text-down">{plan.error}</p> : null}
          {!plan.error && plan.cappedByMargin ? (
            <p className="mt-3 text-sm text-muted">Size was cut so the margin fits the free cash. Risk is under the target.</p>
          ) : null}
          {!plan.error && plan.stopInsideLiq ? (
            <p className="mt-3 text-sm text-down">
              Liquidation at {px(plan.liq)} is closer than the stop at {px(stop)}. This leverage would close the
              trade before the stop.{" "}
              {safeLev && safeLev < leverage ? (
                <button type="button" className="font-semibold text-accent" onClick={() => setLeverage(safeLev)}>
                  Set leverage to {safeLev}×
                </button>
              ) : (
                "Widen the stop or drop the leverage."
              )}
            </p>
          ) : null}
          {!plan.error && !plan.stopInsideLiq && plan.liq ? (
            <p className="mt-3 text-sm text-up">
              Stop hits first. Liquidation is {plan.liqDistPct.toFixed(1)}% away, the stop {plan.stopDistPct.toFixed(1)}%.
            </p>
          ) : null}

          <button type="button" className="mt-4 h-12 w-full rounded-xl bg-accent font-semibold text-accent-ink disabled:opacity-40" disabled={Boolean(plan.error)} onClick={logTrade}>
            {side === "long" ? "Log long" : "Log short"}
            {plan.stopInsideLiq && !plan.error ? " anyway" : ""}
          </button>
          <p className="mt-2 text-xs text-muted">
            Liquidation assumes isolated margin and 0.4% maintenance. Your venue’s number will differ.
          </p>
        </section>

        <section className={panel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Portfolio</h2>
              <p className="mt-1 text-sm text-muted">Paper ledger on this device. Marked to the live price.</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Equity" value={money(equity)} large />
            <Stat label="Result" value={signedMoney(realized + marked.upnl)} large tone={realized + marked.upnl} />
            <Stat label="Free cash" value={money(cash)} />
            <Stat label="Open P&L" value={signedMoney(marked.upnl)} tone={marked.upnl} />
          </dl>

          <div className="mt-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-fg">Open</h3>
            {positions.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing open. When the signal says buy or sell, size it in the leverage panel and log the fill.
              </p>
            ) : (
              positions.map((position) => {
                const pnl = unrealizedPnl(position, market.price);
                const confirming = closingId === position.id;
                return (
                  <article key={position.id} className="rounded-xl border border-line bg-bg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          <span className={position.side === "long" ? "text-up" : "text-down"}>
                            {position.side === "long" ? "Long" : "Short"}
                          </span>{" "}
                          <span className="font-mono text-sm tabular-nums text-muted">{position.leverage}×</span>
                        </p>
                        <p className="mt-1 font-mono text-sm tabular-nums text-fg">
                          {btc(position.qty)} @ {px(position.entry)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Stop {px(position.stop)} · margin {money(position.margin)} · {utcStamp(position.openedAt)}
                        </p>
                      </div>
                      <p className={`font-mono text-sm tabular-nums ${pnl >= 0 ? "text-up" : "text-down"}`}>
                        {signedMoney(pnl)}
                      </p>
                    </div>
                    {confirming ? (
                      <div className="mt-3 flex flex-col gap-2">
                        <label className="text-sm text-muted">
                          Exit price
                          <input
                            className={`${field} mt-1`}
                            inputMode="decimal"
                            value={exitText}
                            onChange={(event) => setExitText(event.target.value)}
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="h-11 flex-1 rounded-xl bg-accent font-semibold text-accent-ink"
                            onClick={() => confirmClose(position)}
                          >
                            Confirm close
                          </button>
                          <button
                            type="button"
                            className="h-11 rounded-xl border border-line px-3 text-fg"
                            onClick={() => setClosingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mt-3 h-11 w-full rounded-xl border border-line text-sm font-medium text-fg"
                        onClick={() => {
                          setClosingId(position.id);
                          setExitText(market.price.toFixed(2));
                        }}
                      >
                        Close at market
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-fg">Closed</h3>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Closed trades land here with realized P&L.</p>
            ) : (
              <ul className="mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto">
                {history.map((trade) => (
                  <li key={`${trade.id}-${trade.closedAt}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">
                      {trade.side === "long" ? "Long" : "Short"} {trade.leverage}×
                      {trade.liquidated ? " · liquidated" : ""}
                      <span className="mt-0.5 block font-mono text-xs tabular-nums">
                        {px(trade.entry)} → {px(trade.exit)}
                      </span>
                    </span>
                    <span className={`font-mono tabular-nums ${trade.pnl >= 0 ? "text-up" : "text-down"}`}>
                      {signedMoney(trade.pnl)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <button
              type="button"
              className="text-sm font-medium text-accent"
              onClick={() => {
                setFundsOpen((open) => !open);
                setResetArmed(false);
              }}
            >
              {fundsOpen ? "Hide balance tools" : "Adjust balance"}
            </button>
            {fundsOpen ? (
              <div className="mt-3 flex flex-col gap-3">
                <label className="text-sm text-muted">
                  Amount in USDT
                  <input
                    className={`${field} mt-1`}
                    inputMode="decimal"
                    value={fundsText}
                    onChange={(event) => setFundsText(event.target.value)}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="h-11 flex-1 rounded-xl border border-line font-medium"
                    onClick={() => {
                      addCash(funds);
                      setNote(`Added ${money(funds)} to free cash.`);
                    }}
                    disabled={!(funds > 0)}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="h-11 flex-1 rounded-xl border border-line font-medium"
                    onClick={() => {
                      withdraw(Math.min(funds, cash));
                      setNote("Withdrew from free cash.");
                    }}
                    disabled={!(funds > 0) || cash <= 0}
                  >
                    Withdraw
                  </button>
                </div>
                {resetArmed ? (
                  <button
                    type="button"
                    className="h-11 rounded-xl bg-down font-semibold text-bg"
                    onClick={() => {
                      reset();
                      setResetArmed(false);
                      setNote("Ledger reset to $10,000.");
                    }}
                  >
                    Confirm reset to $10,000
                  </button>
                ) : (
                  <button type="button" className="h-11 text-sm text-muted" onClick={() => setResetArmed(true)}>
                    Reset paper book
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {note ? (
        <p className="text-sm text-fg" aria-live="polite">
          {note}
        </p>
      ) : null}

      {stale ? <p className="text-sm text-down">The last refresh failed. Figures above are the previous read.</p> : null}

      <footer className="pb-6 text-xs text-muted">
        Not financial advice. Buy means the 8 EMA has closed above the 21 on the BTCUSDT 4-hour chart. Sell means it
        has closed below. This desk does not place orders. Leverage can wipe the margin. The ledger stays in this
        browser.
      </footer>
    </main>
  );
}

function SignalCard({ signal, fetchedAt }: { signal: SignalRead; fetchedAt: number }) {
  const bull = signal.bias === "Bullish";
  return (
    <section className={`${panel} border-l-4 ${bull ? "border-l-up" : "border-l-down"}`}>
      <p className="text-xs font-medium tracking-wide text-muted">4-hour 8 / 21 EMA</p>
      <h1 className={`mt-1 text-5xl font-semibold tracking-tight ${bull ? "text-up" : "text-down"}`}>{signal.bias}</h1>
      <p className="mt-2 text-base text-fg">
        The 8 EMA is {bull ? "above" : "below"} the 21 EMA
        {signal.fresh ? ", and the cross just closed." : "."}
      </p>
      <p className="mt-3 text-lg font-semibold text-fg">{signal.actionTitle}</p>
      <p className="mt-1 text-sm text-muted">{signal.actionDetail}</p>

      <ul className="mt-4 grid grid-cols-2 gap-2">
        {RULES.map((rule) => {
          const active = rule.id === signal.rule;
          return (
            <li
              key={rule.id}
              className={`min-h-11 rounded-xl border px-3 py-2 ${active ? "border-accent bg-surface-2" : "border-line"}`}
            >
              <p className={`text-sm font-semibold ${active ? "text-fg" : "text-muted"}`}>{rule.label}</p>
              <p className="text-xs text-muted">{rule.when}</p>
            </li>
          );
        })}
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
        <Stat label="8 EMA" value={px(signal.ema8)} />
        <Stat label="21 EMA" value={px(signal.ema21)} />
        <Stat label="Gap" value={signedPct(signal.spreadPct)} tone={signal.spreadPct} />
        <Stat label="Candles since cross" value={String(signal.barsSinceCross)} />
        <div className="col-span-2">
          <dt className="text-xs text-muted">Last cross</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums text-fg">{utcStamp(signal.crossAt)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted">This candle closes</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums text-fg">
            <CandleClock nextCloseAt={signal.nextCloseAt} fetchedAt={fetchedAt} />
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-muted">A buy or a sell counts only when the 4-hour candle closes. A wick mid-candle is not the signal.</p>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  large,
}: {
  label: string;
  value: string;
  tone?: number;
  large?: boolean;
}) {
  const color = tone == null ? "text-fg" : tone >= 0 ? "text-up" : "text-down";
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 font-mono tabular-nums ${large ? "text-xl" : "text-sm"} ${color}`}>{value}</dd>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block size-2 rounded-full ${swatch}`} />
      {label}
    </span>
  );
}

function CandleClock({ nextCloseAt, fetchedAt }: { nextCloseAt: number; fetchedAt: number }) {
  const [now, setNow] = useState(fetchedAt);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <>{countdown(nextCloseAt - now)}</>;
}

function UpdatedAgo({ fetchedAt, refreshing }: { fetchedAt: number; refreshing: boolean }) {
  const [now, setNow] = useState(fetchedAt);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  if (refreshing) return <>Updating</>;
  const age = Math.max(0, Math.round((now - fetchedAt) / 1000));
  if (age < 5) return <>Live</>;
  return <>Updated {age}s ago</>;
}
