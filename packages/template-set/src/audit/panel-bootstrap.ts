/*
 * CONTRÔLE DES MENTIONS LÉGALES — bandeau, construit dans le document de jCONTENT.
 *
 * ┌─ OÙ IL VIT, ET POURQUOI ─────────────────────────────────────────────────────────────┐
 * │                                                                                      │
 * │ Dans la fenêtre PARENTE, au niveau du titre de page. L'iframe du Page Builder         │
 * │ commence SOUS le `moonstone-header` : il est structurellement impossible de s'y       │
 * │ afficher depuis la page. C'est aussi ce qui met le Page Builder hors de portée — la   │
 * │ page éditée ne reçoit qu'un bloc de données inerte, que Jahia ne peut ni mesurer ni   │
 * │ sélectionner.                                                                         │
 * │                                                                                       │
 * │ Posé sur `<html>` du document parent, donc EN DEHORS de la racine React de jContent,   │
 * │ montée dans `<body>`. Y ajouter un enfant corromprait sa réconciliation — c'est ce qui  │
 * │ arrivait dans l'iframe, où les zones d'ajout disparaissaient.                           │
 * │                                                                                          │
 * │ Shadow DOM : le bandeau n'hérite d'aucun style de jContent et n'en pollue aucun.         │
 * └───────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * CE QU'IL FAIT DANS LA PAGE ÉDITÉE : rien, sauf sur clic explicite du contributeur — un
 * `scrollIntoView` INSTANTANÉ et un `outline` transitoire. Jamais d'animation (une rafale
 * d'événements `scroll` décale la surcouche de jContent), jamais de nœud ajouté, jamais de
 * contenu modifié. `outline` est la seule décoration qui n'occupe aucune place, donc la
 * seule incapable de déplacer la mise en page que Jahia mesure.
 *
 * Le DIAGNOSTIC n'est pas calculé ici : il vient du serveur (`FootnoteAudit.tsx`), qui a vu
 * passer chaque renvoi et chaque mention à la production. Ce script ne fait que l'afficher.
 */

interface AuditIssue {
	/**
	 * `variable` = jeton de simulation non résolu (`{{taea}}` affiché brut au visiteur).
	 * Les trois autres concernent les mentions légales, cf. `auditFootnotes.ts`.
	 */
	kind: "orphan" | "invalid" | "unused" | "variable";
	message: string;
	/** Composant et propriété où corriger, ex. « Section Hero — subtitle ». */
	where: string;
	hint: string;
	/** Conteneurs à essayer DANS L'ORDRE — le composant d'origine en premier. */
	targets: string[];
	/** Sélecteur du renvoi à retrouver DANS le conteneur, quand il existe. */
	marker: string | null;
	/** Formes visibles du renvoi dans le TEXTE, ex. `⁽⁵⁰⁾` et `((50))`. */
	needles: string[];
	/** Contenu exact d'un `.footer-ref` rendu par React, ex. `(50)`. */
	refText: string;
	/** Rang parmi les anomalies de même clé — dernier recours si le composant est introuvable. */
	occurrence: number;
	/** Rang parmi les anomalies de même clé DANS le même composant. */
	withinComponent: number;
}

(function legalAuditPanel() {
	const DATA_ID = "sof-legal-audit-data";
	const PANEL_ID = "sof-legal-audit";

	/** Extrait les anomalies d'un document HTML — celui de la page, ou une relecture. */
	function parseIssues(html: string): AuditIssue[] {
		// Littéral de motif et non `new RegExp` : dans une chaîne, `\s` se réduirait à `s`.
		const block = /id="sof-legal-audit-data"[^>]*>([\s\S]*?)<\/script>/.exec(html);
		if (!block) return [];
		try {
			// `\u003c` est une séquence JSON standard : `JSON.parse` la relit nativement.
			return JSON.parse(block[1]) as AuditIssue[];
		} catch {
			// Un outil de diagnostic ne doit jamais casser la page qu'il inspecte.
			return [];
		}
	}

	if (!document.getElementById(DATA_ID)) return;

	/**
	 * Document HÔTE du bandeau : celui de jContent quand la page est dans le Page Builder.
	 * Repli sur le document courant si le parent est inaccessible (origine différente, page
	 * ouverte hors iframe).
	 */
	function hostDocument(): Document {
		try {
			const parent = window.top;
			if (parent && parent !== window.self && parent.document) return parent.document;
		} catch {
			/* origine différente */
		}
		return document;
	}

	const STYLE = `
		:host { all: initial; }
		.panel {
			position: fixed;
			/*
			 * Au NIVEAU du titre de page, en haut au centre : la bande la moins disputée de
			 * l'en-tête de jContent, entre le fil d'Ariane à gauche et les actions à droite.
			 */
			top: 14px; left: 50%; transform: translateX(-50%);
			/*
			 * Aucun z-index, et c'est délibéré : le panneau est monté sur documentElement,
			 * donc APRÈS le body dans l'ordre du document. Un élément positionné en
			 * z-index auto y peint déjà par-dessus tout le contenu du corps ; la valeur
			 * n'avait aucun effet.
			 *
			 * S'en passer est même préférable : jContent peut ainsi faire passer une modale
			 * au-dessus du bandeau, ce qui est le comportement attendu.
			 *
			 * ATTENTION : ce bloc est un littéral de gabarit. Un accent grave dans un
			 * commentaire y refermerait la chaîne et casserait tout le script.
			 */
			display: flex; flex-direction: column;
			width: 420px; max-width: calc(100vw - 32px); max-height: 400px;
			font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
			color: #f5f5f5; background: #1c1c1f;
			border: 1px solid #3a3a40; border-radius: 8px;
			box-shadow: 0 8px 28px rgb(0 0 0 / .35); overflow: hidden;
		}
		/* Rangée d'en-tête : le repli à gauche, le recalcul à droite. */
		.head { display: flex; flex: none; align-items: stretch; }
		.toggle {
			display: flex; flex: 1; align-items: center; gap: 8px;
			padding: 9px 12px; font: inherit; font-weight: 600; text-align: left;
			color: inherit; background: none; border: 0; cursor: pointer;
		}
		/* Replié, l'en-tête est le seul signal : on le teinte dès qu'une anomalie bloque. */
		.toggle--blocking { color: #ff8a8a; }
		.reload {
			flex: none; padding: 9px 12px; font: inherit; font-size: 15px; line-height: 1;
			color: inherit; background: none; border: 0; opacity: .6; cursor: pointer;
		}
		.reload:hover, .reload:focus-visible { opacity: 1; }
		.toggle:focus-visible, .reload:focus-visible {
			outline: 2px solid #7aa7ff; outline-offset: -2px;
		}
		.chevron { flex: none; opacity: .6; transition: transform .15s; }
		.panel[data-open] .chevron { transform: rotate(90deg); }
		/* min-height:0 est indispensable : sans lui un enfant flex refuse de rétrécir. */
		.list {
			display: none; flex: 1; min-height: 0; margin: 0; padding: 0; overflow-y: auto;
			border-top: 1px solid #3a3a40; list-style: none;
		}
		.panel[data-open] .list { display: block; }
		.item { border-bottom: 1px solid #2b2b30; }
		.go {
			display: block; width: 100%; padding: 9px 12px; font: inherit; color: inherit;
			text-align: left; background: none; border: 0; cursor: pointer;
		}
		.go:hover, .go:focus-visible { background: #26262b; outline: none; }
		.plain { display: block; padding: 9px 12px; }
		.message { display: block; font-weight: 600; }
		.where { display: block; margin-top: 2px; opacity: .85; }
		.item--orphan .message, .item--invalid .message,
		.item--variable .message { color: #ff8a8a; }
		.item--unused .message { color: #ffc978; }
	`;

	/**
	 * Encadre brièvement l'élément atteint. `outline` et non `border` ni `box-shadow` :
	 * c'est la seule décoration qui n'occupe aucune place, donc la seule qui ne puisse pas
	 * déplacer d'un pixel la mise en page que jContent mesure.
	 */
	function highlight(target: Element) {
		const style = (target as HTMLElement).style;
		const previous = style.outline;
		const previousOffset = style.outlineOffset;

		style.outline = "3px solid #ff5c5c";
		style.outlineOffset = "2px";
		window.setTimeout(() => {
			style.outline = previous;
			style.outlineOffset = previousOffset;
		}, 2200);
	}

	/**
	 * Tous les endroits d'un sous-arbre où ce renvoi apparaît, EN ORDRE DOCUMENT.
	 *
	 * Un même renvoi prend des formes différentes selon le composant qui le rend, et c'est
	 * précisément ce qui faisait échouer le repérage : dans un titre React il s'agit d'un
	 * `<a data-footer>`, dans un richtext d'un simple texte `⁽⁵⁰⁾`. Ne chercher que les
	 * marqueurs ne trouvait qu'un seul candidat, et les deux lignes du panneau pointaient
	 * dessus.
	 *
	 * On parcourt donc éléments ET textes en une seule passe, ce qui garantit l'ordre, et on
	 * reconnaît les trois formes :
	 *   - le marqueur `[data-footer="footerN"]` ;
	 *   - un `.footer-ref` au contenu exact — le cas INERTE, sans `data-footer` ;
	 *   - la forme visible dans le texte, hors de tout marqueur déjà compté.
	 *
	 * Lecture seule : un `TreeWalker` ne modifie rien.
	 */
	function candidates(root: Node, issue: AuditIssue): Element[] {
		const { marker, needles, refText } = issue;
		const found: Element[] = [];
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

		let node = walker.nextNode();
		while (node) {
			if (node.nodeType === 1) {
				const element = node as Element;
				if (marker && element.matches(marker)) found.push(element);
				else if (
					refText &&
					element.classList.contains("footer-ref") &&
					(element.textContent || "").trim() === refText &&
					!(marker && element.closest(marker))
				) {
					found.push(element);
				}
			} else {
				const text = node.nodeValue || "";
				for (const needle of needles) {
					if (text.indexOf(needle) === -1) continue;
					const parent = (node as Text).parentElement;
					// Déjà compté par son marqueur : on ne le prend pas deux fois.
					if (parent && !(marker && parent.closest(marker))) found.push(parent);
					break;
				}
			}
			node = walker.nextNode();
		}
		return found;
	}

	/**
	 * Le n-ième élément d'une liste, borné — hors limites, on retient le dernier.
	 *
	 * Rang absent ou aberrant traité comme 0 : le script peut lire un bloc de données produit
	 * par une version antérieure, encore en cache dans une page ouverte.
	 */
	function pick(matches: Element[], rank: number): Element | null {
		if (matches.length === 0) return null;
		const safe = Number.isFinite(rank) && rank > 0 ? rank : 0;
		return matches[Math.min(safe, matches.length - 1)];
	}

	/**
	 * Resserre la sélection sur le renvoi fautif À L'INTÉRIEUR du composant.
	 *
	 * D'abord le marqueur s'il a été rendu, sinon la forme visible du renvoi dans le texte.
	 * En mode édition beaucoup de composants rendent une variante serveur où le renvoi n'est
	 * qu'un texte : désigner le composant entier serait juste, mais peu utile dans un titre
	 * long.
	 */
	function narrow(container: Element, issue: AuditIssue): Element {
		if (issue.marker && container.matches(issue.marker)) return container;
		return pick(candidates(container, issue), issue.withinComponent) || container;
	}

	/**
	 * Dernier recours : le composant n'a pas pu être localisé, on cherche donc dans toute la
	 * page et on retient la n-ième occurrence. Sans ce rang, les cinq lignes d'un même
	 * `((50))` manquant menaient toutes au premier composant.
	 */
	function nth(issue: AuditIssue): Element | null {
		return pick(candidates(document.body, issue), issue.occurrence);
	}

	/**
	 * Amène la cible à l'écran, mais SEULEMENT si elle n'y est pas déjà.
	 *
	 * Chaque défilement est une occasion pour la surcouche de jContent de se désynchroniser :
	 * elle mesure la page et se repositionne sur l'événement `scroll`. Ne pas défiler quand
	 * c'est inutile — le cas le plus fréquent, une fois le contributeur arrivé sur la zone —
	 * supprime le risque plutôt que de le gérer.
	 *
	 * La marge tient compte de l'en-tête de jContent : une cible collée au bord haut est
	 * techniquement visible, mais illisible.
	 */
	function scrollToIfNeeded(target: Element) {
		const MARGIN = 80;
		const rect = target.getBoundingClientRect();
		const visible = rect.top >= MARGIN && rect.bottom <= window.innerHeight - MARGIN;
		if (visible) return;

		/*
		 * JAMAIS `scrollIntoView` ICI — c'est ce qui cassait le Page Builder.
		 *
		 * Cette API ne fait pas défiler « la page » : elle fait défiler TOUS les conteneurs à
		 * défilement au-dessus de l'élément, et remonte jusqu'aux fenêtres parentes. Deux dégâts
		 * en découlaient, invisibles depuis ce script :
		 *
		 *  1. Les défilements internes du site — `HeroArgs`, `ProductAdvantages`,
		 *     `OfferComparisonTable`, le menu mobile — se déplaçaient aussi. jContent ne suit
		 *     que le défilement du document : le contenu bougeait sous une surcouche restée en
		 *     place.
		 *  2. La page est dans une IFRAME. Le navigateur faisait donc également défiler le
		 *     panneau de jContent pour y amener l'iframe — et là, c'est la page entière qui
		 *     glissait sous les zones d'édition. D'où « toutes les zones se décalent vers le
		 *     haut », le Hero en tête puisqu'il ajoute son propre conteneur à la chaîne.
		 *
		 * On calcule donc la position absolue et on ne touche QU'À la barre de défilement du
		 * document. Un seul défileur bouge, celui-là même que jContent observe — la surcouche
		 * suit comme lors d'un défilement à la molette.
		 *
		 * Effet de bord assumé : une cible hors champ HORIZONTALEMENT dans un carrousel n'est
		 * pas poursuivie. Le surlignage l'attend sur place ; désynchroniser l'éditeur pour
		 * quelques pixels serait un mauvais échange.
		 */
		/*
		 * Borne basse seulement. Le haut se clampe tout seul — le navigateur refuse de dépasser
		 * la fin du document — et s'appuyer sur `scrollHeight` serait mal venu : c'est justement
		 * la mesure qui varie pendant que les images se chargent.
		 */
		const centered = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2;

		// `behavior: "auto"` : une animation produit une rafale d'événements `scroll`, et la
		// surcouche finit décalée. Un saut instantané équivaut à un glissement de la barre.
		window.scrollTo({ top: Math.max(0, centered), left: window.scrollX, behavior: "auto" });
	}

	/** Amène l'élément fautif à l'écran, DANS LA PAGE — jamais en défilement animé. */
	function reveal(issue: AuditIssue) {
		let target: Element | null = null;

		for (const selector of issue.targets) {
			const container = document.querySelector(selector);
			if (!container) continue;
			target = narrow(container, issue);
			break;
		}

		target = target || nth(issue);
		if (!target) return;

		scrollToIfNeeded(target);
		highlight(target);
	}

	const host = hostDocument();

	/** État de repli, conservé d'un recalcul à l'autre pour ne pas surprendre le lecteur. */
	let open = false;

	/** (Re)construit le bandeau. Aucune anomalie : il disparaît. */
	function build(issues: AuditIssue[]) {
		host.getElementById(PANEL_ID)?.remove();
		if (issues.length === 0) return;

		const container = host.createElement("div");
		container.id = PANEL_ID;
		const root = container.attachShadow({ mode: "open" });

		const style = host.createElement("style");
		style.textContent = STYLE;
		root.appendChild(style);

		/*
		 * Le panneau couvre deux familles : les mentions légales et les variables de simulation.
		 * L'intitulé nomme celles réellement présentes — annoncer « Mentions légales » devant
		 * une liste de variables ferait douter le contributeur de ce qu'il lit.
		 */
		const hasVariables = issues.some((issue) => issue.kind === "variable");
		const hasFootnotes = issues.some((issue) => issue.kind !== "variable");
		const subject =
			hasVariables && hasFootnotes
				? "Contrôle éditorial"
				: hasVariables
					? "Variables du simulateur"
					: "Mentions légales";

		const panel = host.createElement("section");
		panel.className = "panel";
		panel.setAttribute("role", "region");
		panel.setAttribute("aria-label", `${subject} — contrôle`);
		panel.toggleAttribute("data-open", open);

		// Un jeton non résolu s'affiche brut au visiteur : toujours bloquant, comme un renvoi
		// orphelin. Seule une mention jamais citée reste un simple avertissement.
		const blocking = issues.some((issue) => issue.kind !== "unused");

		const head = host.createElement("div");
		head.className = "head";

		const toggle = host.createElement("button");
		toggle.type = "button";
		toggle.className = blocking ? "toggle toggle--blocking" : "toggle";
		// Replié par défaut : le contributeur travaille dans le Page Builder, pas dans un rapport.
		toggle.setAttribute("aria-expanded", String(open));
		toggle.innerHTML = '<span class="chevron">▸</span><span class="title"></span>';
		toggle.querySelector(".title")!.textContent =
			issues.length > 1 ? `${subject} — ${issues.length} anomalies` : `${subject} — 1 anomalie`;
		toggle.addEventListener("click", () => {
			open = !open;
			panel.toggleAttribute("data-open", open);
			toggle.setAttribute("aria-expanded", String(open));
		});
		head.appendChild(toggle);

		const reload = host.createElement("button");
		reload.type = "button";
		reload.className = "reload";
		reload.title = "Recalculer le contrôle";
		reload.setAttribute("aria-label", "Recalculer le contrôle");
		reload.textContent = "↻";
		reload.addEventListener("click", refresh);
		head.appendChild(reload);

		panel.appendChild(head);

		const list = host.createElement("ul");
		list.className = "list";

		for (const issue of issues) {
			const item = host.createElement("li");
			item.className = `item item--${issue.kind}`;
			item.title = issue.hint;

			const body =
				`<span class="message"></span>` + (issue.where ? `<span class="where"></span>` : "");

			if (issue.targets.length > 0) {
				const go = host.createElement("button");
				go.type = "button";
				go.className = "go";
				go.innerHTML = body;
				go.addEventListener("click", () => reveal(issue));
				item.appendChild(go);
			} else {
				const plain = host.createElement("span");
				plain.className = "plain";
				plain.innerHTML = body;
				item.appendChild(plain);
			}

			// `textContent` et non `innerHTML` : message et libellé viennent du contenu
			// contributeur, ils ne doivent jamais être interprétés comme du balisage.
			item.querySelector(".message")!.textContent = issue.message;
			if (issue.where) item.querySelector(".where")!.textContent = issue.where;
			list.appendChild(item);
		}

		panel.appendChild(list);
		root.appendChild(panel);
		// Sur `<html>` : en dehors de la racine React de jContent, montée dans `<body>`.
		host.documentElement.appendChild(container);
	}

	/*
	 * RECALCUL — on redemande l'analyse au SERVEUR.
	 *
	 * Le diagnostic est produit pendant le rendu de la page. Or le Page Builder rafraîchit
	 * les modules EN PLACE : après une correction, `Layout` n'est pas re-rendu, le bloc de
	 * données reste celui d'avant, et le bandeau signalait indéfiniment une anomalie déjà
	 * réparée.
	 *
	 * Recharger l'iframe corrigerait le tir mais ferait perdre au contributeur sa position et
	 * sa sélection. On rejoue donc la page côté serveur, et on ne garde que le bloc de
	 * données : rien n'est réinjecté dans le document édité.
	 */
	let pending = false;
	function refresh() {
		if (pending) return;
		pending = true;
		fetch(window.location.href, { credentials: "same-origin" })
			.then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
			.then((html) => build(parseIssues(html)))
			.catch(() => {
				/* réseau ou session : on garde l'affichage précédent plutôt que de mentir */
			})
			.then(() => {
				pending = false;
			});
	}

	build(parseIssues(document.documentElement.outerHTML));

	/*
	 * Recalcul AUTOMATIQUE après une modification de la page.
	 *
	 * On n'observe que `childList` et `characterData` : le Page Builder remplace les nœuds
	 * du module qu'il rafraîchit. Les ATTRIBUTS sont volontairement exclus — le surlignage
	 * posé au clic en est un, et l'inclure déclencherait une boucle.
	 *
	 * L'observation est passive : elle ne modifie rien.
	 */
	let timer = 0;
	new MutationObserver(() => {
		window.clearTimeout(timer);
		timer = window.setTimeout(refresh, 800);
	}).observe(document.body, { childList: true, subtree: true, characterData: true });

	window.addEventListener("pagehide", () => host.getElementById(PANEL_ID)?.remove(), {
		once: true,
	});
})();

export {};
