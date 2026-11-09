export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

export type Side = "long" | "short";
export type Bias = "Bullish" | "Bearish";
export type RuleId = "buy" | "hold-long" | "sell" | "hold-short";

export const FOUR_H_MS = 4 * 60 * 60 * 1000;
/** Small-position BTC maintenance margin used only as a liquidation estimate. */
export const MAINTENANCE_MARGIN = 0.004;

export type ChartPoint = {
  t: number;
  close: number;
  ema8: number | null;
  ema21: number | null;
};

export type SignalRead = {
  bias: Bias;
  rule: RuleId;
  fresh: boolean;
  ema8: number;
  ema21: number;
  spreadPct: number;
  crossAt: number;
  barsSinceCross: number;
  developingFlip: boolean;
  atr: number;
  actionTitle: string;
  actionDetail: string;
  nextCloseAt: number;
  chart: ChartPoint[];
  price: number;
};

export type TradePlan = {
  qty: number;
  notional: number;
  margin: number;
  liq: number;
  riskUsd: number;
  lossAtStop: number;
  stopDistPct: number;
  liqDistPct: number;
  maxLeverage: number;
  stopInsideLiq: boolean;
  cappedByMargin: boolean;
  error: string | null;
};

export function emaSeries(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
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

export function averageTrueRange(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1].c;
    trs.push(Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev)));
  }
  const slice = trs.slice(-period);
  if (!slice.length) return 0;
  return slice.reduce((sum, n) => sum + n, 0) / slice.length;
}

export function liquidationPrice(entry: number, leverage: number, side: Side): number {
  const imr = 1 / leverage;
  if (side === "long") return entry * (1 - imr + MAINTENANCE_MARGIN);
  return entry * (1 + imr - MAINTENANCE_MARGIN);
}

/** Highest leverage at which the stop is still closer than liquidation. */
export function maxLeverageForStop(entry: number, stop: number, side: Side): number {
  if (!(entry > 0) || !(stop > 0)) return 0;
  const denom =
    side === "long" ? 1 + MAINTENANCE_MARGIN - stop / entry : stop / entry - 1 + MAINTENANCE_MARGIN;
  if (denom <= 0) return Number.POSITIVE_INFINITY;
  return 1 / denom;
}

export function suggestedStop(entry: number, atr: number, side: Side): number {
  const dist = Math.max(atr * 1.25, entry * 0.004);
  return side === "long" ? entry - dist : entry + dist;
}

function splitCandles(candles: Candle[], now: number) {
  const ordered = [...candles].sort((a, b) => a.t - b.t);
  const closed: Candle[] = [];
  let forming: Candle | null = null;
  for (const candle of ordered) {
    if (candle.t + FOUR_H_MS <= now) closed.push(candle);
    else forming = candle;
  }
  return { closed, forming };
}

function barsSinceCross(fast: Array<number | null>, slow: Array<number | null>, last: number): number {
  let bars = 0;
  for (let i = last; i > 0; i--) {
    const currF = fast[i];
    const currS = slow[i];
    const prevF = fast[i - 1];
    const prevS = slow[i - 1];
    if (currF == null || currS == null || prevF == null || prevS == null) break;
    const crossed = currF > currS !== prevF > prevS;
    if (crossed) return bars;
    bars += 1;
  }
  return bars;
}

export function readSignal(candles: Candle[], now: number): SignalRead | null {
  const { closed, forming } = splitCandles(candles, now);
  if (closed.length < 30) return null;

  const closedCloses = closed.map((c) => c.c);
  const e8 = emaSeries(closedCloses, 8);
  const e21 = emaSeries(closedCloses, 21);
  const last = closed.length - 1;
  const ema8 = e8[last];
  const ema21 = e21[last];
  if (ema8 == null || ema21 == null) return null;

  const bias: Bias = ema8 > ema21 ? "Bullish" : "Bearish";
  const since = barsSinceCross(e8, e21, last);
  const fresh = since <= 1;
  const rule: RuleId =
    bias === "Bullish" ? (fresh ? "buy" : "hold-long") : fresh ? "sell" : "hold-short";
  const crossAt = closed[Math.max(0, last - since)].t;
  const spreadPct = ((ema8 - ema21) / closed[last].c) * 100;

  let developingFlip = false;
  if (forming) {
    const liveCloses = [...closedCloses, forming.c];
    const live8 = emaSeries(liveCloses, 8).at(-1);
    const live21 = emaSeries(liveCloses, 21).at(-1);
    if (live8 != null && live21 != null) {
      const liveBias: Bias = live8 > live21 ? "Bullish" : "Bearish";
      developingFlip = liveBias !== bias;
    }
  }

  const wait = developingFlip
    ? " The 4-hour candle still open is pushing the other way. It is not a signal until it closes."
    : "";
  const stretched =
    !fresh && Math.abs(spreadPct) >= 1.5
      ? " The averages are far apart, so opening new leverage here is a late chase."
      : "";

  let actionTitle: string;
  let actionDetail: string;
  if (rule === "buy") {
    actionTitle = "Buy — open a long";
    actionDetail =
      "The 8 EMA crossed above the 21 on a closed 4-hour candle. That is the buy. With leverage, 3× to 5× isolated is enough if you risk about 1% and the stop sits closer than liquidation." +
      wait;
  } else if (rule === "hold-long") {
    actionTitle = "Hold — do not sell";
    actionDetail =
      `The 8 EMA is still above the 21, but that cross was ${since} candles ago. Stay long or flat. Do not short, and do not add leverage just because price is rising.` +
      stretched +
      wait;
  } else if (rule === "sell") {
    actionTitle = "Sell — close longs or open a short";
    actionDetail =
      "The 8 EMA crossed below the 21 on a closed 4-hour candle. That is the sell. Exit longs. A short is the leveraged trade, and only if liquidation sits beyond the stop." +
      wait;
  } else {
    actionTitle = "Hold — do not buy";
    actionDetail =
      `The 8 EMA is still below the 21, but that cross was ${since} candles ago. Stay short or flat. Do not buy until a 4-hour candle closes with the 8 back above the 21.` +
      stretched +
      wait;
  }

  const series = forming ? [...closed, forming] : closed;
  const allCloses = series.map((c) => c.c);
  const chart8 = emaSeries(allCloses, 8);
  const chart21 = emaSeries(allCloses, 21);
  const chart: ChartPoint[] = series.slice(-90).map((candle, index, arr) => {
    const sourceIndex = series.length - arr.length + index;
    return {
      t: candle.t,
      close: candle.c,
      ema8: chart8[sourceIndex],
      ema21: chart21[sourceIndex],
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
    price: (forming ?? closed[last]).c,
  };
}

function roundTo(n: number, places: number): number {
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

export function planTrade(input: {
  side: Side;
  entry: number;
  stop: number;
  leverage: number;
  riskPct: number;
  equity: number;
  cash: number;
}): TradePlan {
  const { side, entry, stop, leverage, riskPct, equity, cash } = input;
  const blank: TradePlan = {
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
    error: null,
  };

  if (!(entry > 0) || !(stop > 0) || !Number.isFinite(entry) || !Number.isFinite(stop)) {
    return { ...blank, error: "Enter a price and a stop." };
  }
  if (side === "long" && stop >= entry) {
    return { ...blank, error: "A long stop has to sit below the entry." };
  }
  if (side === "short" && stop <= entry) {
    return { ...blank, error: "A short stop has to sit above the entry." };
  }
  if (!(leverage >= 1) || !(equity > 0)) {
    return { ...blank, error: "Equity has to be above zero." };
  }
  if (!(cash > 0)) {
    return { ...blank, error: "No free margin. Close a position or add funds." };
  }

  const distance = Math.abs(entry - stop);
  const riskUsd = equity * (riskPct / 100);
  let qty = riskUsd / distance;
  let cappedByMargin = false;
  const maxQty = (cash * leverage) / entry;
  if (qty > maxQty) {
    qty = maxQty;
    cappedByMargin = true;
  }
  qty = Math.floor(qty * 1e6) / 1e6;
  if (!(qty > 0)) {
    return { ...blank, error: "That size rounds to nothing. Raise risk or free up margin." };
  }

  let notional = qty * entry;
  let margin = notional / leverage;
  if (margin > cash) {
    qty = Math.floor(((cash * leverage) / entry) * 1e6) / 1e6;
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
    stopDistPct: (distance / entry) * 100,
    liqDistPct: (Math.abs(liq - entry) / entry) * 100,
    maxLeverage,
    stopInsideLiq,
    cappedByMargin,
    error: null,
  };
}
