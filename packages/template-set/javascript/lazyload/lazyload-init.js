/*
 * Initialisation de vanilla-lazyload — pages legacy uniquement.
 * Chargé en `defer` juste après lazyload.min.js (fin de body via AddResources),
 * donc le global `LazyLoad` est déjà défini et le DOM est analysé.
 * Fichier externe self-hosté : aucun script inline, compatible CSP stricte.
 */
(function () {
	function init() {
		// `LazyLoad` est un global injecté au runtime par lazyload.min.js (script externe).
		// Accès via `window` + cast JSDoc pour éviter le TS2304 "Cannot find name 'LazyLoad'"
		// signalé par VS Code sur ce fichier .js non typé.
		var LazyLoad = /** @type {any} */ (window).LazyLoad;
		if (!LazyLoad) {
			return;
		}
		new LazyLoad({
			elements_selector: ".lazy",
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
