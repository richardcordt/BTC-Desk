//#region node_modules/.nitro/vite/services/ssr/assets/market-load-DiUE5I03.js
var DAY = 864e5;
async function getJson(url) {
	const res = await fetch(url, {
		headers: { accept: "application/json" },
		signal: AbortSignal.timeout(8e3)
	});
	if (!res.ok) throw new Error(`Feed answered ${res.status}`);
	return res.json();
}
function clean(candles) {
	const sorted = [...candles].sort((a, b) => a.t - b.t);
	const out = [];
	for (const candle of sorted) {
		if (![
			candle.o,
			candle.h,
			candle.l,
			candle.c,
			candle.t
		].every(Number.isFinite)) continue;
		if (!(candle.c > 0)) continue;
		if (out.length && out[out.length - 1].t === candle.t) out[out.length - 1] = candle;
		else out.push(candle);
	}
	if (out.length < 40) throw new Error("Not enough candles");
	return out;
}
function applyLastPrice(candles, price) {
	if (!(price > 0)) return candles;
	const next = candles.slice();
	const last = next[next.length - 1];
	next[next.length - 1] = {
		...last,
		c: price,
		h: Math.max(last.h, price),
		l: Math.min(last.l, price)
	};
	return next;
}
function changeFromCandles(candles, price, now) {
	const window = candles.filter((c) => c.t >= now - DAY);
	const sample = window.length ? window : candles.slice(-6);
	const ref = sample[0]?.o || price;
	const high24 = Math.max(price, ...sample.map((c) => c.h));
	const low24 = Math.min(price, ...sample.map((c) => c.l));
	return {
		changePct: ref ? (price - ref) / ref * 100 : 0,
		high24,
		low24
	};
}
function binanceCandles(raw) {
	if (!Array.isArray(raw)) throw new Error("Unexpected candle payload");
	return clean(raw.map((row) => {
		const k = row;
		return {
			t: Number(k[0]),
			o: Number(k[1]),
			h: Number(k[2]),
			l: Number(k[3]),
			c: Number(k[4])
		};
	}));
}
async function fromBinanceUs(now) {
	const [klines, ticker] = await Promise.all([getJson("https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=300"), getJson("https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT")]);
	const t = ticker;
	const price = Number(t.lastPrice);
	const candles = applyLastPrice(binanceCandles(klines), price);
	return {
		source: "Binance.US",
		symbol: "BTCUSDT",
		price,
		changePct: Number(t.priceChangePercent),
		high24: Number(t.highPrice),
		low24: Number(t.lowPrice),
		candles,
		fetchedAt: now
	};
}
async function fromMexc(now) {
	const [klines, ticker] = await Promise.all([getJson("https://api.mexc.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=300"), getJson("https://api.mexc.com/api/v3/ticker/24hr?symbol=BTCUSDT")]);
	const t = ticker;
	const price = Number(t.lastPrice);
	return {
		source: "MEXC",
		symbol: "BTCUSDT",
		price,
		changePct: Number(t.priceChangePercent),
		high24: Number(t.highPrice),
		low24: Number(t.lowPrice),
		candles: applyLastPrice(binanceCandles(klines), price),
		fetchedAt: now
	};
}
async function fromOkx(now) {
	const [candleBody, tickerBody] = await Promise.all([getJson("https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=4H&limit=300"), getJson("https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT")]);
	const rows = candleBody.data;
	const tick = tickerBody.data?.[0];
	if (!rows || !tick) throw new Error("OKX payload missing");
	const price = Number(tick.last);
	const candles = applyLastPrice(clean(rows.map((k) => ({
		t: Number(k[0]),
		o: Number(k[1]),
		h: Number(k[2]),
		l: Number(k[3]),
		c: Number(k[4])
	}))), price);
	const open24 = Number(tick.open24h);
	return {
		source: "OKX",
		symbol: "BTCUSDT",
		price,
		changePct: open24 ? (price - open24) / open24 * 100 : changeFromCandles(candles, price, now).changePct,
		high24: Number(tick.high24h) || changeFromCandles(candles, price, now).high24,
		low24: Number(tick.low24h) || changeFromCandles(candles, price, now).low24,
		candles,
		fetchedAt: now
	};
}
async function fromKraken(now) {
	const result = (await getJson("https://api.kraken.com/0/public/OHLC?pair=XBTUSDT&interval=240")).result;
	const series = result && Object.values(result).find((value) => Array.isArray(value));
	if (!Array.isArray(series)) throw new Error("Kraken payload missing");
	const candles = clean(series.map((row) => {
		const k = row;
		return {
			t: Number(k[0]) * 1e3,
			o: Number(k[1]),
			h: Number(k[2]),
			l: Number(k[3]),
			c: Number(k[4])
		};
	}));
	const price = candles[candles.length - 1].c;
	const day = changeFromCandles(candles, price, now);
	return {
		source: "Kraken",
		symbol: "BTCUSDT",
		price,
		changePct: day.changePct,
		high24: day.high24,
		low24: day.low24,
		candles,
		fetchedAt: now
	};
}
async function loadMarket() {
	const now = Date.now();
	const sources = [
		fromBinanceUs,
		fromMexc,
		fromOkx,
		fromKraken
	];
	for (const source of sources) try {
		const snap = await source(now);
		if (!(snap.price > 0) || !Number.isFinite(snap.changePct)) throw new Error("Bad price");
		return snap;
	} catch {
		continue;
	}
	throw new Error("Bitcoin price feed is unreachable right now. Try refresh in a moment.");
}
//#endregion
export { loadMarket };
