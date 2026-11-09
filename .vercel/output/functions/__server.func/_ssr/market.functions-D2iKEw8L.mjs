import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/market.functions-D2iKEw8L.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getMarket_createServerFn_handler = createServerRpc({
	id: "6fdfbdff8b779cdd80db4492138674f9ab3498f6077332c5892ed94e3f737172",
	name: "getMarket",
	filename: "src/lib/market.functions.ts"
}, (opts) => getMarket.__executeServer(opts));
var getMarket = createServerFn({ method: "GET" }).handler(getMarket_createServerFn_handler, async () => {
	const { loadMarket } = await import("./market-load-DiUE5I03.mjs");
	return loadMarket();
});
//#endregion
export { getMarket_createServerFn_handler };
