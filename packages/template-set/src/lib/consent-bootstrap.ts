// Inliné en chaîne dans le <head> de Layout.tsx via le plugin Vite `?inline-script`
// (cf. vite.config.mjs). Écrit en TS lisible, minifié au build par esbuild.
//
// Ouvre le panneau de préférences du CMP au clic sur un élément portant
// `data-consent-action="preferences"` — attribut posé par le composant `FooterLink` du
// design system sur l'entrée marquée `isConsent`, qu'il rend alors en `<button>`.
//
// Pourquoi un délégué global et pas un `onClick` React : le pied de page est rendu côté
// serveur SANS îlot — la source live ne contient aucun `<jsm-island>` autour de lui —
// donc aucun gestionnaire React n'y est jamais attaché. Et même à l'intérieur d'un îlot,
// les props sont sérialisées en JSON : une fonction ne traverse pas cette frontière, un
// attribut de données si. Même mécanique que `tracking-bootstrap.ts`, qui écoute
// `data-tracking`.

interface DidomiSdk {
	preferences?: { show?: () => void };
}

declare global {
	interface Window {
		didomiOnReady?: Array<(didomi: DidomiSdk) => void>;
	}
}

(function bootstrap() {
	const ACTION_ATTR = "data-consent-action";
	const ACTION_PREFERENCES = "preferences";

	/*
	 * On empile dans `didomiOnReady` au lieu d'appeler `Didomi.preferences.show()`
	 * directement. Le SDK est chargé en async : un clic survenu avant la fin du
	 * chargement lèverait une ReferenceError. La file est drainée par le SDK dès qu'il
	 * est prêt, donc le clic précoce est différé, pas perdu.
	 *
	 * Si aucun CMP n'est chargé — en contribution, où il est volontairement désactivé —
	 * la callback n'est jamais appelée : le bouton est inerte, sans erreur en console.
	 */
	function openPreferences() {
		window.didomiOnReady = window.didomiOnReady || [];
		window.didomiOnReady.push(function show(didomi) {
			if (didomi && didomi.preferences && typeof didomi.preferences.show === "function") {
				didomi.preferences.show();
			}
		});
	}

	document.addEventListener(
		"click",
		function onClick(event) {
			const target = event.target as Element | null;
			const el = target && target.closest ? target.closest("[" + ACTION_ATTR + "]") : null;
			if (!el || el.getAttribute(ACTION_ATTR) !== ACTION_PREFERENCES) return;

			/*
			 * PAS de `stopPropagation` : en phase de capture sur `document`, il couperait
			 * l'événement avant qu'il n'atteigne quoi que ce soit en dessous. Le délégué de
			 * mesure écoutant lui aussi `document`, il continuerait de recevoir le clic —
			 * mais le jour où il serait rattaché plus bas, le `data-tracking` de ce bouton
			 * cesserait de partir, sans rien pour le signaler.
			 *
			 * Pas de `preventDefault` non plus : l'élément est un `<button type="button">`,
			 * il n'a aucun comportement par défaut à annuler.
			 */
			openPreferences();
		},
		true,
	);
})();

export {};
