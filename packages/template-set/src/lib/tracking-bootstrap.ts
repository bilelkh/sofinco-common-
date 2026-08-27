// Inlined as a string into Layout.tsx's <head> via the `?inline-script` Vite
// plugin (see vite.config.mjs). Authored as readable TS; minified at build
// time by esbuild. Runs before GTM/Eulerian so window.__SOFINCO_TRACK__ is
// always defined when downstream tags fire.

interface TrackingPayload {
	event?: string;
	[key: string]: unknown;
}

declare global {
	interface Window {
		__SOFINCO_TRACK__?: (payload: TrackingPayload) => void;
		__SOFINCO_TRACKING_CONTEXT__?: Record<string, unknown>;
		dataLayer?: unknown[];
	}
}

(function bootstrap() {
	const CONTEXT_KEY = "sofinco.tracking.context_id";
	const ENTRY_KEY = "sofinco.tracking.entry_point";

	function newId(): string {
		try {
			if (window.crypto && typeof crypto.randomUUID === "function") {
				return crypto.randomUUID();
			}
		} catch {
			/* sealed iframes etc. */
		}
		return Date.now().toString(16) + "-" + Math.random().toString(16).slice(2, 10);
	}

	function getSession(): { context_id: string; entry_point: string } {
		try {
			const store = window.sessionStorage;
			let contextId = store.getItem(CONTEXT_KEY);
			let entryPoint = store.getItem(ENTRY_KEY);
			if (!contextId) {
				contextId = newId();
				store.setItem(CONTEXT_KEY, contextId);
			}
			if (!entryPoint) {
				entryPoint = location.href;
				store.setItem(ENTRY_KEY, entryPoint);
			}
			return { context_id: contextId, entry_point: entryPoint };
		} catch {
			return { context_id: "", entry_point: "" };
		}
	}

	window.__SOFINCO_TRACK__ = function track(payload: TrackingPayload) {
		if (!payload || !payload.event) return;
		const base = window.__SOFINCO_TRACKING_CONTEXT__ || {};
		window.dataLayer = window.dataLayer || [];
		const merged: Record<string, unknown> = {};
		Object.assign(merged, base, getSession(), { timestamp: new Date().toString() }, payload);
		window.dataLayer.push(merged);
	};

	/*
	 * Amorce du dataLayer. Sans elle, le contexte de page ne vit que dans
	 * `window.__SOFINCO_TRACKING_CONTEXT__` et n'est fusionné qu'au premier
	 * événement : les Data Layer Variables de GTM sont vides sur le déclencheur
	 * « All Pages », qui part pourtant dès `gtm.js`. Ce script étant inline et
	 * placé AVANT le snippet GTM dans le <head> (cf. `Layout.tsx`), la poussée est
	 * déjà dans le dataLayer quand GTM lit son état initial.
	 *
	 * Pas de clé `event` : c'est une mise à jour de variables, pas un événement.
	 * En ajouter une déclencherait les tags une première fois ici, puis une
	 * seconde au `gtm.js` — soit un doublon de page vue.
	 *
	 * Pas de `timestamp` non plus, pour la même raison : l'amorce n'est pas un
	 * événement, elle n'a pas d'heure. Les deux autres chemins en portent un
	 * (`__SOFINCO_TRACK__` ci-dessus, `buildBasePayload` côté sofinco-react) parce
	 * qu'ils datent un événement réel. En poser un ici ferait lire à un tag « All
	 * Pages » l'heure d'un événement qui n'a pas eu lieu.
	 */
	(function seedDataLayer() {
		const base = window.__SOFINCO_TRACKING_CONTEXT__;
		if (!base) return;
		window.dataLayer = window.dataLayer || [];
		const seed: Record<string, unknown> = {};
		Object.assign(seed, base, getSession());
		window.dataLayer.push(seed);
	})();

	function fireFromAttr(el: Element, attr: string) {
		const raw = el.getAttribute(attr);
		if (!raw) return;
		let parsed: TrackingPayload | TrackingPayload[];
		try {
			parsed = JSON.parse(raw);
		} catch {
			return;
		}
		const list = Array.isArray(parsed) ? parsed : [parsed];
		for (let i = 0; i < list.length; i++) {
			window.__SOFINCO_TRACK__!(list[i]);
		}
	}

	// Delegated click handler — capture phase so it runs before navigation.
	document.addEventListener(
		"click",
		function onClick(event) {
			const target = event.target as Element | null;
			const el = target && target.closest ? target.closest("[data-tracking]") : null;
			if (!el) return;
			fireFromAttr(el, "data-tracking");
		},
		true,
	);

	// View-impression observer — fires once per element when 25% visible.
	if ("IntersectionObserver" in window) {
		const seen = new WeakSet<Element>();
		const io = new IntersectionObserver(
			function onIntersect(entries) {
				entries.forEach(function (entry) {
					if (!entry.isIntersecting) return;
					if (seen.has(entry.target)) return;
					seen.add(entry.target);
					fireFromAttr(entry.target, "data-tracking-view");
					io.unobserve(entry.target);
				});
			},
			{ threshold: 0.25 },
		);

		function start() {
			document.querySelectorAll("[data-tracking-view]").forEach(function (node) {
				io.observe(node);
			});
			new MutationObserver(function (mutations) {
				mutations.forEach(function (m) {
					m.addedNodes.forEach(function (node) {
						if (!(node instanceof Element)) return;
						if (node.hasAttribute && node.hasAttribute("data-tracking-view")) {
							io.observe(node);
						}
						if (node.querySelectorAll) {
							node.querySelectorAll("[data-tracking-view]").forEach(function (child) {
								io.observe(child);
							});
						}
					});
				});
			}).observe(document.body, { childList: true, subtree: true });
		}

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", start);
		} else {
			start();
		}
	}
})();

export {};
