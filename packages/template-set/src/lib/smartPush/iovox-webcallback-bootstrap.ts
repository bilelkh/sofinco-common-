// Inliné en chaîne dans la vue `IovoxWebCallback` via le plugin Vite `?inline-script`
// (cf. vite.config.mjs). Écrit en TS lisible, minifié au build par esbuild.
//
// CONTRAINTE : le plugin appelle `esbuild.transform`, PAS `esbuild.build` — il ne bundle
// rien. Ce fichier doit donc rester TOTALEMENT autonome : un `import` survivrait tel quel
// dans l'IIFE émise et casserait à l'exécution.
//
// Ouvre la modale de rappel immédiat iovox au clic sur le bouton « Faites-vous rappeler
// immédiatement », rendu par Smart Tribune dans son panneau « Aide & Contact ».
//
// Ce bouton ne nous appartient pas : c'est le back-office Smart Tribune (KB 198) qui
// l'injecte, avec un balisage hérité de l'ancien sofinco.fr (`data-bs-toggle="modal"`,
// classes Bootstrap). L'ancien site fournissait Bootstrap pour l'animer ; la refonte ne
// l'embarque pas, et n'a aucune raison de le faire pour un seul bouton tiers. On délègue
// donc le clic nous-mêmes et on ouvre un `<dialog>` natif — qui apporte le voile, la
// touche Échap et le piège de focus, c'est-à-dire exactement ce pour quoi Bootstrap était
// là.
//
// Il n'existe AUCUN script tiers iovox/VoxReflex, ni ici ni sur l'ancien site. Le
// `<img id="voxreflexbutton_<id>_<clé>">` niché dans le bouton ne charge jamais d'image :
// c'est un PORTEUR DE DONNÉES. Smart Tribune y fait passer l'identifiant de compte et la
// clé iovox via l'attribut `id`, à charge pour la page hôte de les en extraire pour bâtir
// l'URL de l'iframe. Toute l'intégration tient là-dedans.

interface IovoxCredentials {
	id: string;
	key: string;
}

declare global {
	interface Window {
		__IOVOX_WCB_BOOT__?: boolean;
	}
}

(function bootstrap() {
	if (window.__IOVOX_WCB_BOOT__) return;
	window.__IOVOX_WCB_BOOT__ = true;

	const DIALOG_ID = "iovoxWebCallback";
	const BODY_ID = "iovoxWebCallbackBody";
	const IFRAME_ID = "iovoxIframe";

	/** Origine de l'iframe iovox — sert aussi de filtre sur les `postMessage` reçus. */
	const WANNASPEAK_ORIGIN = "https://saas.wannaspeak.com";

	/*
	 * `data-bs-target` est le contrat que le back-office Smart Tribune encode déjà ; la
	 * classe reste en second pour le jour où l'attribut Bootstrap sauterait de la config.
	 */
	const TRIGGER_SELECTOR = '[data-bs-target="#' + DIALOG_ID + '"], .contact-button-callback';
	/** Bouton de repli rendu par `IovoxWebCallback` — seule sortie sûre sous 48rem. */
	const CLOSE_SELECTOR = "[data-iovox-close]";

	/**
	 * Porté sur le `<dialog>` quand le formulaire n'est toujours pas arrivé. La feuille s'en
	 * sert pour révéler la barre de secours sous 48rem, et elle seulement alors.
	 *
	 * iovox rend son propre en-tête — logo et croix — dès que le formulaire est là : la
	 * nôtre ferait doublon. Mais quand l'iframe ne charge pas (bloqueur, réseau, CSP), sa
	 * croix n'existe pas davantage, et le plein écran mobile n'offre alors plus AUCUNE
	 * sortie : pas de touche Échap, et un voile réduit à un liseré de 8 px.
	 */
	const STALLED_ATTR = "data-iovox-stalled";
	/** Au-delà, on considère que le formulaire ne viendra pas et on ouvre une porte. */
	const STALL_DELAY_MS = 3000;

	let stallTimer = 0;
	const CARRIER_SELECTOR = 'img[id^="voxreflexbutton_"]';

	function getDialog(): HTMLDialogElement | null {
		return document.getElementById(DIALOG_ID) as HTMLDialogElement | null;
	}

	/**
	 * Extrait `{id, clé}` de l'attribut `id` du porteur, découpé sur `_` :
	 *
	 *     voxreflexbutton_33368_e5d02c31c44cf47073d6dcba60d5e75e
	 *                     └─id─┘ └──────────── clé ────────────┘
	 *
	 * Retourne `null` si le porteur manque ou si le format a changé — Smart Tribune peut
	 * reconfigurer ce moyen de contact à tout moment, sans que nous en soyons prévenus.
	 */
	function readCredentials(trigger: Element): IovoxCredentials | null {
		const carrier = trigger.querySelector(CARRIER_SELECTOR);
		const raw = carrier ? carrier.getAttribute("id") : null;
		if (!raw) return null;

		const parts = raw.split("_");
		/*
		 * `slice(2).join("_")` et NON `parts[2]` : rien ne garantit que la clé reste
		 * dépourvue de `_`, et le garde ci-dessous accepte déjà PLUS de trois segments.
		 * N'en prendre que le troisième la tronquerait sans un mot, et l'URL partirait avec
		 * une clé fausse — panne bien plus coûteuse à diagnostiquer qu'un format
		 * franchement refusé.
		 */
		const key = parts.slice(2).join("_");
		if (parts.length < 3 || !parts[1] || !key) return null;

		return { id: parts[1], key };
	}

	/**
	 * Pose le `src` de l'iframe au PREMIER clic seulement, jamais au rendu.
	 *
	 * L'ancien site sérialise l'iframe avec ses gabarits `{id}`/`{key}` encore dans le
	 * `src` : chaque page vue tire donc une requête inutile vers un tiers, avant même que
	 * qui que ce soit ait cliqué. Ici l'iframe part sans `src` et n'existe qu'à la demande.
	 */
	function open(trigger: Element) {
		const dialog = getDialog();
		if (!dialog || typeof dialog.showModal !== "function") return;

		const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
		if (!iframe) return;

		if (!iframe.getAttribute("src")) {
			const credentials = readCredentials(trigger);
			if (!credentials) {
				/*
				 * Un `console.error` et non un abandon muet : c'est précisément le silence
				 * qui a rendu cette panne invisible sur la refonte — un bouton qui ne fait
				 * rien, sans la moindre trace.
				 */
				console.error("[iovox] identifiants introuvables sur", CARRIER_SELECTOR);
				return;
			}
			iframe.setAttribute(
				"src",
				WANNASPEAK_ORIGIN +
					"/popup/popup.php?id=" +
					encodeURIComponent(credentials.id) +
					"&key=" +
					encodeURIComponent(credentials.key) +
					"&popup=1",
			);
			watchForStall(iframe, dialog);
		}

		if (!dialog.open) dialog.showModal();
	}

	/** Annule l'attente en cours et retire la barre de secours si elle avait été révélée. */
	function clearStall() {
		if (stallTimer) {
			window.clearTimeout(stallTimer);
			stallTimer = 0;
		}
		const dialog = getDialog();
		if (dialog) dialog.removeAttribute(STALLED_ATTR);
	}

	/**
	 * Arme l'attente au moment où l'on pose le `src`, et non à l'ouverture : rouvrir sur une
	 * iframe déjà chargée n'émettrait aucun `load`, et l'attente conclurait à tort à une
	 * panne. Un `load` tardif retire l'attribut — le filet se replie tout seul.
	 */
	function watchForStall(iframe: HTMLIFrameElement, dialog: HTMLDialogElement) {
		clearStall();
		iframe.addEventListener("load", clearStall, { once: true });
		stallTimer = window.setTimeout(function onStalled() {
			stallTimer = 0;
			dialog.setAttribute(STALLED_ATTR, "");
		}, STALL_DELAY_MS);
	}

	function close() {
		const dialog = getDialog();
		if (dialog && dialog.open) dialog.close();
	}

	/**
	 * Remet le corps à zéro À LA FERMETURE. Branché sur l'événement `close` du `<dialog>`
	 * et non posé dans `close()` : la touche Échap ferme nativement, sans jamais passer par
	 * notre fonction. L'événement est le seul point commun aux trois sorties (Échap, voile,
	 * `iovox_wcb_close`).
	 *
	 * Les deux nettoyages comptent :
	 *  - `src` retiré, sinon l'iframe n'est jamais rechargée et une seconde demande de
	 *    rappel rouvre sur l'écran de confirmation de la première ;
	 *  - `height` inline effacée, sinon la valeur en px posée par `resize()` fige le corps
	 *    à la hauteur du formulaire précédent, et bat la mise en page de la feuille.
	 *
	 * L'attente de chargement est repliée au passage : sans cela, une réouverture repartirait
	 * avec la barre de secours d'une session précédente encore affichée.
	 */
	function reset() {
		clearStall();

		const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
		if (iframe) iframe.removeAttribute("src");

		const body = document.getElementById(BODY_ID);
		if (body) body.style.height = "";
	}

	/**
	 * Applique la hauteur demandée par le formulaire iovox. Le padding vertical est relu
	 * dans le style calculé plutôt que codé en dur ici : la feuille de styles reste libre
	 * de le faire varier (point de rupture, refonte) sans désaccorder le calcul.
	 */
	function resize(contentHeight: number) {
		const body = document.getElementById(BODY_ID);
		if (!body) return;

		/*
		 * Repli à 0 côté PAR CÔTÉ : `getComputedStyle` ne rend pas toujours une longueur
		 * exploitable (feuille pas encore appliquée, unité non résolue). Sans lui on écrit
		 * `"NaNpx"`, que le navigateur jette — le redimensionnement échouerait EN SILENCE,
		 * ce que ce fichier s'interdit partout ailleurs. Garder le repli sur chaque valeur
		 * et non sur leur somme : un seul côté illisible perdrait sinon aussi l'autre.
		 */
		const px = (value: string) => {
			const length = parseFloat(value);
			return isFinite(length) ? length : 0;
		};

		const style = getComputedStyle(body);
		body.style.height = contentHeight + px(style.paddingTop) + px(style.paddingBottom) + "px";
	}

	document.addEventListener(
		"click",
		function onClick(event) {
			const target = event.target as Element | null;
			if (!target || !target.closest) return;

			/*
			 * `<dialog>` natif : le voile n'est pas un frère, c'est le pseudo-élément
			 * `::backdrop`. Un clic dessus est rapporté sur l'élément `dialog` lui-même —
			 * et comme il porte `padding: 0`, tout clic sur le contenu atteint un enfant.
			 * `target === dialog` vaut donc exactement « clic hors panneau ».
			 */
			const dialog = getDialog();
			if (dialog && target === dialog) {
				close();
				return;
			}

			if (target.closest(CLOSE_SELECTOR)) {
				close();
				return;
			}

			const trigger = target.closest(TRIGGER_SELECTOR);
			if (!trigger) return;

			/*
			 * PAS de `stopPropagation` : en phase de capture sur `document`, il couperait
			 * l'événement avant qu'il n'atteigne quoi que ce soit en dessous — à commencer
			 * par le délégué de mesure, qui écoute lui aussi `document`.
			 *
			 * `preventDefault` sur le SEUL balisage qui ait un défaut à annuler, plutôt qu'en
			 * bloc. Smart Tribune rend aujourd'hui un `<button type="button">` : rien à
			 * empêcher. Mais la moitié `.contact-button-callback` du sélecteur est le repli
			 * prévu pour le jour où `data-bs-target` sauterait de la config du back-office, et
			 * rien ne garantit que son balisage de remplacement soit encore un bouton — rendu
			 * en `<a href>`, la page naviguerait à l'instant même où la modale s'ouvre.
			 */
			if (trigger.tagName === "A") event.preventDefault();

			open(trigger);
		},
		true,
	);

	/*
	 * En capture sur `document` : `close` ne bouillonne pas, mais il traverse bien la phase
	 * de capture. Écouter ici plutôt que sur le `<dialog>` évite de dépendre de sa présence
	 * au moment du boot. Le test sur l'`id` écarte les `close` d'autres éléments
	 * (`<details>`, `<select>`), qui portent le même nom d'événement.
	 */
	document.addEventListener(
		"close",
		function onDialogClose(event) {
			const target = event.target as Element | null;
			if (target && (target as HTMLElement).id === DIALOG_ID) reset();
		},
		true,
	);

	window.addEventListener("message", function onMessage(event: MessageEvent) {
		if (event.origin !== WANNASPEAK_ORIGIN) return;

		const data = String(event.data);

		if (data.indexOf("iovox_wcb_resize") === 0) {
			const height = parseFloat(data.split("-")[1]);
			if (isFinite(height)) resize(height);
			return;
		}

		if (data === "iovox_wcb_close") close();
	});
})();

export {};
