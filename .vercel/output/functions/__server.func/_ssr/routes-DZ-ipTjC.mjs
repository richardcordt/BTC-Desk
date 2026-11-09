import { i as __toESM } from "../_runtime.mjs";
import { i as require_react, r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { n as RefreshCw } from "../_libs/lucide-react.mjs";
import { n as Route, r as getMarket } from "./router-CQyFlbF7.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { a as CartesianGrid, i as Line, n as YAxis, o as ResponsiveContainer, r as XAxis, s as Tooltip, t as LineChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DZ-ipTjC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STARTING_CASH = 1e4;
function round2(n) {
	return Math.round(n * 100) / 100;
}
function newId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
	return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function unrealizedPnl(position, price) {
	const raw = position.side === "long" ? (price - position.entry) * position.qty : (position.entry - price) * position.qty;
	return Math.max(raw, -position.margin);
}
var useBook = create()(persist((set, get) => ({
	cash: STARTING_CASH,
	leverage: 5,
	riskPct: 1,
	positions: [],
	history: [],
	setLeverage: (leverage) => set({ leverage: Math.min(20, Math.max(1, Math.round(leverage))) }),
	setRiskPct: (riskPct) => set({ riskPct }),
	openPosition: (input) => {
		if (!(input.margin > 0) || input.margin > get().cash + .001) return false;
		const position = {
			...input,
			id: newId(),
			openedAt: Date.now()
		};
		set({
			cash: round2(get().cash - input.margin),
			positions: [position, ...get().positions]
		});
		return true;
	},
	closePosition: (id, exit) => {
		const position = get().positions.find((item) => item.id === id);
		if (!position || !(exit > 0)) return null;
		const liq = position.side === "long" ? position.entry * (1 - 1 / position.leverage + .004) : position.entry * (1 + 1 / position.leverage - .004);
		const liquidated = position.side === "long" ? exit <= liq : exit >= liq;
		let pnl = position.side === "long" ? (exit - position.entry) * position.qty : (position.entry - exit) * position.qty;
		if (liquidated || pnl < -position.margin) pnl = -position.margin;
		pnl = round2(pnl);
		const trade = {
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
			closedAt: Date.now()
		};
		set({
			cash: round2(get().cash + position.margin + pnl),
			positions: get().positions.filter((item) => item.id !== id),
			history: [trade, ...get().history].slice(0, 40)
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
	reset: () => set({
		cash: STARTING_CASH,
		positions: [],
		history: []
	})
}), {
	name: "btc-desk-book-v1",
	skipHydration: true,
	partialize: (state) => ({
		cash: state.cash,
		leverage: state.leverage,
		riskPct: state.riskPct,
		positions: state.positions,
		history: state.history
	})
}));
var MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];
var usd = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
function money(n) {
	if (!Number.isFinite(n)) return "—";
	return usd.format(n);
}
function signedMoney(n) {
	if (!Number.isFinite(n)) return "—";
	if (n > 0) return `+${usd.format(n)}`;
	return usd.format(n);
}
function px(n) {
	return money(n);
}
function signedPct(n) {
	if (!Number.isFinite(n)) return "—";
	const body = `${Math.abs(n).toFixed(2)}%`;
	if (n > 0) return `+${body}`;
	if (n < 0) return `-${body}`;
	return body;
}
function btc(n) {
	if (!Number.isFinite(n)) return "—";
	return `${n.toLocaleString("en-US", { maximumFractionDigits: 6 })} BTC`;
}
function utcStamp(ms) {
	const d = new Date(ms);
	const hh = String(d.getUTCHours()).padStart(2, "0");
	const mm = String(d.getUTCMinutes()).padStart(2, "0");
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${hh}:${mm} UTC`;
}
function dayLabel(ms) {
	const d = new Date(ms);
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
function countdown(ms) {
	if (ms <= 0) return "closing now";
	const total = Math.floor(ms / 1e3);
	const h = Math.floor(total / 3600);
	const m = Math.floor(total % 3600 / 60);
	const s = total % 60;
	if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
	return `${m}m ${String(s).padStart(2, "0")}s`;
}
var FOUR_H_MS = 144e5;
/** Small-position BTC maintenance margin used only as a liquidation estimate. */
var MAINTENANCE_MARGIN = .004;
function emaSeries(values, period) {
	const out = new Array(values.length).fill(null);
	if (values.length < period || period < 1) return out;
	const k = 2 / (period + 1);
	let prev = 0;
	for (let i = 0; i < period; i++) prev += values[i];
	prev /= period;
	out[period - 1] = prev;
	for (let i = period; i < values.length; i++) {
		prev = values[i] * k + prev * (1 - k);
		out[i] = prev;
	}
	return out;
}
function averageTrueRange(candles, period = 14) {
	if (candles.length < 2) return 0;
	const trs = [];
	for (let i = 1; i < candles.length; i++) {
		const c = candles[i];
		const prev = candles[i - 1].c;
		trs.push(Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev)));
	}
	const slice = trs.slice(-period);
	if (!slice.length) return 0;
	return slice.reduce((sum, n) => sum + n, 0) / slice.length;
}
function liquidationPrice(entry, leverage, side) {
	const imr = 1 / leverage;
	if (side === "long") return entry * (1 - imr + MAINTENANCE_MARGIN);
	return entry * (1 + imr - MAINTENANCE_MARGIN);
}
/** Highest leverage at which the stop is still closer than liquidation. */
function maxLeverageForStop(entry, stop, side) {
	if (!(entry > 0) || !(stop > 0)) return 0;
	const denom = side === "long" ? 1.004 - stop / entry : stop / entry - 1 + MAINTENANCE_MARGIN;
	if (denom <= 0) return Number.POSITIVE_INFINITY;
	return 1 / denom;
}
function suggestedStop(entry, atr, side) {
	const dist = Math.max(atr * 1.25, entry * .004);
	return side === "long" ? entry - dist : entry + dist;
}
function splitCandles(candles, now) {
	const ordered = [...candles].sort((a, b) => a.t - b.t);
	const closed = [];
	let forming = null;
	for (const candle of ordered) if (candle.t + 144e5 <= now) closed.push(candle);
	else forming = candle;
	return {
		closed,
		forming
	};
}
function barsSinceCross(fast, slow, last) {
	let bars = 0;
	for (let i = last; i > 0; i--) {
		const currF = fast[i];
		const currS = slow[i];
		const prevF = fast[i - 1];
		const prevS = slow[i - 1];
		if (currF == null || currS == null || prevF == null || prevS == null) break;
		if (currF > currS !== prevF > prevS) return bars;
		bars += 1;
	}
	return bars;
}
function readSignal(candles, now) {
	const { closed, forming } = splitCandles(candles, now);
	if (closed.length < 30) return null;
	const closedCloses = closed.map((c) => c.c);
	const e8 = emaSeries(closedCloses, 8);
	const e21 = emaSeries(closedCloses, 21);
	const last = closed.length - 1;
	const ema8 = e8[last];
	const ema21 = e21[last];
	if (ema8 == null || ema21 == null) return null;
	const bias = ema8 > ema21 ? "Bullish" : "Bearish";
	const since = barsSinceCross(e8, e21, last);
	const fresh = since <= 1;
	const rule = bias === "Bullish" ? fresh ? "buy" : "hold-long" : fresh ? "sell" : "hold-short";
	const crossAt = closed[Math.max(0, last - since)].t;
	const spreadPct = (ema8 - ema21) / closed[last].c * 100;
	let developingFlip = false;
	if (forming) {
		const liveCloses = [...closedCloses, forming.c];
		const live8 = emaSeries(liveCloses, 8).at(-1);
		const live21 = emaSeries(liveCloses, 21).at(-1);
		if (live8 != null && live21 != null) developingFlip = (live8 > live21 ? "Bullish" : "Bearish") !== bias;
	}
	const wait = developingFlip ? " The 4-hour candle still open is pushing the other way. It is not a signal until it closes." : "";
	const stretched = !fresh && Math.abs(spreadPct) >= 1.5 ? " The averages are far apart, so opening new leverage here is a late chase." : "";
	let actionTitle;
	let actionDetail;
	if (rule === "buy") {
		actionTitle = "Buy — open a long";
		actionDetail = "The 8 EMA crossed above the 21 on a closed 4-hour candle. That is the buy. With leverage, 3× to 5× isolated is enough if you risk about 1% and the stop sits closer than liquidation." + wait;
	} else if (rule === "hold-long") {
		actionTitle = "Hold — do not sell";
		actionDetail = `The 8 EMA is still above the 21, but that cross was ${since} candles ago. Stay long or flat. Do not short, and do not add leverage just because price is rising.` + stretched + wait;
	} else if (rule === "sell") {
		actionTitle = "Sell — close longs or open a short";
		actionDetail = "The 8 EMA crossed below the 21 on a closed 4-hour candle. That is the sell. Exit longs. A short is the leveraged trade, and only if liquidation sits beyond the stop." + wait;
	} else {
		actionTitle = "Hold — do not buy";
		actionDetail = `The 8 EMA is still below the 21, but that cross was ${since} candles ago. Stay short or flat. Do not buy until a 4-hour candle closes with the 8 back above the 21.` + stretched + wait;
	}
	const series = forming ? [...closed, forming] : closed;
	const allCloses = series.map((c) => c.c);
	const chart8 = emaSeries(allCloses, 8);
	const chart21 = emaSeries(allCloses, 21);
	const chart = series.slice(-90).map((candle, index, arr) => {
		const sourceIndex = series.length - arr.length + index;
		return {
			t: candle.t,
			close: candle.c,
			ema8: chart8[sourceIndex],
			ema21: chart21[sourceIndex]
		};
	});
	const nextCloseAt = forming ? forming.t + FOUR_H_MS : closed[last].t + FOUR_H_MS * 2;
	return {
		bias,
		rule,
		fresh,
		ema8,
		ema21,
		spreadPct,
		crossAt,
		barsSinceCross: since,
		developingFlip,
		atr: averageTrueRange(closed, 14),
		actionTitle,
		actionDetail,
		nextCloseAt,
		chart,
		price: (forming ?? closed[last]).c
	};
}
function roundTo(n, places) {
	const p = 10 ** places;
	return Math.round(n * p) / p;
}
function planTrade(input) {
	const { side, entry, stop, leverage, riskPct, equity, cash } = input;
	const blank = {
		qty: 0,
		notional: 0,
		margin: 0,
		liq: 0,
		riskUsd: 0,
		lossAtStop: 0,
		stopDistPct: 0,
		liqDistPct: 0,
		maxLeverage: 0,
		stopInsideLiq: false,
		cappedByMargin: false,
		error: null
	};
	if (!(entry > 0) || !(stop > 0) || !Number.isFinite(entry) || !Number.isFinite(stop)) return {
		...blank,
		error: "Enter a price and a stop."
	};
	if (side === "long" && stop >= entry) return {
		...blank,
		error: "A long stop has to sit below the entry."
	};
	if (side === "short" && stop <= entry) return {
		...blank,
		error: "A short stop has to sit above the entry."
	};
	if (!(leverage >= 1) || !(equity > 0)) return {
		...blank,
		error: "Equity has to be above zero."
	};
	if (!(cash > 0)) return {
		...blank,
		error: "No free margin. Close a position or add funds."
	};
	const distance = Math.abs(entry - stop);
	const riskUsd = equity * (riskPct / 100);
	let qty = riskUsd / distance;
	let cappedByMargin = false;
	const maxQty = cash * leverage / entry;
	if (qty > maxQty) {
		qty = maxQty;
		cappedByMargin = true;
	}
	qty = Math.floor(qty * 1e6) / 1e6;
	if (!(qty > 0)) return {
		...blank,
		error: "That size rounds to nothing. Raise risk or free up margin."
	};
	let notional = qty * entry;
	let margin = notional / leverage;
	if (margin > cash) {
		qty = Math.floor(cash * leverage / entry * 1e6) / 1e6;
		notional = qty * entry;
		margin = notional / leverage;
		cappedByMargin = true;
	}
	margin = roundTo(margin, 2);
	notional = roundTo(notional, 2);
	const liq = liquidationPrice(entry, leverage, side);
	const lossAtStop = roundTo(qty * distance, 2);
	const maxLeverage = maxLeverageForStop(entry, stop, side);
	const stopInsideLiq = side === "long" ? liq >= stop : liq <= stop;
	return {
		qty,
		notional,
		margin,
		liq,
		riskUsd: roundTo(riskUsd, 2),
		lossAtStop,
		stopDistPct: distance / entry * 100,
		liqDistPct: Math.abs(liq - entry) / entry * 100,
		maxLeverage,
		stopInsideLiq,
		cappedByMargin,
		error: null
	};
}
function PriceChart({ points }) {
	const data = points.map((point) => ({
		...point,
		price: point.close
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-64 w-full min-w-0",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
				data,
				margin: {
					top: 8,
					right: 4,
					left: 0,
					bottom: 0
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
						stroke: "var(--color-line)",
						vertical: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						dataKey: "t",
						tickFormatter: dayLabel,
						minTickGap: 40,
						tick: {
							fill: "var(--color-muted)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						domain: ["auto", "auto"],
						tickFormatter: (value) => `${Math.round(value / 1e3)}k`,
						width: 40,
						tick: {
							fill: "var(--color-muted)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						contentStyle: {
							background: "var(--color-surface-2)",
							border: "1px solid var(--color-line)",
							borderRadius: 12,
							fontSize: 12
						},
						labelFormatter: (label) => utcStamp(Number(label)),
						formatter: (value, name) => {
							const n = typeof value === "number" ? value : Number(value);
							const label = name === "ema8" ? "8 EMA" : name === "ema21" ? "21 EMA" : "Price";
							return [px(n), label];
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						type: "monotone",
						dataKey: "price",
						stroke: "var(--color-fg)",
						dot: false,
						strokeWidth: 1.6,
						isAnimationActive: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						type: "monotone",
						dataKey: "ema8",
						stroke: "var(--color-accent)",
						dot: false,
						strokeWidth: 2,
						connectNulls: true,
						isAnimationActive: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						type: "monotone",
						dataKey: "ema21",
						stroke: "var(--color-muted)",
						dot: false,
						strokeWidth: 1.6,
						connectNulls: true,
						isAnimationActive: false
					})
				]
			})
		})
	});
}
var RULES = [
	{
		id: "buy",
		label: "Buy",
		when: "8 crosses above 21"
	},
	{
		id: "hold-long",
		label: "Hold long",
		when: "8 stays above 21"
	},
	{
		id: "sell",
		label: "Sell",
		when: "8 crosses below 21"
	},
	{
		id: "hold-short",
		label: "Hold short",
		when: "8 stays below 21"
	}
];
var panel = "rounded-2xl border border-line bg-surface p-4";
var field = "h-12 w-full rounded-xl border border-line bg-bg px-3 font-mono text-base text-fg outline-none focus-visible:border-accent";
function Desk({ market, stale, refreshing, onRefresh }) {
	const [entryText, setEntryText] = (0, import_react.useState)(null);
	const [stopText, setStopText] = (0, import_react.useState)(null);
	const [sideOverride, setSideOverride] = (0, import_react.useState)(null);
	const [note, setNote] = (0, import_react.useState)(null);
	const [closingId, setClosingId] = (0, import_react.useState)(null);
	const [exitText, setExitText] = (0, import_react.useState)("");
	const [fundsText, setFundsText] = (0, import_react.useState)("1000");
	const [fundsOpen, setFundsOpen] = (0, import_react.useState)(false);
	const [resetArmed, setResetArmed] = (0, import_react.useState)(false);
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
	(0, import_react.useEffect)(() => {
		useBook.persist.rehydrate();
	}, []);
	const signal = (0, import_react.useMemo)(() => readSignal(market.candles, market.fetchedAt), [market.candles, market.fetchedAt]);
	const side = sideOverride ?? (signal?.bias === "Bullish" ? "long" : "short");
	const entry = entryText === null ? Number(market.price.toFixed(2)) : Number(entryText);
	const atr = signal?.atr ?? 0;
	const suggested = Number.isFinite(entry) && entry > 0 ? suggestedStop(entry, atr, side) : NaN;
	const stop = stopText === null ? Number(suggested.toFixed(2)) : Number(stopText);
	const marked = (0, import_react.useMemo)(() => {
		return positions.reduce((sum, position) => {
			const pnl = unrealizedPnl(position, market.price);
			return {
				upnl: sum.upnl + pnl,
				locked: sum.locked + position.margin
			};
		}, {
			upnl: 0,
			locked: 0
		});
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
		cash
	});
	const safeLev = Number.isFinite(plan.maxLeverage) && plan.maxLeverage >= 1 ? Math.max(1, Math.floor(plan.maxLeverage)) : null;
	function chooseSide(next) {
		setSideOverride(next);
		setStopText(null);
	}
	function logTrade() {
		if (plan.error || !(plan.qty > 0)) return;
		if (!openPosition({
			side,
			entry,
			qty: plan.qty,
			leverage,
			margin: plan.margin,
			stop
		})) {
			setNote("Could not log that — free margin changed.");
			return;
		}
		setNote(`${side === "long" ? "Long" : "Short"} logged at ${px(entry)}.`);
		setEntryText(null);
		setStopText(null);
	}
	function confirmClose(position) {
		const exit = Number(exitText);
		const trade = closePosition(position.id, exit);
		if (!trade) {
			setNote("Enter the fill price to close.");
			return;
		}
		setClosingId(null);
		setNote(trade.liquidated ? `Closed as a liquidation. Loss capped at the margin, ${money(trade.pnl)}.` : `Closed ${trade.side} for ${signedMoney(trade.pnl)}.`);
	}
	const funds = Number(fundsText);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold tracking-wide text-accent",
								children: "BTC Desk"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full border border-line px-2 py-1 text-xs text-muted",
								children: "BTCUSDT"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full border border-line px-2 py-1 text-xs text-muted",
								children: "4H"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onRefresh,
						"aria-label": "Refresh price",
						className: "flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-fg",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
							className: "size-4",
							"aria-hidden": "true"
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-2 font-mono text-4xl font-medium tabular-nums text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `live-dot inline-block size-2 shrink-0 rounded-full ${stale ? "bg-down" : "bg-up"}` }), px(market.price)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: `font-mono text-sm tabular-nums ${market.changePct >= 0 ? "text-up" : "text-down"}`,
							children: [signedPct(market.changePct), " today"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								"24h ",
								px(market.low24),
								" – ",
								px(market.high24)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UpdatedAgo, {
									fetchedAt: market.fetchedAt,
									refreshing
								}),
								" · ",
								market.source
							]
						})
					]
				})]
			}),
			signal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignalCard, {
				signal,
				fetchedAt: market.fetchedAt
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: panel,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: "Waiting on candles"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-muted",
					children: "The price is in, but there are not enough 4-hour bars to read the averages yet."
				})]
			}),
			signal ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: panel,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex flex-col gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-semibold text-fg",
							children: "4-hour chart"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex flex-wrap items-center gap-3 text-xs text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {
									swatch: "bg-fg",
									label: "Price"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {
									swatch: "bg-accent",
									label: "8 EMA"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {
									swatch: "bg-muted",
									label: "21 EMA"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriceChart, { points: signal.chart }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted",
						children: "The call above uses closed candles only. The last point on the chart is the live candle."
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: panel,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-semibold",
							children: "Size the leverage"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Risk is taken off equity. Margin comes out of free cash. Nothing is sent to an exchange."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => chooseSide("long"),
								className: `h-12 flex-1 rounded-xl border font-semibold ${side === "long" ? "border-up bg-up text-bg" : "border-line bg-bg text-muted"}`,
								children: "Long"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => chooseSide("short"),
								className: `h-12 flex-1 rounded-xl border font-semibold ${side === "short" ? "border-down bg-down text-bg" : "border-line bg-bg text-muted"}`,
								children: "Short"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-2 flex items-center justify-between text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted",
										children: "Leverage"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono tabular-nums text-fg",
										children: [leverage, "×"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "range",
									min: 1,
									max: 20,
									step: 1,
									value: leverage,
									"aria-label": "Leverage",
									onChange: (event) => setLeverage(Number(event.target.value)),
									className: "h-11 w-full accent-accent"
								}),
								leverage >= 10 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-down",
									children: "10× and above can liquidate on an ordinary 4-hour wick."
								}) : null
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2 text-sm text-muted",
								children: "Risk per trade"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-3 gap-2",
								children: [
									.5,
									1,
									2
								].map((pct) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setRiskPct(pct),
									className: `h-11 rounded-xl border font-mono text-sm tabular-nums ${riskPct === pct ? "border-accent bg-accent text-accent-ink" : "border-line bg-bg text-fg"}`,
									children: [pct, "%"]
								}, pct))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-sm text-muted",
								children: ["Entry", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: `${field} mt-1`,
									inputMode: "decimal",
									value: entryText ?? (Number.isFinite(market.price) ? market.price.toFixed(2) : ""),
									onChange: (event) => setEntryText(event.target.value)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-sm text-muted",
								children: ["Stop", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: `${field} mt-1`,
									inputMode: "decimal",
									value: stopText ?? (Number.isFinite(suggested) ? suggested.toFixed(2) : ""),
									onChange: (event) => setStopText(event.target.value)
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-2 text-sm font-medium text-accent",
							onClick: () => {
								setEntryText(null);
								setStopText(null);
							},
							children: "Use live price and a 1.25× ATR stop"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Size",
									value: plan.qty ? btc(plan.qty) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Notional",
									value: plan.notional ? money(plan.notional) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Margin locked",
									value: plan.margin ? money(plan.margin) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Loss if stopped",
									value: plan.lossAtStop ? money(plan.lossAtStop) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Stop distance",
									value: plan.stopDistPct ? signedPct(plan.stopDistPct).replace("+", "") : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Liquidation",
									value: plan.liq ? px(plan.liq) : "—"
								})
							]
						}),
						plan.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-down",
							children: plan.error
						}) : null,
						!plan.error && plan.cappedByMargin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: "Size was cut so the margin fits the free cash. Risk is under the target."
						}) : null,
						!plan.error && plan.stopInsideLiq ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-sm text-down",
							children: [
								"Liquidation at ",
								px(plan.liq),
								" is closer than the stop at ",
								px(stop),
								". This leverage would close the trade before the stop.",
								" ",
								safeLev && safeLev < leverage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "font-semibold text-accent",
									onClick: () => setLeverage(safeLev),
									children: [
										"Set leverage to ",
										safeLev,
										"×"
									]
								}) : "Widen the stop or drop the leverage."
							]
						}) : null,
						!plan.error && !plan.stopInsideLiq && plan.liq ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-sm text-up",
							children: [
								"Stop hits first. Liquidation is ",
								plan.liqDistPct.toFixed(1),
								"% away, the stop ",
								plan.stopDistPct.toFixed(1),
								"%."
							]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "mt-4 h-12 w-full rounded-xl bg-accent font-semibold text-accent-ink disabled:opacity-40",
							disabled: Boolean(plan.error),
							onClick: logTrade,
							children: [side === "long" ? "Log long" : "Log short", plan.stopInsideLiq && !plan.error ? " anyway" : ""]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs text-muted",
							children: "Liquidation assumes isolated margin and 0.4% maintenance. Your venue’s number will differ."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: panel,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-start justify-between gap-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-semibold",
								children: "Portfolio"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: "Paper ledger on this device. Marked to the live price."
							})] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-4 grid grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Equity",
									value: money(equity),
									large: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Result",
									value: signedMoney(realized + marked.upnl),
									large: true,
									tone: realized + marked.upnl
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Free cash",
									value: money(cash)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Open P&L",
									value: signedMoney(marked.upnl),
									tone: marked.upnl
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-semibold text-fg",
								children: "Open"
							}), positions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Nothing open. When the signal says buy or sell, size it in the leverage panel and log the fill."
							}) : positions.map((position) => {
								const pnl = unrealizedPnl(position, market.price);
								const confirming = closingId === position.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "rounded-xl border border-line bg-bg p-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "font-semibold",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: position.side === "long" ? "text-up" : "text-down",
														children: position.side === "long" ? "Long" : "Short"
													}),
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-mono text-sm tabular-nums text-muted",
														children: [position.leverage, "×"]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 font-mono text-sm tabular-nums text-fg",
												children: [
													btc(position.qty),
													" @ ",
													px(position.entry)
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 text-xs text-muted",
												children: [
													"Stop ",
													px(position.stop),
													" · margin ",
													money(position.margin),
													" · ",
													utcStamp(position.openedAt)
												]
											})
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: `font-mono text-sm tabular-nums ${pnl >= 0 ? "text-up" : "text-down"}`,
											children: signedMoney(pnl)
										})]
									}), confirming ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 flex flex-col gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "text-sm text-muted",
											children: ["Exit price", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												className: `${field} mt-1`,
												inputMode: "decimal",
												value: exitText,
												onChange: (event) => setExitText(event.target.value)
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "h-11 flex-1 rounded-xl bg-accent font-semibold text-accent-ink",
												onClick: () => confirmClose(position),
												children: "Confirm close"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "h-11 rounded-xl border border-line px-3 text-fg",
												onClick: () => setClosingId(null),
												children: "Cancel"
											})]
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "mt-3 h-11 w-full rounded-xl border border-line text-sm font-medium text-fg",
										onClick: () => {
											setClosingId(position.id);
											setExitText(market.price.toFixed(2));
										},
										children: "Close at market"
									})]
								}, position.id);
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-semibold text-fg",
								children: "Closed"
							}), history.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Closed trades land here with realized P&L."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto",
								children: history.map((trade) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-center justify-between gap-3 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-muted",
										children: [
											trade.side === "long" ? "Long" : "Short",
											" ",
											trade.leverage,
											"×",
											trade.liquidated ? " · liquidated" : "",
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "mt-0.5 block font-mono text-xs tabular-nums",
												children: [
													px(trade.entry),
													" → ",
													px(trade.exit)
												]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `font-mono tabular-nums ${trade.pnl >= 0 ? "text-up" : "text-down"}`,
										children: signedMoney(trade.pnl)
									})]
								}, `${trade.id}-${trade.closedAt}`))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 border-t border-line pt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "text-sm font-medium text-accent",
								onClick: () => {
									setFundsOpen((open) => !open);
									setResetArmed(false);
								},
								children: fundsOpen ? "Hide balance tools" : "Adjust balance"
							}), fundsOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex flex-col gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "text-sm text-muted",
										children: ["Amount in USDT", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											className: `${field} mt-1`,
											inputMode: "decimal",
											value: fundsText,
											onChange: (event) => setFundsText(event.target.value)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "h-11 flex-1 rounded-xl border border-line font-medium",
											onClick: () => {
												addCash(funds);
												setNote(`Added ${money(funds)} to free cash.`);
											},
											disabled: !(funds > 0),
											children: "Add"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "h-11 flex-1 rounded-xl border border-line font-medium",
											onClick: () => {
												withdraw(Math.min(funds, cash));
												setNote("Withdrew from free cash.");
											},
											disabled: !(funds > 0) || cash <= 0,
											children: "Withdraw"
										})]
									}),
									resetArmed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-11 rounded-xl bg-down font-semibold text-bg",
										onClick: () => {
											reset();
											setResetArmed(false);
											setNote("Ledger reset to $10,000.");
										},
										children: "Confirm reset to $10,000"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-11 text-sm text-muted",
										onClick: () => setResetArmed(true),
										children: "Reset paper book"
									})
								]
							}) : null]
						})
					]
				})]
			}),
			note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-fg",
				"aria-live": "polite",
				children: note
			}) : null,
			stale ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-down",
				children: "The last refresh failed. Figures above are the previous read."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "pb-6 text-xs text-muted",
				children: "Not financial advice. Buy means the 8 EMA has closed above the 21 on the BTCUSDT 4-hour chart. Sell means it has closed below. This desk does not place orders. Leverage can wipe the margin. The ledger stays in this browser."
			})
		]
	});
}
function SignalCard({ signal, fetchedAt }) {
	const bull = signal.bias === "Bullish";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: `${panel} border-l-4 ${bull ? "border-l-up" : "border-l-down"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-muted",
				children: "4-hour 8 / 21 EMA"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: `mt-1 text-5xl font-semibold tracking-tight ${bull ? "text-up" : "text-down"}`,
				children: signal.bias
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-base text-fg",
				children: [
					"The 8 EMA is ",
					bull ? "above" : "below",
					" the 21 EMA",
					signal.fresh ? ", and the cross just closed." : "."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-lg font-semibold text-fg",
				children: signal.actionTitle
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: signal.actionDetail
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 grid grid-cols-2 gap-2",
				children: RULES.map((rule) => {
					const active = rule.id === signal.rule;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: `min-h-11 rounded-xl border px-3 py-2 ${active ? "border-accent bg-surface-2" : "border-line"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: `text-sm font-semibold ${active ? "text-fg" : "text-muted"}`,
							children: rule.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: rule.when
						})]
					}, rule.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "8 EMA",
						value: px(signal.ema8)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "21 EMA",
						value: px(signal.ema21)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Gap",
						value: signedPct(signal.spreadPct),
						tone: signal.spreadPct
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Candles since cross",
						value: String(signal.barsSinceCross)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "Last cross"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 font-mono text-sm tabular-nums text-fg",
							children: utcStamp(signal.crossAt)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "This candle closes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 font-mono text-sm tabular-nums text-fg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandleClock, {
								nextCloseAt: signal.nextCloseAt,
								fetchedAt
							})
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "A buy or a sell counts only when the 4-hour candle closes. A wick mid-candle is not the signal."
			})
		]
	});
}
function Stat({ label, value, tone, large }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: `mt-1 font-mono tabular-nums ${large ? "text-xl" : "text-sm"} ${tone == null ? "text-fg" : tone >= 0 ? "text-up" : "text-down"}`,
			children: value
		})]
	});
}
function Legend({ swatch, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `inline-block size-2 rounded-full ${swatch}` }), label]
	});
}
function CandleClock({ nextCloseAt, fetchedAt }) {
	const [now, setNow] = (0, import_react.useState)(fetchedAt);
	(0, import_react.useEffect)(() => {
		const tick = () => setNow(Date.now());
		tick();
		const id = window.setInterval(tick, 1e3);
		return () => window.clearInterval(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: countdown(nextCloseAt - now) });
}
function UpdatedAgo({ fetchedAt, refreshing }) {
	const [now, setNow] = (0, import_react.useState)(fetchedAt);
	(0, import_react.useEffect)(() => {
		const tick = () => setNow(Date.now());
		tick();
		const id = window.setInterval(tick, 1e3);
		return () => window.clearInterval(id);
	}, []);
	if (refreshing) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: "Updating" });
	const age = Math.max(0, Math.round((now - fetchedAt) / 1e3));
	if (age < 5) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: "Live" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		"Updated ",
		age,
		"s ago"
	] });
}
function Home() {
	const initial = Route.useLoaderData();
	const query = useQuery({
		queryKey: ["btc-market"],
		queryFn: () => getMarket(),
		initialData: initial,
		initialDataUpdatedAt: initial.fetchedAt,
		staleTime: 15e3,
		refetchInterval: 3e4
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Desk, {
		market: query.data,
		stale: query.isError,
		refreshing: query.isFetching && !query.isLoading,
		onRefresh: () => void query.refetch()
	});
}
//#endregion
export { Home as component };
