export interface GtmEvent {
	event: string;
	[key: string]: unknown;
}

export type EulerianPayload = Record<string, string | number | boolean | null | undefined>;

const CONTEXT_ID_KEY = "sofinco.tracking.context_id";
const ENTRY_POINT_KEY = "sofinco.tracking.entry_point";

type AnalyticsWindow = Window & {
	dataLayer?: unknown[];
	EA_push?: (...args: unknown[]) => void;
	__SOFINCO_TRACKING_CONTEXT__?: Record<string, unknown>;
	__SOFINCO_TRACK__?: (payload: GtmEvent) => void;
};

const generateId = (): string => {
	try {
		const c = (window as unknown as { crypto?: Crypto }).crypto;
		if (c && typeof c.randomUUID === "function") return c.randomUUID();
	} catch {
		/* fall through */
	}
	return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
};

const getSessionContext = (): { context_id: string; entry_point: string } => {
	const empty = { context_id: "", entry_point: "" };
	if (typeof window === "undefined") return empty;
	try {
		const storage = window.sessionStorage;
		let contextId = storage.getItem(CONTEXT_ID_KEY);
		if (!contextId) {
			contextId = generateId();
			storage.setItem(CONTEXT_ID_KEY, contextId);
		}
		let entryPoint = storage.getItem(ENTRY_POINT_KEY);
		if (!entryPoint) {
			entryPoint = window.location.href;
			storage.setItem(ENTRY_POINT_KEY, entryPoint);
		}
		return { context_id: contextId, entry_point: entryPoint };
	} catch {
		return empty;
	}
};

const buildBasePayload = (): Record<string, unknown> => {
	if (typeof window === "undefined") return {};
	const w = window as AnalyticsWindow;
	return {
		...(w.__SOFINCO_TRACKING_CONTEXT__ ?? {}),
		...getSessionContext(),
		timestamp: new Date().toString(),
	};
};

export const trackEvent = (payload: GtmEvent): void => {
	if (typeof window === "undefined") return;
	const w = window as AnalyticsWindow;
	if (typeof w.__SOFINCO_TRACK__ === "function") {
		w.__SOFINCO_TRACK__(payload);
		return;
	}
	w.dataLayer = w.dataLayer ?? [];
	w.dataLayer.push({ ...buildBasePayload(), ...payload });
};

/**
 * Push an Eulerian tag via the global EA_push queue (vendor: Numberly/Eulerian).
 * Accepts a key/value object and flattens it to the alternating array shape
 * expected by EA_push (["k1", "v1", "k2", "v2", ...]).
 * Silent no-op if EA_push is not present (page outside Eulerian scope).
 */
export const trackEulerian = (payload: EulerianPayload): void => {
	if (typeof window === "undefined") return;
	const w = window as AnalyticsWindow;
	if (typeof w.EA_push !== "function") return;
	const flat: string[] = [];
	for (const [k, v] of Object.entries(payload)) {
		flat.push(k, v == null ? "" : String(v));
	}
	w.EA_push(flat);
};
