(function bootstrap() {
	/*
	 * EN MODE ÉDITION, CE SCRIPT NE FAIT RIEN
	 */
	if ((globalThis as unknown as Record<string, unknown>).__SOFINCO_EDIT_MODE__ === true) return;

	/*
	 * Mesure de l'en-tête fixe, pour le décalage du RETOUR (cf. templates/global.css).
	 *
	 * Variable DÉDIÉE `--footnote-scroll-offset`, et non `--header-height` : cette dernière
	 * pilote aussi la hauteur des Hero, la position du QrCode et le tableau comparatif.
	 * L'alimenter depuis ici aurait déplacé des mises en page sans aucun rapport avec les
	 * notes, sur les pages où `useHeaderHeightVar` ne la posait pas.
	 *
	 * Mesure faite au moment du saut, pas au chargement : l'en-tête est alors forcément
	 * en place et à sa taille courante.
	 */
	function updateScrollOffset() {
		const header = document.querySelector("header");
		if (!header) return;

		const height = (header as HTMLElement).offsetHeight;
		if (height > 0) {
			document.documentElement.style.setProperty("--footnote-scroll-offset", height + "px");
		}
	}

	const JUMP_CLASS = "sof-anchor-jump";
	const TRACK_INTERVAL_MS = 100;
	const TRACK_MAX_TICKS = 40; // ~4 s au pire
	const STEADY_TICKS = 3; // 3 relevés identiques = la page ne bouge plus

	let trackTimer = 0;

	/*
	 * L'utilisateur reste prioritaire : dès qu'il défile, zoome ou tape au clavier, on
	 * abandonne la poursuite. Sans ça, la boucle lutterait contre lui pendant plusieurs
	 * secondes et la page paraîtrait bloquée — un défaut bien pire que l'ancrage manqué.
	 * `passive` pour ne pas retarder le défilement natif.
	 */
	const ABORT_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"] as const;

	function stopTracking() {
		window.clearInterval(trackTimer);
		trackTimer = 0;
		document.documentElement.classList.remove(JUMP_CLASS);
		for (const name of ABORT_EVENTS) {
			window.removeEventListener(name, stopTracking);
		}
	}

	function trackToTarget(target: Element) {
		let lastTop = Number.NaN;
		let steady = 0;
		let ticks = 0;

		const step = () => {
			// La cible peut disparaître (îlot re-rendu) : on abandonne proprement.
			if (!target.isConnected) return stopTracking();

			target.scrollIntoView({ behavior: "smooth", block: "start" });

			const top = Math.round(target.getBoundingClientRect().top);
			steady = top === lastTop ? steady + 1 : 0;
			lastTop = top;

			if (steady >= STEADY_TICKS || ++ticks >= TRACK_MAX_TICKS) stopTracking();
		};

		window.clearInterval(trackTimer);
		for (const name of ABORT_EVENTS) {
			window.addEventListener(name, stopTracking, { passive: true });
		}
		trackTimer = window.setInterval(step, TRACK_INTERVAL_MS);
		step();
	}

	function reveal(target: Element) {
		updateScrollOffset();

		document.documentElement.classList.add(JUMP_CLASS);
		// Lecture forçant un recalcul synchrone : les sections jusque-là ignorées prennent
		// leur hauteur réelle avant le premier calcul de position.
		void document.body.offsetHeight;

		trackToTarget(target);

		// Move focus for assistive tech; make the target focusable if it isn't already.
		if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
		try {
			(target as HTMLElement).focus({ preventScroll: true });
		} catch {
			(target as HTMLElement).focus();
		}
	}

	/*
	 * Dernier marqueur cliqué, par note.
	 *
	 * Une même note peut être appelée PLUSIEURS fois dans une page — jusqu'à dix renvois vers
	 * la note 2 sur une page réelle du site. La flèche ↩ de la note, elle, est unique : sans
	 * mémoire, elle ramènerait toujours au premier appel, jamais à celui d'où le lecteur
	 * vient réellement.
	 *
	 * On retient donc l'ÉLÉMENT cliqué : les marqueurs d'une même note sont indiscernables
	 * par leurs attributs, seule la référence au nœud les distingue.
	 *
	 * MAIS un élément peut disparaître entre l'aller et le retour. Un carrousel en autoplay
	 * (ProductAdvantages) recycle ses diapositives : le marqueur cliqué est détaché, ou
	 * simplement masqué parce qu'une autre diapositive est passée devant. Retomber alors
	 * sur `getElementById` ramènerait au PREMIER marqueur homonyme, souvent à l'autre bout
	 * de la page — c'est le défaut constaté.
	 *
	 * On mémorise donc trois choses, de la plus précise à la plus grossière :
	 *   element  — le marqueur exact ;
	 *   section  — le bloc de page qui le contient, lui bien plus stable qu'une diapositive ;
	 *   scrollY  — la position de lecture, dernier recours.
	 */
	interface MarkerMemory {
		element: Element;
		section: Element | null;
		scrollY: number;
	}

	const lastMarker: Record<string, MarkerMemory> = Object.create(null);

	/** Visible au sens « occupe une surface » : un élément replié mesure 0. */
	function isVisible(el: Element): boolean {
		const rect = el.getBoundingClientRect();
		return rect.width > 0 || rect.height > 0;
	}

	function rememberMarker(noteId: string, el: Element) {
		lastMarker[noteId] = {
			element: el,
			// Le conteneur de section survit au recyclage des diapositives.
			section: el.closest("section, article"),
			scrollY: window.scrollY,
		};
	}

	/**
	 * Premier marqueur d'une note, en ordre document.
	 *
	 * Remplace l'ancien `getElementById(noteId + "-ref")`. Les marqueurs ne portent plus
	 * d'identifiant : une note appelée plusieurs fois en produisait autant d'homonymes, ce
	 * que la norme HTML interdit (cf. `buildMarkerLink`, footnotes.ts). Le résultat est le
	 * MÊME — le navigateur retenait déjà le premier élément portant l'id — mais il est
	 * obtenu sans HTML invalide.
	 *
	 * `a[href="#..."]` couvre les liens insérés depuis le menu « Ancres de la page » de
	 * jContent, qui n'ont que leur `href`. Les valeurs viennent de `filterHtmlId`, qui
	 * n'émet que des caractères sûrs dans un sélecteur d'attribut.
	 */
	function firstMarker(noteId: string): Element | null {
		return document.querySelector(
			'.footer-link[data-footer="' + noteId + '"], a[href="#' + noteId + '"]',
		);
	}

	/** Retour au marqueur, avec repli progressif quand il n'est plus atteignable. */
	function returnToMarker(noteId: string) {
		const memory = lastMarker[noteId];

		if (memory) {
			if (memory.element.isConnected && isVisible(memory.element)) {
				reveal(memory.element);
				return;
			}
			// Diapositive recyclée ou repliée : on revient au bloc qui la contient. Le
			// lecteur retrouve son contexte, à défaut du mot exact.
			if (memory.section && memory.section.isConnected) {
				reveal(memory.section);
				return;
			}
			// Plus rien d'identifiable : on restaure la position de lecture.
			window.scrollTo({ top: memory.scrollY, behavior: "smooth" });
			return;
		}

		// Aucun souvenir — arrivée directe par une URL `#footerN`, par exemple.
		const first = firstMarker(noteId);
		if (first) reveal(first);
	}

	/* ---------------------------------------------------------------- *
	 * Renvois orphelins — la note citée n'existe pas sur la page
	 * ---------------------------------------------------------------- */

	/*
	 * Un contributeur peut écrire `((5))` dans un titre alors que la mention 5 a été
	 * supprimée, ou n'a jamais existé. Le renvoi devient alors un lien qui ne mène nulle
	 * part : le lecteur clique, rien ne se produit, et personne n'en est informé.
	 *
	 * Le rendu React (`FootnoteText`) ne PEUT PAS l'éviter : c'est une fonction pure, sans
	 * DOM ni contexte, et c'est cette pureté qui garantit qu'un îlot s'hydrate sans
	 * divergence. Le serveur, lui, ne connaît pas encore les mentions au moment où il rend
	 * le titre. Ce script est donc le premier endroit de la chaîne qui voit la page entière
	 * : c'est ici, et seulement ici, que la vérification peut avoir lieu.
	 *
	 * On retire l'AFFORDANCE, pas le texte : le `⁽⁵⁾` reste lisible (le lecteur voit qu'une
	 * mention est annoncée), mais il cesse de se présenter comme cliquable.
	 */
	function neutralizeOrphan(el: Element, noteId: string) {
		// L'identifiant visé est CONSERVÉ dans l'attribut, pas seulement effacé : c'est la
		// seule trace restante une fois `href` et `data-footer` retirés, et le contrôle
		// d'édition (footnote-audit.ts) s'en sert pour dire au contributeur QUELLE mention
		// manque. Sans ça, le diagnostic se réduirait à « un renvoi ne pointe nulle part ».
		el.setAttribute("data-footnote-orphan", noteId);
		el.removeAttribute("href");
		el.removeAttribute("data-footer");
		el.classList.remove("footer-link");
	}

	/** Identifiant de note visé par un renvoi, quelle que soit sa forme. */
	function targetNoteId(el: Element): string {
		const dataFooter = el.getAttribute("data-footer");
		if (dataFooter) return dataFooter;
		const href = el.getAttribute("href") || "";
		return href.charAt(0) === "#" ? href.slice(1) : "";
	}

	/*
	 * PREMIÈRE VAGUE — hors îlots, au chargement.
	 *
	 * Même règle absolue que la passe de références : on n'écrit jamais dans un sous-arbre
	 * que React va hydrater. Ici le risque serait le pire des deux mondes — retirer `href`
	 * avant l'hydratation ferait diverger le DOM de ce que React rend, donc l'erreur #418,
	 * le rejet du sous-arbre et un composant qui clignote. Exactement le défaut qu'on a
	 * mis du temps à éliminer.
	 *
	 * Cette vague couvre tout le rendu purement serveur : mentions légales, bloc SEO,
	 * réponses de FAQ, texte légal du pied de page, caractéristiques du Hero Produit —
	 * c'est-à-dire toute la sortie de `manageFooterNote`.
	 */
	function neutralizeOrphansOutsideIslands() {
		const links = document.querySelectorAll('.footer-link, a[href^="#footer"]');
		for (let i = 0; i < links.length; i++) {
			const el = links[i];
			// Le retour ↩ est posé par le serveur à côté d'une note qui existe par construction :
			// il n'est jamais orphelin.
			if (el.classList.contains("footer-back-link")) continue;
			if (el.closest("jsm-island")) continue;

			const noteId = targetNoteId(el);
			if (noteId && !document.getElementById(noteId)) neutralizeOrphan(el, noteId);
		}
	}

	/* ---------------------------------------------------------------- *
	 * Mention repliée — l'ouvrir avant d'y envoyer le lecteur
	 * ----------------------------------------------------------------
	 * @returns `true` si une ouverture a réellement eu lieu.
	 */
	function openIfCollapsed(target: Element): boolean {
		let opened = false;

		// `<details>` natif (FAQ) : ni ARIA ni état React, la propriété suffit.
		const details = target.closest("details") as HTMLDetailsElement | null;
		if (details && !details.open) {
			details.open = true;
			opened = true;
		}

		const controls = document.querySelectorAll('[aria-expanded="false"][aria-controls]');
		for (let i = 0; i < controls.length; i++) {
			const control = controls[i];
			// `aria-controls` accepte une LISTE d'identifiants séparés par des espaces.
			const ids = (control.getAttribute("aria-controls") || "").split(/\s+/);
			for (let j = 0; j < ids.length; j++) {
				const panel = ids[j] ? document.getElementById(ids[j]) : null;
				if (panel && panel.contains(target)) {
					(control as HTMLElement).click();
					opened = true;
					break;
				}
			}
		}

		return opened;
	}

	const OPEN_DELAY_MS = 320; // 280 ms de transition + marge

	/*
	 * Garde-fou : pendant le clic rejoué, on n'ouvre plus rien. Sans ça, un bloc dont le
	 * contrôle resterait à `aria-expanded="false"` (composant tiers, ouverture refusée)
	 * relancerait un rejeu à l'infini.
	 */
	let replaying = false;

	/** Ouvre le bloc s'il est replié, et programme la correction de tir. */
	function openAndScheduleReplay(link: Element, note: Element) {
		if (replaying) return;

		/*
		 * `content-visibility` neutralisé AVANT l'ouverture — cause n° 2 ci-dessus. La lecture
		 * force le recalcul, donc le bloc a une vraie mise en page et sa transition part
		 * réellement maintenant. `reveal` posera la même classe ; `stopTracking` la retire.
		 */
		document.documentElement.classList.add(JUMP_CLASS);
		void document.body.offsetHeight;

		if (!openIfCollapsed(note)) return;

		let timer = 0;
		function cancel() {
			window.clearTimeout(timer);
			for (const name of ABORT_EVENTS) window.removeEventListener(name, cancel);
		}

		timer = window.setTimeout(function afterOpen() {
			cancel();
			// Le renvoi peut avoir disparu entre-temps (îlot re-rendu, diapositive recyclée).
			if (!link.isConnected) return;
			replaying = true;
			try {
				(link as HTMLElement).click();
			} finally {
				replaying = false;
			}
		}, OPEN_DELAY_MS);

		/*
		 * L'utilisateur reste prioritaire, même règle que la poursuite de cible : s'il défile
		 * ou tape pendant l'ouverture, la correction est abandonnée. Sans ça, on lui imposerait
		 * un défilement de plus alors qu'il vient justement de reprendre la main.
		 */
		for (const name of ABORT_EVENTS) window.addEventListener(name, cancel, { passive: true });
	}

	document.addEventListener(
		"click",
		function onClick(event) {
			const origin = event.target as Element | null;
			const el =
				origin && origin.closest ? origin.closest('[data-footer], a[href^="#footer"]') : null;
			if (!el) return;

			// `data-footer` when the server built the marker; otherwise the id is already in
			// the href, which is all a link inserted from the anchors menu carries.
			const dataFooter = el.getAttribute("data-footer");
			const href = el.getAttribute("href") || "";
			const hrefId = href.charAt(0) === "#" ? href.slice(1) : "";

			const isBackLink = el.classList.contains("footer-back-link");

			if (isBackLink) {
				// `data-footer` porte l'identifiant de la note. Le repli sur l'href, suffixe
				// "-ref" retiré, ne sert plus qu'au contenu encore en cache produit par la
				// version précédente, où le retour était un `<a href="#footerN-ref">`.
				const noteId = dataFooter || hrefId.replace(/-ref$/, "");
				if (!noteId) return;
				event.preventDefault();

				returnToMarker(noteId);
				return;
			}

			const noteId = dataFooter || hrefId;
			if (!noteId) return;
			event.preventDefault();

			const note = document.getElementById(noteId);
			if (!note) {
				/*
				 * SECONDE VAGUE — dans les îlots, au clic.
				 *
				 * On ne neutralise pas les îlots par anticipation faute de signal fiable de
				 * « hydratation terminée » (React planifie via son scheduler, aucun événement
				 * ne l'annonce). Un clic, lui, est une preuve : l'utilisateur a interagi, donc
				 * la page est hydratée. On retire l'affordance à cet instant. Le premier clic
				 * reste sans effet — comme aujourd'hui — mais le renvoi cesse ensuite de se
				 * présenter comme un lien, et les trois chemins finissent par appliquer la
				 * même règle.
				 */
				neutralizeOrphan(el, noteId);
				return;
			}

			rememberMarker(noteId, el);

			// Mention repliée : on l'ouvre tout de suite et on programme un rejeu de ce clic,
			// qui corrigera le tir quand l'ouverture sera terminée. Le défilement, lui, part
			// sans attendre — la ligne ci-dessous est celle d'origine, au même endroit.
			openAndScheduleReplay(el, note);

			reveal(note);
		},
		true,
	);

	/* ---------------------------------------------------------------- *
	 * Références `⁽¹⁾` — uniquement hors des îlots hydratés
	 * ---------------------------------------------------------------- */

	const SUP_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
	const REFERENCE = /⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]{1,8})⁾|\(\(\s*([^()]{1,32}?)\s*\)\)/g;
	const SKIP_TAGS = /^(?:SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/;

	/** Libellé lecteur d'écran, injecté par Layout.tsx (la traduction reste serveur). */
	const injected = (globalThis as unknown as Record<string, unknown>).__SOFINCO_FOOTNOTE_LABEL__;
	const srLabel = typeof injected === "string" ? injected : "";

	/** `⁽¹⁰⁾` → `"10"`, ou `""` si un caractère n'est pas un chiffre en exposant. */
	function fromSuperscript(text: string): string {
		let out = "";
		for (const char of text) {
			const digit = SUP_DIGITS.indexOf(char);
			if (digit === -1) return "";
			out += String(digit);
		}
		return out;
	}

	/**
	 * Id d'atterrissage si la note existe VRAIMENT sur la page, sinon null. On ne recalcule
	 * pas l'identifiant : on le cherche dans le DOM. Ça évite de dupliquer `filterHtmlId`
	 * (ce fichier ne peut rien importer, cf. `esbuild.transform`) et ça valide gratuitement
	 * — un renvoi orphelin reste inerte au lieu de devenir un lien mort.
	 */
	function noteIdFor(value: string): string | null {
		if (!/^[0-9]+$/.test(value)) return null;
		const id = "footer" + value;
		return document.getElementById(id) ? id : null;
	}

	/**
	 * Même forme que le marqueur construit par `manageFooterNote` côté serveur et par
	 * `FootnoteText` côté React : un vrai `<sup>` avec des chiffres ASCII.
	 *
	 * @param value Numéro en chiffres simples, ex. `"10"`.
	 */
	function buildReference(id: string, value: string): HTMLAnchorElement {
		const link = document.createElement("a");
		// Pas d'`id` : voir `buildMarkerLink` (footnotes.ts). Une note appelée plusieurs fois
		// produirait autant d'homonymes, ce que la norme HTML interdit.
		link.href = "#" + id;
		link.className = "footer-link";
		link.setAttribute("data-footer", id);

		/*
		 * Les caractères exposant Unicode du flux texte sont REMPLACÉS par `(n)` dans un
		 * `<sup>`. Ils sont répartis sur deux blocs — `¹²³` en Latin-1, `⁰⁴⁵⁶⁷⁸⁹` et `⁽⁾` en
		 * Superscripts and Subscripts — et les polices du site ne couvrent pas le second :
		 * les parenthèses tombent en repli système, et au-delà de la note 3 le chiffre aussi.
		 * `<sup>` élève le texte sans dépendre d'un glyphe particulier, et c'est l'élément
		 * prévu pour ça.
		 */
		const mark = document.createElement("sup");
		mark.className = "footer-ref";
		mark.textContent = "(" + value + ")";
		link.appendChild(mark);

		if (srLabel) {
			const sr = document.createElement("span");
			sr.className = "sr-only";
			sr.textContent = srLabel;
			link.appendChild(sr);
		}
		return link;
	}

	function acceptNode(node: Node): number {
		const value = node.nodeValue || "";
		if (value.indexOf("⁽") === -1 && value.indexOf("((") === -1) return NodeFilter.FILTER_REJECT;

		const parent = (node as Text).parentElement;
		if (!parent) return NodeFilter.FILTER_REJECT;
		if (SKIP_TAGS.test(parent.tagName)) return NodeFilter.FILTER_REJECT;

		// LA règle : ne jamais écrire dans un sous-arbre que React va hydrater.
		if (parent.closest("jsm-island")) return NodeFilter.FILTER_REJECT;

		// Déjà traité — par le serveur (`.footer-link`) ou par cette passe (`.footer-ref`).
		// Sans ça la forme `⁽¹⁾`, qui reste présente après coup, serait ré-enveloppée.
		if (parent.closest(".footer-link, .footer-ref")) return NodeFilter.FILTER_REJECT;

		// Un lien dans un lien est invalide : on laisse la référence telle quelle.
		if (parent.closest("a")) return NodeFilter.FILTER_REJECT;

		return NodeFilter.FILTER_ACCEPT;
	}

	function rewrite(textNode: Text) {
		const text = textNode.nodeValue || "";
		const fragment = document.createDocumentFragment();
		let cursor = 0;
		let match: RegExpExecArray | null;

		REFERENCE.lastIndex = 0;
		while ((match = REFERENCE.exec(text)) !== null) {
			const value = match[1] ? fromSuperscript(match[1]) : (match[2] || "").trim();
			const id = noteIdFor(value);
			if (!id) continue; // orphelin ou clé non numérique : on laisse le texte

			if (match.index > cursor) {
				fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
			}
			// Les deux formes sources — `⁽¹⁾` et le jeton brut `((1))` — convergent vers le
			// même rendu `<sup>(1)</sup>` : ni les caractères Unicode ni le jeton ne restent
			// visibles.
			fragment.appendChild(buildReference(id, value));
			cursor = match.index + match[0].length;
		}

		if (cursor === 0) return;
		if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
		textNode.parentNode?.replaceChild(fragment, textNode);
	}

	function linkReferences() {
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode });

		// Collectés d'abord : `rewrite` remplace des nœuds, ce qui invaliderait un parcours vif.
		const targets: Text[] = [];
		let current = walker.nextNode();
		while (current) {
			targets.push(current as Text);
			current = walker.nextNode();
		}
		targets.forEach(rewrite);
	}

	/*
	 * `linkReferences` d'abord : il ne crée un lien que pour une note réellement présente
	 * (`noteIdFor` interroge le DOM), donc il ne peut pas produire d'orphelin — mais faire
	 * l'inverse laisserait passer un tour.
	 */
	function start() {
		linkReferences();
		neutralizeOrphansOutsideIslands();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", start);
	} else {
		start();
	}
})();

export {};
