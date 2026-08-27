// @ts-nocheck
/*
 * CKEditor 4 plugin — sofincoPageAnchors
 *
 * Ajoute une liste déroulante « Ancres de la page » qui recense les ancres de TOUTE la
 * page jnt:page éditée, pas seulement celles du champ courant, et pose le lien.
 *
 * Deux populations, séparées dans le menu parce qu'elles ne se valent pas :
 *   - « Ancres déclarées »       : propriétés `anchor` / `baseAnchor` / `anchorId`,
 *                                  posées volontairement par un contributeur ;
 *   - « Ancres dans le contenu » : `<a name>` / `id` trouvés dans du HTML richtext,
 *                                  souvent hérités d'un import, jamais déclarés.
 *
 * Les mentions légales ne sont pas des ancres de section mais des NOTES : leur cible est
 * l'id posé par `manageFooterNote` sur le paragraphe de note (`#footerN`), et le numéro
 * est inséré en exposant pour répondre au `<sup>(n)</sup>` de la note.
 */
/* global CKEDITOR, contextJsParameters */

(function () {
	"use strict";

	/* ------------------------------------------------------------------ *
	 * Libellés d'interface
	 * ------------------------------------------------------------------ */

	/*
	 * TOUTES les chaînes visibles, en un seul endroit.
	 *
	 * Dispersées sur deux cents lignes, elles étaient impossibles à relire — et deux
	 * formulations du même état avaient déjà divergé : le survol du bouton annonce
	 * « cliquez pour réessayer » là où l'entrée de menu dit « rouvrez pour réessayer ».
	 * Les voisiner rend l'écart visible.
	 *
	 * Pas d'i18n ici, et c'est délibéré : CKEditor 4 charge ce fichier hors du cycle de vie
	 * du template-set, sans accès à `useAppTranslation`. Le jour où l'interface d'édition
	 * devra être traduite, c'est CE tableau qui sera branché sur `editor.lang`, pas dix
	 * littéraux à retrouver.
	 */
	var LABELS = {
		buttonLabel: "Ancres de la page",
		buttonTitle: "Insérer un lien vers une ancre de la page",
		loading: "Chargement des ancres de la page…",
		loadingItem: "Chargement des ancres…",
		empty: "Aucune ancre sur cette page",
		failedTitle: "Ancres indisponibles — cliquez pour réessayer",
		failedItem: "Ancres indisponibles — rouvrez pour réessayer",
		hiddenItem: function (count) {
			return "… et " + count + " autres ancres non affichées";
		},
		hiddenTitle:
			"Trop d'ancres héritées du contenu sur cette page pour toutes les lister. " +
			"Les ancres déclarées, elles, sont toutes présentes.",
	};

	/* ------------------------------------------------------------------ *
	 * Identifiants — doivent rester alignés sur le rendu serveur
	 * ------------------------------------------------------------------ */

	// DOIT rester équivalent à `filterHtmlId` de packages/template-set/src/lib/footnotes.ts
	// (lui-même porté du taglib Java legacy `Functions.filterHtmlId`).
	function filterHtmlId(input) {
		var trimmed = String(input == null ? "" : input).trim();
		var result = "";
		for (var i = 0; i < trimmed.length; i++) {
			var ch = trimmed.charAt(i);
			if (/[A-Za-z0-9]/.test(ch) || ch === "-" || ch === "." || ch === ":") {
				result += ch;
			} else {
				var hex = trimmed.charCodeAt(i).toString(16).toUpperCase();
				while (hex.length < 4) hex = "0" + hex;
				result += "U" + hex;
			}
		}
		return result;
	}

	// `(1)` et ` 1 ` désignent tous deux la note 1 — même normalisation que `footnoteKey`
	// côté serveur, sinon un renvoi et sa note ne tomberaient pas sur le même id.
	function normalizeNumber(value) {
		return String(value == null ? "" : value)
			.replace(/<[^>]*>/g, "")
			.replace(/&nbsp;/gi, " ")
			.trim()
			.replace(/^\(+|\)+$/g, "")
			.trim();
	}

	/*
	 * Id d'atterrissage de la note d'une mention légale, tel que la page le rend.
	 *
	 * La chaîne serveur est : MentionLegal/default.server.tsx → buildNote(anchor, …) →
	 * `<p><sup>(n)</sup>…</p>` → manageFooterNote → `<p id="footerN">`. On vise donc
	 * `#footerN`, PAS le slug du conteneur : c'est `footerN` que cible la flèche de retour
	 * ↩ de la note et que connaît footnote-bootstrap.ts. En prime, un anchor « 1 » donnerait
	 * un slug « 1 », id inutilisable en querySelector sans échappement.
	 */
	function footnoteId(anchor) {
		return "footer" + filterHtmlId(normalizeNumber(anchor));
	}

	/**
	 * `"10"` → `"⁽¹⁰⁾"`.
	 *
	 * LE GARDE NUMÉRIQUE N'EST PAS DÉCORATIF. `superscriptFootnoteTokens` côté serveur refuse
	 * de convertir ce qui n'est pas `^[0-9]+$` et laisse le jeton tel quel. Sans le même
	 * refus ici, `charAt(Number("a"))` valait `charAt(NaN)`, donc `charAt(0)` : une ancre
	 * `(a)` faisait insérer `⁽⁰⁾` — un renvoi vers la note zéro, qui n'existe pas.
	 *
	 * Sur une valeur non numérique on rend donc la forme parenthésée simple : visible,
	 * corrigeable par le contributeur, et jamais confondue avec un autre numéro.
	 */
	var SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
	function toSuperscript(value) {
		var raw = String(value == null ? "" : value);
		if (!raw) return "";
		if (!/^[0-9]+$/.test(raw)) return "(" + raw + ")";

		var out = "⁽";
		for (var i = 0; i < raw.length; i++) {
			out += SUPERSCRIPT_DIGITS.charAt(Number(raw.charAt(i)));
		}
		return out + "⁾";
	}

	/* ------------------------------------------------------------------ *
	 * Récupération des ancres — couche agnostique de l'éditeur
	 * ------------------------------------------------------------------ */

	function contextPath() {
		return typeof contextJsParameters !== "undefined" && contextJsParameters.contextPath
			? contextJsParameters.contextPath
			: "";
	}

	// Chemin JCR + langue du nœud édité, déduits de la route jContent.
	// Forme : /jcontent/{site}/{lang}/{mode}/{segments...}
	function contextFromRoute() {
		var m = location.href.match(/\/jcontent\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)(?:\?|$)/);
		if (!m) return null;
		return { path: "/sites/" + m[1] + "/" + m[4], lang: m[2] };
	}

	/*
	 * UN APPEL QUI N'ABOUTIT PAS DOIT REJETER — sans quoi l'échec se déguise en page vide.
	 *
	 * Deux gardes, pour deux formes de panne distinctes :
	 *
	 *   - `!res.ok` : 401/403/502. Le corps n'est pas du JSON exploitable ; sans ce test, une
	 *     réponse HTML ferait bien rejeter `res.json()`, mais un corps JSON d'erreur (que
	 *     certains reverse-proxies renvoient) passerait pour une réponse valide.
	 *   - `json.errors` : c'est LE cas qui manquait. GraphQL répond en **HTTP 200** avec un
	 *     tableau `errors` et `data: null` sur un refus de droits, un nœud supprimé entre-temps
	 *     ou une requête invalide. L'appelant lisait alors `data` absent, en concluait « aucune
	 *     ancre » et remettait `failed` à faux : exactement le symptôme que `cache.failed`
	 *     existe pour empêcher.
	 */
	function gql(query, variables) {
		return fetch(contextPath() + "/modules/graphql", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ query: query, variables: variables }),
		})
			.then(function (res) {
				if (!res.ok) throw new Error("GraphQL HTTP " + res.status);
				return res.json();
			})
			.then(function (json) {
				if (json && json.errors && json.errors.length) {
					// Le message de la première erreur suffit au diagnostic ; les suivantes
					// répètent en général la même cause sur d'autres champs.
					throw new Error("GraphQL: " + (json.errors[0] && json.errors[0].message));
				}
				if (!json || !json.data) throw new Error("GraphQL: réponse sans données");
				return json;
			});
	}

	var PAGE_QUERY =
		"query SofincoEditedPage($path: String!) {" +
		"  jcr(workspace: EDIT) {" +
		"    nodeByPath(path: $path) {" +
		"      path" +
		'      isPage: isNodeType(type: { types: ["jnt:page"] })' +
		"      ancestors {" +
		"        path" +
		'        isPage: isNodeType(type: { types: ["jnt:page"] })' +
		"      }" +
		"    }" +
		"  }" +
		"}";

	/*
	 * ZONES DE CONTENU D'UNE PAGE, PAR NOM — et c'est le périmètre de toute la recherche.
	 *
	 * Les deux zones où un contributeur pose des ancres : `main` porte le corps de la page
	 * (et donc les ancres de section), `mentions` porte le bloc de mentions légales, dont
	 * chaque paragraphe est une cible de renvoi.
	 *
	 * Ne sont interrogées QUE ces deux-là. Chaque zone en plus est un aller-retour serveur
	 * sur chaque ouverture du menu, pour un contenu qui, en pratique, ne porte pas d'ancre.
	 *
	 * Les `<AbsoluteArea>` — pied de page, menu, pictos — n'ont de toute façon jamais eu leur
	 * place ici : elles visent des nœuds de SITE partagés par toutes les pages, alors qu'un
	 * `href="#fragment"` résout sur la page courante.
	 */
	var PAGE_AREAS = ["main", "mentions"];

	/*
	 * Zones des gabarits VOLONTAIREMENT hors périmètre — la liste existe pour que ce choix
	 * reste un choix, et non un oubli.
	 *
	 * `header` accueille `sofnt:header`, qui dérive de `sofmix:component` — le mixin du
	 * module, pas le `spmix:component` du legacy. Il ne porte donc NI `baseAnchor` NI
	 * `anchorId`, les deux seules propriétés d'ancre de section. Aucune ancre n'y est
	 * atteignable : l'exclusion est sans effet observable.
	 *
	 * `BANNIERE` n'existe que dans le gabarit `legacy` et reçoit du contenu importé, lequel
	 * PEUT porter `baseAnchor`. Une ancre posée dans une bannière ne sera donc pas proposée
	 * par le menu. Arbitrage assumé : la bannière est un visuel d'en-tête, pas une section
	 * vers laquelle on renvoie, et le coût d'une zone supplémentaire est payé à chaque
	 * ouverture. À rebasculer dans `PAGE_AREAS` si le cas se présente vraiment.
	 *
	 * `plugin.js` est chargé tel quel par CKEditor : il ne peut rien importer de `src/`. Ces
	 * deux listes sont donc une COPIE des gabarits, et une copie dérive. Un test confronte
	 * leur UNION aux `<Area name>` réels : une zone nouvelle fait échouer la suite tant que
	 * personne n'a tranché dans quelle liste elle va (voir plugin.test.ts).
	 */
	var EXCLUDED_AREAS = ["header", "BANNIERE"];

	/*
	 * PÉRIMÈTRE : la page courante UNIQUEMENT — et il se joue DANS la requête.
	 *
	 * `typesFilter` filtre ce qui est RETOURNÉ, pas ce qui est TRAVERSÉ. Un `descendants`
	 * lancé depuis la page traverse donc toutes ses sous-pages. Comme on insère
	 * `href="#fragment"`, qui résout toujours sur la page courante, chaque ancre hors-page
	 * fabriquerait un lien mort.
	 *
	 * CE FILTRAGE SE FAISAIT APRÈS COUP, EN JAVASCRIPT, ET C'ÉTAIT LE DÉFAUT.
	 *
	 * On demandait les descendants de la page, puis on écartait ce qui vivait sous une
	 * sous-page. Juste sur une page produit. Sur la PAGE D'ACCUEIL, dont toutes les pages du
	 * site sont descendantes, la requête rapatriait le contenu du site ENTIER — richtext
	 * compris — pour n'en garder que quelques nœuds. Assez gros pour heurter la pagination
	 * par défaut du serveur : la réponse était tronquée avant d'atteindre `home/main`, le
	 * filtre écartait ensuite tout, et le menu se retrouvait vide SANS la moindre erreur.
	 * D'où un bouton grisé sur l'accueil seulement, et jamais en local, où le site est trop
	 * petit pour atteindre la limite.
	 *
	 * ON NE DESCEND DONC PLUS DEPUIS LA PAGE, MAIS DEPUIS SES ZONES NOMMÉES.
	 *
	 * Les zones sont des enfants DIRECTS de la page, et une sous-page ne porte jamais l'un
	 * de ces noms : les sous-arbres voisins ne sont plus atteignables, ils ne sont même plus
	 * demandés. Le volume devient celui de la page seule, quel que soit son rang dans
	 * l'arborescence.
	 *
	 * `isPage` reste demandé : `jnt:page` HÉRITE de `jnt:content`, donc aucun `typesFilter`
	 * ne sait séparer une page d'un contenu. C'est le seul discriminant fiable, et il sert
	 * de garde-fou au cas — non prévu par le modèle Jahia — où une page apparaîtrait sous
	 * une zone.
	 *
	 * `property/properties(language:)` est obligatoire : les champs richtext sont i18n,
	 * sans langue leur valeur revient à null et les ancres saisies à la main seraient
	 * manquées.
	 */

	/*
	 * Champs lus sur un nœud candidat, extraits en constante : la requête les demande à DEUX
	 * profondeurs — la zone puis ses descendants — et deux copies divergeraient au premier
	 * ajout de propriété.
	 *
	 * `anchor` porte les mentions légales (`sofnt:mentionLegalItem`), `baseAnchor` les ancres
	 * de section du LEGACY (`spmix:component`, mixin de tout composant importé de l'ancien
	 * portail). Deux sources distinctes, dans deux zones distinctes : ne lire que `mentions`
	 * perdrait toutes les ancres de section, qui vivent dans `main` et `BANNIERE`.
	 */
	var DECLARED_FIELDS =
		" path" +
		' isPage: isNodeType(type: { types: ["jnt:page"] })' +
		" primaryNodeType { name }" +
		' isMentionLegalItem: isNodeType(type: { types: ["sofnt:mentionLegalItem"] })' +
		' anchor: property(name: "anchor", language: $language) { value }' +
		' baseAnchor: property(name: "baseAnchor", language: $language) { value }' +
		' anchorId: property(name: "anchorId", language: $language) { value }' +
		// Aperçu de la mention dans le menu. Demandé NOMMÉMENT : c'est la seule valeur
		// richtext dont le chemin critique a besoin.
		' mentionContent: property(name: "content", language: $language) { value }';

	var CONTENT_FIELDS =
		" path" +
		' isPage: isNodeType(type: { types: ["jnt:page"] })' +
		" primaryNodeType { name }" +
		" properties(language: $language) { name value }";

	/** `["a","b"]` → `["a", "b"]` littéral GraphQL. */
	function gqlStringList(values) {
		return (
			"[" +
			values
				.map(function (v) {
					return JSON.stringify(String(v));
				})
				.join(", ") +
			"]"
		);
	}

	/** Enveloppe `fields` dans la traversée « zones nommées puis descendants ». */
	function areaScopedQuery(name, fields) {
		return (
			"query " +
			name +
			"($path: String!, $language: String!) {" +
			"  jcr(workspace: EDIT) {" +
			"    nodeByPath(path: $path) {" +
			"      areas: children(names: " +
			gqlStringList(PAGE_AREAS) +
			") {" +
			"        nodes {" +
			fields +
			'          contents: descendants(typesFilter: { types: ["jnt:content"] }) {' +
			"            nodes {" +
			fields +
			"            }" +
			"          }" +
			"        }" +
			"      }" +
			"    }" +
			"  }" +
			"}"
		);
	}
	/*
	 * DEUX REQUÊTES, ET C'EST LE POINT CLÉ DE LA RÉACTIVITÉ.
	 *
	 * Il n'y en avait qu'une, et elle demandait `properties(language:)` sur CHAQUE nœud de
	 * contenu de la page : soit tout le texte de la page — blocs SEO, FAQ, richtext entiers —
	 * sérialisé en JSON à chaque rafraîchissement. C'est ce qui rendait le chargement long,
	 * et un chargement long est la vraie cause du « il faut ouvrir plusieurs fois » : peu
	 * importe la finesse du cache si la réponse arrive après le clic.
	 *
	 * Or ce volume ne sert QU'aux « ancres dans le contenu » — les `<a name>`/`id` hérités
	 * d'imports, groupe secondaire et plafonné. Les ancres DÉCLARÉES, celles que le
	 * contributeur cherche (mentions légales comprises), tiennent dans quelques propriétés
	 * nommées.
	 *
	 * On sépare donc : la requête légère pilote le menu, la lourde vient compléter en
	 * arrière-plan. Le menu n'attend plus jamais le scan de contenu pour s'ouvrir.
	 */
	var DECLARED_QUERY = areaScopedQuery("SofincoDeclaredAnchors", DECLARED_FIELDS);

	var CONTENT_QUERY = areaScopedQuery("SofincoContentAnchors", CONTENT_FIELDS);

	// Retient la jnt:page la plus profonde, le nœud lui-même inclus (`ancestors` l'exclut).
	function resolvePagePath(data) {
		var self = data && data.jcr && data.jcr.nodeByPath;
		if (!self) return null;
		var chain = (self.ancestors || []).concat([self]);
		for (var i = chain.length - 1; i >= 0; i--) {
			if (chain[i].isPage) return chain[i].path;
		}
		return null;
	}

	// `sofnt:mentionLegalItem` -> `Mention legal item`. Le type technique ne dit rien à un
	// contributeur : on retire le préfixe de namespace et on redécoupe le camelCase.
	function componentLabel(nodeTypeName) {
		if (!nodeTypeName) return "";
		var words = String(nodeTypeName)
			.replace(/^[^:]*:/, "")
			.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
			.toLowerCase();
		return words.charAt(0).toUpperCase() + words.slice(1);
	}

	/*
	 * Ancre déclarée d'un nœud, ou null. Chaque propriété se rend différemment, ce qui
	 * décide si on slugifie ou non :
	 *
	 *  - `sofnt:mentionLegalItem.anchor` : ce n'est pas une ancre de section mais une NOTE.
	 *    Cible = l'id posé par manageFooterNote sur le paragraphe (`#footerN`).
	 *  - `baseAnchor` (spmix:component) et `anchorId` (spmix:title) : le legacy
	 *    portal-common les rend BRUTS — `id="${baseAnchor.string}"` dans
	 *    component.hidden.anchor.jsp, `id=${anchorId}` dans title.hidden.title-with-level.jsp.
	 *    Les transformer casserait la cible : majuscules et accents survivent dans le DOM.
	 *
	 * Volontairement absent : `anchor` sur les types legacy `spnt:*`. Aucun ne produit d'id.
	 * `spnt:ctaProduct` s'en sert comme SOURCE d'un lien (`value="#${anchor}"`),
	 * `spnt:tabsSection` et `spnt:faqQuestion` le rendent en `data-anchor`. Les lister
	 * fabriquerait des liens vers des cibles inexistantes.
	 */
	/*
	 * Texte lisible extrait d'une valeur richtext : balises retirées, entités décodées,
	 * espaces compactés. Sert à identifier une mention par son CONTENU plutôt que par son
	 * numéro — « 5 » ne dit rien à un contributeur, le début du texte légal si.
	 */
	function textFromHtml(html) {
		return String(html == null ? "" : html)
			.replace(/<[^>]*>/g, " ")
			.replace(/&nbsp;/gi, " ")
			.replace(/&amp;/gi, "&")
			.replace(/&lt;/gi, "<")
			.replace(/&gt;/gi, ">")
			.replace(/&quot;/gi, '"')
			.replace(/&#0?39;/g, "'")
			.replace(/\s+/g, " ")
			.trim();
	}

	function truncate(text, max) {
		return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : text;
	}

	/*
	 * Retire un numéro de note en tête de texte, quand il répète celui de l'ancre.
	 *
	 * Le numéro est normalement ajouté au rendu par `buildNote` à partir de la propriété
	 * `anchor`, mais des contributeurs le saisissent aussi dans le contenu — c'était même
	 * une des façons de faire documentées. Sans ce nettoyage, le menu afficherait
	 * « 5 · (5) Le crédit… ». On ne coupe QUE si le numéro correspond, pour ne pas amputer
	 * un texte qui commencerait légitimement par un chiffre.
	 */
	function stripLeadingNumber(text, number) {
		if (!number) return text;
		var escaped = number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return text.replace(new RegExp("^\\(?" + escaped + "\\)?[\\s.:—-]*"), "");
	}

	function declaredAnchorOf(node) {
		/*
		 * `anchor` est FACULTATIF : un paragraphe de mention légale peut n'être que du texte
		 * libre, sans renvoi. Le test porte donc sur le NUMÉRO normalisé, pas sur la valeur
		 * brute — `« () »`, `« (()) »` ou une suite d'espaces sont non vides mais ne désignent
		 * aucune note.
		 *
		 * Sans ce filtre, `footnoteId("")` renverrait `"footer"` : le menu proposerait une
		 * entrée sans libellé pointant vers `#footer`, cible qu'aucune page ne rend puisque
		 * `buildNote` ne pose plus d'exposant dans ce cas. Un lien mort, posé par l'outil
		 * censé garantir des ancres valides.
		 */
		var number = node.isMentionLegalItem && node.anchor ? normalizeNumber(node.anchor.value) : "";
		if (number) {
			var raw = String(node.anchor.value);
			// `mentionContent` vient de la requête LÉGÈRE (propriété nommée), et non plus du
			// balayage de toutes les propriétés du nœud : l'aperçu ne coûte plus le poids de la
			// page entière.
			var mention =
				node.mentionContent && node.mentionContent.value ? node.mentionContent.value : "";
			var full = stripLeadingNumber(textFromHtml(mention), number);
			return {
				// `raw` et non `number` : `footnoteId` renormalise, et le libellé du menu doit
				// montrer ce que le contributeur a réellement saisi.
				fragment: footnoteId(raw),
				label: raw,
				kind: "footnote",
				number: number,
				// Aperçu dans le menu, texte complet en infobulle.
				preview: truncate(full, 70),
				full: truncate(full, 500),
			};
		}
		var value =
			(node.baseAnchor && node.baseAnchor.value) || (node.anchorId && node.anchorId.value);
		if (value) {
			var trimmed = String(value).trim();
			if (trimmed) return { fragment: trimmed, label: trimmed, kind: "section" };
		}
		return null;
	}

	// Propriétés traitées comme ancres déclarées : la passe 2 les saute, ce sont des
	// chaînes nues, pas du HTML à rescanner.
	/*
	 * `Object.create(null)` et non `{}` : la clé testée est un NOM DE PROPRIÉTÉ JCR, donc une
	 * donnée. Sur un littéral d'objet, `ANCHOR_PROPERTY_NAMES["constructor"]` remonte la
	 * chaîne de prototypes et vaut vrai — la propriété serait alors traitée comme une ancre
	 * déclarée et sautée par la passe 2.
	 */
	var ANCHOR_PROPERTY_NAMES = Object.create(null);
	ANCHOR_PROPERTY_NAMES.anchor = 1;
	ANCHOR_PROPERTY_NAMES.baseAnchor = 1;
	ANCHOR_PROPERTY_NAMES.anchorId = 1;

	function push(out, seen, fragment, ctx, label) {
		// `<a name=" ">` ou `id=" "` existent dans du contenu importé : non vides, mais sans
		// cible utilisable. On les écarte comme les vides — un `href="# "` ne mène nulle part.
		fragment = String(fragment == null ? "" : fragment).trim();
		if (!fragment || seen[fragment]) return;
		seen[fragment] = true;
		out.push({
			fragment: fragment,
			label: label || fragment,
			kind: ctx.kind || "section",
			number: ctx.number,
			preview: ctx.preview,
			full: ctx.full,
			source: ctx.source,
			origin: ctx.origin,
			path: ctx.path,
		});
	}

	// Extrait les ancres explicites (`<a name>` / tout `id`) d'une valeur richtext.
	function anchorsFromHtml(html, out, seen, ctx) {
		if (!html || html.indexOf("<") === -1) return;
		var doc;
		try {
			doc = new DOMParser().parseFromString(html, "text/html");
		} catch {
			return;
		}
		doc.querySelectorAll("a[name]").forEach(function (el) {
			push(out, seen, el.getAttribute("name"), ctx);
		});
		doc.querySelectorAll("[id]").forEach(function (el) {
			push(out, seen, el.getAttribute("id"), ctx);
		});
	}

	/*
	 * Nœuds de contenu de la page COURANTE, aplatis depuis ses zones nommées.
	 *
	 * Le périmètre est déjà tenu par la requête : elle ne demande que `main`, `mentions`,
	 * `header` et `BANNIERE`, qu'aucune sous-page ne peut porter comme nom. Le filtre par
	 * chemin qui suit n'est donc plus le mécanisme — c'est un garde-fou. On le garde parce
	 * qu'il ne coûte rien sur un ensemble désormais borné, et qu'une ancre morte proposée
	 * par l'outil censé garantir des ancres valides est un défaut silencieux.
	 */
	function pageContentNodes(data) {
		var root = data && data.jcr && data.jcr.nodeByPath;
		if (!root) return [];

		var flat = [];
		var nestedPagePaths = [];

		((root.areas && root.areas.nodes) || []).forEach(function (area) {
			if (!area || !area.path || area.isPage) return;

			// La zone elle-même peut porter une ancre — `descendants` ne se retourne pas.
			flat.push(area);

			((area.contents && area.contents.nodes) || []).forEach(function (n) {
				if (!n || !n.path) return;
				if (n.isPage) {
					nestedPagePaths.push(n.path);
					return;
				}
				flat.push(n);
			});
		});

		if (!nestedPagePaths.length) return flat;

		return flat.filter(function (n) {
			for (var i = 0; i < nestedPagePaths.length; i++) {
				if (n.path.indexOf(nestedPagePaths[i] + "/") === 0) return false;
			}
			return true;
		});
	}

	/** Passe 1 — ancres DÉCLARÉES. Chemin critique : c'est elle qui peint le menu. */
	function buildDeclaredAnchors(data) {
		var out = [];
		// Sans prototype : `seen["toString"]` vaudrait vrai sur un objet littéral, et une
		// ancre nommée ainsi serait silencieusement écartée comme un doublon.
		var seen = Object.create(null);

		pageContentNodes(data).forEach(function (node) {
			var declared = declaredAnchorOf(node);
			if (!declared) return;
			push(
				out,
				seen,
				declared.fragment,
				{
					source: "declared",
					kind: declared.kind,
					number: declared.number,
					preview: declared.preview,
					full: declared.full,
					origin: componentLabel(node.primaryNodeType && node.primaryNodeType.name),
					path: node.path || "",
				},
				declared.label,
			);
		});

		return out;
	}

	/**
	 * Passe 2 — ancres héritées du CONTENU. Différée, jamais bloquante.
	 *
	 * `declaredFragments` porte la déduplication d'une passe à l'autre. Les deux requêtes
	 * étant désormais distinctes, le `seen` partagé d'autrefois n'existe plus : sans cette
	 * liste, une ancre de contenu de même fragment qu'une ancre déclarée réapparaîtrait en
	 * double, dans le mauvais groupe.
	 */
	function buildContentAnchors(data, declaredFragments) {
		var out = [];
		// Sans prototype : `seen["toString"]` vaudrait vrai sur un objet littéral, et une
		// ancre nommée ainsi serait silencieusement écartée comme un doublon.
		var seen = Object.create(null);
		declaredFragments.forEach(function (fragment) {
			seen[fragment] = true;
		});

		pageContentNodes(data).forEach(function (node) {
			var ctx = {
				source: "content",
				kind: "section",
				origin: componentLabel(node.primaryNodeType && node.primaryNodeType.name),
				path: node.path || "",
			};
			(node.properties || []).forEach(function (p) {
				if (p && !ANCHOR_PROPERTY_NAMES[p.name] && typeof p.value === "string") {
					anchorsFromHtml(p.value, out, seen, ctx);
				}
			});
		});

		return out;
	}

	/* ------------------------------------------------------------------ *
	 * Cache — tampon d'affichage et déduplicateur, PAS une péremption
	 * ------------------------------------------------------------------ */

	/*
	 * POURQUOI UN CACHE MALGRÉ TOUT. `onMenu` est SYNCHRONE : CK4 construit le panneau dans
	 * la foulée du clic, il n'y a rien à attendre. Sans liste déjà en mémoire, le menu
	 * n'aurait donc JAMAIS rien à peindre à la première ouverture. Le cache n'est pas une
	 * optimisation ici, c'est la seule chose qui rende un panneau synchrone possible. Et il
	 * est partagé entre instances parce qu'une fiche porte souvent plusieurs champs
	 * richtext : ils interrogent la même page JCR, une requête suffit.
	 *
	 * CE QU'ON A SUPPRIMÉ : LA PÉREMPTION PAR LE TEMPS.
	 *
	 * Une fenêtre de fraîcheur de 5 s répondait à la mauvaise question. Ce qui compte n'est
	 * pas l'ÂGE de la liste mais si la page a changé depuis — information que le navigateur
	 * n'a pas. Le résultat était le défaut remonté : le contributeur ajoute une mention,
	 * rouvre le menu dans la foulée, et l'ouverture ne redemandait même pas la liste puisque
	 * la précédente avait moins de 5 s. Il fallait attendre l'expiration, puis une ouverture
	 * pour lancer la requête, puis une autre pour en voir le fruit — d'où le « il faut
	 * ouvrir plusieurs fois ».
	 *
	 * On redemande donc à CHAQUE ouverture, la requête en vol servant de déduplicateur. La
	 * requête est locale et l'outil n'existe qu'en mode édition : le coût est sans commune
	 * mesure avec celui d'afficher une liste fausse.
	 */
	var cache = {
		/** Ancres déclarées — chemin critique, issues de la requête légère. */
		declared: [],
		/** Ancres héritées du contenu — passe lourde, arrivent après et n'ont jamais priorité. */
		content: [],
		/** Liste affichée = `declared` puis `content`. Recomposée à chaque arrivée. */
		list: [],
		loaded: false,
		loading: false,
		/**
		 * PAGE à laquelle ces listes appartiennent (`chemin de la jnt:page|langue`).
		 *
		 * LA PAGE RÉSOLUE, ET SURTOUT PAS LA ROUTE. jContent est une application monopage : le
		 * cache, de portée module, survit à la navigation, et sans clé la première ouverture sur
		 * une nouvelle page proposait les ancres de la PRÉCÉDENTE — des `#fragment` qui résolvent
		 * sur la page courante, donc des liens morts.
		 *
		 * Mais clé sur la ROUTE, ce que faisait la version précédente, était un remède pire que le
		 * mal : l'URL jContent bouge à chaque sélection de nœud dans la page, alors que la page,
		 * elle, ne change pas. La clé tombait donc en défaut sans arrêt, vidait la liste et
		 * remettait « Chargement… » à CHAQUE ouverture. C'est le défaut constaté en recette.
		 *
		 * On compare donc ce qui doit l'être : la `jnt:page` englobante, résolue par `PAGE_QUERY`.
		 * Deux nœuds différents d'une même page donnent la même clé — le cache tient.
		 */
		pageKey: null,
		/** Page pour laquelle le scan de contenu — la requête lourde — a déjà abouti. */
		contentPageKey: null,
		/** Un rafraîchissement demandé pendant une requête en vol, à rejouer à son terme. */
		pendingForce: false,
		/**
		 * La dernière requête déclarée a-t-elle échoué ?
		 *
		 * Sans ce drapeau, une coupure réseau est INDISCERNABLE d'une page sans ancres : le
		 * `.catch` résout, le `.then` terminal pose `loaded = true`, et le bouton se grise en
		 * annonçant « Aucune ancre sur cette page ». Le contributeur ne peut alors même pas
		 * recliquer pour réessayer — la reprise dépend du hasard d'un survol.
		 */
		failed: false,
	};

	/**
	 * Route jContent → chemin de la `jnt:page` englobante, mémorisé.
	 *
	 * Cette résolution est le PREMIER des deux allers-retours, et son résultat ne dépend que de
	 * la route : il ne change pas quand le contributeur ajoute une mention. La mémoriser retire
	 * donc un aller-retour de chaque rafraîchissement — sur le chemin critique, c'est la moitié
	 * de la latence.
	 */
	var pagePathByRoute = {};

	/* ------------------------------------------------------------------ *
	 * Persistance de session — pour que la PREMIÈRE ouverture ne parte pas de zéro
	 * ------------------------------------------------------------------ */

	/*
	 * Le cache de module naît vide à chaque chargement de page du navigateur. La toute première
	 * ouverture du menu tombait donc forcément sur « Chargement des ancres… », le temps des
	 * allers-retours — et c'est précisément le moment où le contributeur clique, puisqu'il vient
	 * d'ouvrir sa fiche.
	 *
	 * On garde donc un instantané par page dans le `sessionStorage` : à l'ouverture suivante,
	 * même après un F5, le menu est peint IMMÉDIATEMENT avec la dernière liste connue, pendant
	 * que le rafraîchissement se joue derrière. Portée session (un onglet, effacé à sa
	 * fermeture) : ni fuite entre utilisateurs, ni rémanence sur un poste partagé.
	 *
	 * L'instantané n'est jamais autoritaire — chaque ouverture redemande la liste, et la
	 * réouverture automatique corrige l'écart s'il y en a un.
	 */
	var STORE_PREFIX = "sofinco.pageAnchors.v1.";

	function storeGet(key) {
		try {
			var raw = window.sessionStorage.getItem(STORE_PREFIX + key);
			return raw ? JSON.parse(raw) : null;
		} catch {
			// sessionStorage indisponible (navigation privée stricte, quota, JSON corrompu) :
			// on repart simplement d'un cache vide.
			return null;
		}
	}

	function storeSet(key, value) {
		try {
			window.sessionStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
		} catch {
			/* quota atteint ou stockage refusé : la persistance est un confort, pas une exigence */
		}
	}

	/*
	 * MÉMO ROUTE → PAGE, persisté sous UNE clé bornée.
	 *
	 * Une clé de stockage PAR ROUTE serait ingérable : la route change à chaque sélection de
	 * nœud à l'intérieur d'une même page, et une longue session de contribution en
	 * accumulerait des centaines que rien n'évince. Au quota atteint, `storeSet` avale
	 * silencieusement le `QuotaExceededError` — et ce sont les instantanés d'ancres qui
	 * cesseraient d'être écrits, sans aucun signal.
	 *
	 * Mais le retirer entièrement du stockage RENDAIT LES INSTANTANÉS INATTEIGNABLES : ils
	 * sont clés par PAGE, et `primeFromStore` a besoin de la route pour retrouver la page.
	 * Après un F5 la map mémoire est vide, donc l'amorçage ne pouvait plus lire quoi que ce
	 * soit — précisément dans le seul scénario pour lequel toute cette couche existe.
	 *
	 * D'où une clé UNIQUE portant un objet borné, purgé en LRU : le nombre d'entrées est
	 * plafonné quelle que soit la durée de la session, et l'amorçage retrouve sa page.
	 */
	var ROUTES_KEY = "routes";
	var MAX_ROUTES = 20;

	function rememberRoute(routePath, pagePath) {
		pagePathByRoute[routePath] = pagePath;

		var stored = storeGet(ROUTES_KEY) || {};
		// Retirer avant de réinsérer place la clé en QUEUE d'itération : c'est ce qui fait de
		// `Object.keys(...).shift()` une éviction du moins récemment utilisé. Les clés sont des
		// chaînes non numériques (des chemins), dont l'ordre d'insertion est garanti par ES2015.
		delete stored[routePath];
		stored[routePath] = pagePath;

		var keys = Object.keys(stored);
		while (keys.length > MAX_ROUTES) delete stored[keys.shift()];

		storeSet(ROUTES_KEY, stored);
	}

	/** Page connue pour cette route — mémoire d'abord, puis session. */
	function knownPagePath(routePath) {
		if (pagePathByRoute[routePath]) return pagePathByRoute[routePath];

		var stored = storeGet(ROUTES_KEY);
		var pagePath = (stored && stored[routePath]) || null;
		// Réchauffer la map mémoire : les appels suivants de ce chargement de page ne
		// retoucheront plus au stockage.
		if (pagePath) pagePathByRoute[routePath] = pagePath;
		return pagePath;
	}

	function resolvePage(routePath) {
		var known = knownPagePath(routePath);
		if (known) return Promise.resolve(known);

		return gql(PAGE_QUERY, { path: routePath }).then(function (json) {
			var pagePath = resolvePagePath(json && json.data);
			if (pagePath) rememberRoute(routePath, pagePath);
			return pagePath;
		});
	}

	/**
	 * Peint le cache depuis l'instantané de session, si on en a un pour la page courante.
	 *
	 * Synchrone et sans réseau : c'est ce qui permet à la première ouverture d'afficher une
	 * liste plutôt qu'un message d'attente.
	 */
	function primeFromStore() {
		var ctx = contextFromRoute();
		if (!ctx) return;

		// `knownPagePath` et non la map mémoire seule : après un rechargement du navigateur
		// celle-ci est vide, et c'est EXACTEMENT le cas que cette fonction sert.
		var pagePath = knownPagePath(ctx.path);
		if (!pagePath) return;

		var pageKey = pagePath + "|" + ctx.lang;

		/*
		 * Le test porte sur la PAGE, pas sur le seul fait d'avoir des données : après une
		 * navigation dans jContent le cache contient encore les ancres de la page précédente, et
		 * un test « ai-je quelque chose ? » interdirait d'amorcer la nouvelle — qui repartirait
		 * donc sur « Chargement… », exactement ce qu'on veut éviter.
		 */
		if (cache.pageKey === pageKey && (cache.declared.length || cache.content.length)) return;

		var snapshot = storeGet("anchors." + pageKey);
		if (!snapshot) return;

		pagePathByRoute[ctx.path] = pagePath;
		cache.pageKey = pageKey;
		cache.declared = snapshot.declared || [];
		cache.content = snapshot.content || [];
		/*
		 * `contentPageKey` reste NUL à dessein : l'instantané sert à peindre tout de suite, il ne
		 * dispense pas du scan de contenu. Celui-ci se rejouera une fois dans la session, en
		 * arrière-plan — sinon des ancres de contenu supprimées resteraient proposées jusqu'à la
		 * fermeture de l'onglet.
		 */
		rebuildList();
		/*
		 * `loaded` reste FAUX, et c'est délibéré. L'instantané donne de quoi peindre, il ne
		 * vaut pas chargement : le poser à vrai ferait retourner tout `loadPageAnchors()` non
		 * forcé sans rien demander, et la liste resterait celle de la session précédente
		 * jusqu'au premier survol. `onMenu` ne se fie de toute façon pas à ce drapeau pour
		 * décider d'afficher « Chargement… » — il regarde s'il a des ancres à montrer.
		 */
	}

	/*
	 * ÉTAT D'INTERFACE : PORTÉ PAR L'ÉDITEUR, JAMAIS PAR LE MODULE.
	 *
	 * Ce fichier est évalué une fois, mais jContent peut afficher plusieurs champs richtext
	 * simultanément — chacun son instance CKEditor. Déclarés au niveau module, ces drapeaux
	 * seraient partagés : un menu ouvert dans le champ A marquerait celui du champ B comme
	 * ouvert, et la réouverture automatique cliquerait le bouton du mauvais éditeur.
	 *
	 * Le cache d'ancres, lui, reste au niveau module : il décrit la PAGE, pas un éditeur.
	 */
	function uiState(editor) {
		if (!editor._sofincoAnchors) {
			editor._sofincoAnchors = {
				/** Notre menu est-il ouvert ? Conditionne la réouverture automatique. */
				menuIsOpen: false,
				/** Un réarmement est déjà en vol pour CET éditeur. */
				reopening: false,
				/** Le panneau qui s'ouvre est le nôtre — posé par `onMenu`, lu par `menuShow`. */
				opening: false,
				/** Empreinte de ce que la dernière ouverture a peint, pour décider d'une reprise. */
				pendingBefore: "",
				/** Reprise à jouer dès que le panneau sera réellement affiché. */
				refreshOnShow: false,
			};
		}
		return editor._sofincoAnchors;
	}

	/**
	 * Rappels à jouer quand le cache devient exploitable.
	 *
	 * Une file plutôt qu'une promesse : un chargement peut en enchaîner un autre (`pendingForce`).
	 * Avec une promesse par chargement, celle du premier n'était jamais résolue et l'abonné
	 * restait en attente indéfiniment. La file traverse les enchaînements et n'est vidée qu'une
	 * fois la donnée réellement disponible.
	 */
	var readyWaiters = [];

	function notifyReady() {
		var waiters = readyWaiters;
		readyWaiters = [];
		waiters.forEach(function (fn) {
			try {
				fn();
			} catch {
				/* un abonné défaillant ne doit pas priver les autres */
			}
		});
	}

	/**
	 * Empreinte de ce que le MENU AFFICHE, pas de ce que le JCR contient.
	 *
	 * C'est elle qui décide s'il faut rouvrir le panneau à l'arrivée d'une réponse. Rouvrir à
	 * chaque rafraîchissement ferait clignoter le menu à toutes les ouvertures ; ne jamais
	 * rouvrir laisserait le défaut d'origine. On compare donc le rendu attendu, et on ne rouvre
	 * que s'il a réellement changé — ajout, suppression, ou simple correction du texte d'une
	 * mention, qui modifie l'aperçu affiché.
	 */
	function signature(list) {
		return list
			.map(function (a) {
				return [a.fragment, a.label, a.kind, a.preview || "", a.origin || "", a.source].join(
					"\u0000",
				);
			})
			.join("\u0001");
	}

	/**
	 * Abonnés à l'état du cache — un par éditeur, posé à `uiReady`.
	 *
	 * Sert à tenir le BOUTON à jour : c'est lui qui porte désormais l'attente, à la place d'un
	 * item « Chargement… » dans le panneau.
	 */
	var stateListeners = [];

	function notifyState() {
		stateListeners.forEach(function (fn) {
			try {
				fn();
			} catch {
				/* un bouton récalcitrant ne doit pas bloquer les autres */
			}
		});
	}

	function rebuildList() {
		cache.list = cache.declared.concat(cache.content);
		notifyState();
	}

	/**
	 * Numéro du chargement en cours.
	 *
	 * La clé de page ne suffit pas à écarter une réponse périmée : deux chargements peuvent se
	 * succéder sur LA MÊME page — c'est même le cas nominal, puisqu'on rafraîchit à chaque
	 * ouverture. Sans ce compteur, une réponse lente du premier écraserait celle, plus récente,
	 * du second : le contributeur reverrait la liste d'avant son ajout, sans rien pour la
	 * corriger jusqu'au chargement suivant. C'est exactement le défaut qu'on cherche à éliminer.
	 */
	var loadSeq = 0;

	function loadPageAnchors(force) {
		var ctx = contextFromRoute();

		/*
		 * Requête déjà en vol : on MÉMORISE la demande au lieu de la perdre. Sans cela, un
		 * `loadPageAnchors(true)` arrivant pendant un chargement était silencieusement abandonné
		 * — et si la requête en vol avait été lancée AVANT l'ajout de la mention, son résultat
		 * était déjà périmé en arrivant, sans que rien ne le redemande.
		 */
		if (cache.loading) {
			if (force) cache.pendingForce = true;
			return;
		}
		if (cache.loaded && !force) return;

		if (!ctx) {
			// Hors route jContent (aperçu, test) : on reste utilisable, simplement sans ancres.
			cache.loaded = true;
			notifyReady();
			return;
		}

		cache.loading = true;
		notifyState();
		var seq = ++loadSeq;

		resolvePage(ctx.path)
			.then(function (pagePath) {
				if (!pagePath) {
					// Page introuvable : on ne peut RIEN lister. Le dire comme un échec plutôt que
					// de laisser l'état retomber sur « Aucune ancre sur cette page », qui affirme
					// le contraire de ce qu'on sait.
					if (seq === loadSeq) cache.failed = true;
					return null;
				}

				/*
				 * CHANGEMENT DE PAGE AVÉRÉ — et seulement ici. On ne vide jamais la liste sur une
				 * simple présomption : tant qu'on ne sait pas, mieux vaut afficher ce qu'on a. Le
				 * contributeur voit alors la liste précédente pendant une fraction de seconde au
				 * lieu d'un « Chargement… » à chaque ouverture.
				 */
				var pageKey = pagePath + "|" + ctx.lang;
				if (cache.pageKey !== pageKey) {
					cache.pageKey = pageKey;
					cache.declared = [];
					cache.content = [];
					cache.contentPageKey = null;
					rebuildList();
				}

				/*
				 * Les deux passes partent ENSEMBLE, mais seule la légère conditionne l'affichage :
				 * `loaded` est posé à son retour, sans attendre le scan de contenu. C'est ce qui
				 * rend la première ouverture immédiate.
				 */
				var declaredReq = gql(DECLARED_QUERY, { path: pagePath, language: ctx.lang })
					.then(function (json) {
						// Réponse arrivée après un changement de page : elle ne décrit plus ce qui
						// est à l'écran.
						if (seq !== loadSeq || cache.pageKey !== pageKey) return;
						// `gql` rejette désormais sur `errors` comme sur un statut non-2xx : arriver
						// ici garantit un `data` exploitable. Le repli `: []` d'avant confondait
						// « la requête a échoué » et « la page n'a pas d'ancre ».
						cache.declared = buildDeclaredAnchors(json.data);
						cache.failed = false;
						rebuildList();
						saveSnapshot(pageKey);
					})
					.catch(function () {
						// L'éditeur ne casse jamais à cause des ancres — mais on retient l'échec,
						// pour ne pas le présenter comme une page vide.
						if (seq === loadSeq) cache.failed = true;
					});

				/*
				 * LE SCAN DE CONTENU NE REPART PAS À CHAQUE RAFRAÎCHISSEMENT.
				 *
				 * C'est la requête lourde — toutes les propriétés de tous les nœuds de la page — et
				 * elle alimente un groupe secondaire dont le contenu ne bouge que si quelqu'un
				 * édite du richtext. La relancer à chaque survol et à chaque ouverture encombrait
				 * le serveur en parallèle de la requête utile, et ralentissait donc précisément ce
				 * qu'on cherche à accélérer.
				 *
				 * Une fois par page et par session suffit : `contentPageKey` retient pour quelle
				 * page le scan a déjà été fait.
				 */
				if (cache.contentPageKey === pageKey) return declaredReq;

				var contentReq = gql(CONTENT_QUERY, { path: pagePath, language: ctx.lang }).catch(
					function () {
						/* groupe secondaire : son absence n'empêche rien */
						return null;
					},
				);

				/*
				 * Les deux requêtes partent EN PARALLÈLE sur le réseau, mais on assemble dans
				 * l'ordre : le scan de contenu ne peut dédupliquer qu'une fois les ancres
				 * déclarées connues. Sans cette attente, une passe lourde revenue la première
				 * lisait un `cache.declared` encore vide et republiait dans « Ancres dans le
				 * contenu » des fragments appartenant aux « Ancres déclarées ».
				 */
				Promise.all([declaredReq, contentReq]).then(function (results) {
					var json = results[1];
					if (seq !== loadSeq || cache.pageKey !== pageKey) return;
					if (!json || !json.data) return;
					cache.content = buildContentAnchors(json.data, declaredKeys());
					cache.contentPageKey = pageKey;
					rebuildList();
					saveSnapshot(pageKey);
				});

				return declaredReq;
			})
			.catch(function () {
				// Résolution de page impossible (réseau, 401, erreur GraphQL) : on garde ce qu'on
				// a, mais on RETIENT l'échec — c'est le premier des deux allers-retours, et son
				// échec laissait jusqu'ici le bouton annoncer une page sans ancre.
				if (seq === loadSeq) cache.failed = true;
			})
			.then(function () {
				cache.loading = false;
				cache.loaded = true;
				notifyState();
				// Rafraîchissement demandé pendant la requête : on le rejoue maintenant. Le
				// drapeau est remis à zéro AVANT le rappel, sinon deux demandes concurrentes
				// s'entretiendraient indéfiniment.
				if (cache.pendingForce) {
					cache.pendingForce = false;
					// La file d'attente reste en place : elle sera vidée au terme de CE
					// chargement-là, quand la donnée sera enfin la bonne.
					loadPageAnchors(true);
					return;
				}
				notifyReady();
			});
	}

	function declaredKeys() {
		return cache.declared.map(function (a) {
			return a.fragment;
		});
	}

	/* ------------------------------------------------------------------ *
	 * Cadence des rafraîchissements
	 * ------------------------------------------------------------------ */

	/*
	 * FENÊTRE DE COALESCENCE — courte, et réservée aux gestes RAPPROCHÉS.
	 *
	 * Survol puis clic, c'est un seul geste : sans cette fenêtre il partait deux requêtes
	 * identiques à quelques centaines de millisecondes d'intervalle, la seconde retardant la
	 * première. Une seconde et demie suffit à les fondre, et reste trop courte pour masquer une
	 * modification : on n'ajoute ni ne supprime une mention légale en une seconde.
	 *
	 * Elle ne s'applique QU'aux gestes de consultation (survol, ouverture). Les signaux qui
	 * annoncent un retour d'ailleurs — reprise de focus, nouvel éditeur — forcent toujours,
	 * puisque ce sont eux qui suivent une édition dans une autre fiche.
	 */
	var REFRESH_COALESCE_MS = 1500;
	var lastRefreshAt = 0;
	var lastRefreshRoute = null;

	function routeKeyNow() {
		var ctx = contextFromRoute();
		return ctx ? ctx.path + "|" + ctx.lang : "";
	}

	/** Rafraîchissement inconditionnel : on sait qu'on revient d'ailleurs. */
	function forceRefresh() {
		lastRefreshAt = Date.now();
		lastRefreshRoute = routeKeyNow();
		loadPageAnchors(true);
	}

	/**
	 * Rafraîchissement de consultation, fondu avec le précédent s'il est tout récent.
	 *
	 * La route fait partie du critère, et pas seulement le délai : au chargement du fichier la
	 * route jContent n'est pas toujours établie, et le premier départ peut viser la mauvaise
	 * page. Sans ce test, `instanceReady` — qui survient quelques dizaines de millisecondes plus
	 * tard — se serait fondu dans cette fenêtre et aurait laissé le cache sur la page précédente.
	 */
	function requestRefresh() {
		if (routeKeyNow() === lastRefreshRoute && Date.now() - lastRefreshAt < REFRESH_COALESCE_MS) {
			return;
		}
		forceRefresh();
	}

	/** Y a-t-il quelque chose à montrer dans le panneau ? */
	function hasAnchorsToShow() {
		return capAnchors(cache.list).list.length > 0;
	}

	function saveSnapshot(pageKey) {
		storeSet("anchors." + pageKey, { declared: cache.declared, content: cache.content });
	}

	/**
	 * Rouvre le menu dès que la donnée est arrivée, si elle a changé l'affichage.
	 *
	 * `onMenu` est SYNCHRONE : le panneau est peint avec le cache tel qu'il est au moment du
	 * clic, et le rafraîchissement lancé par cette ouverture-là ne peut, par construction,
	 * profiter qu'à la SUIVANTE. C'est la cause du « premier clic périmé, deuxième bon ».
	 *
	 * CK4 rappelle `onMenu` à chaque ouverture et reconstruit le panneau : refermer puis rouvrir
	 * suffit à le repeupler. On passe par le bouton lui-même — `click()` bascule l'état du
	 * menubutton — plutôt que par les internes du panneau.
	 *
	 * `before` est l'empreinte de ce qui vient d'être peint : si la réponse ne change rien, on ne
	 * touche à rien. Le contributeur ne voit donc un clignotement QUE lorsqu'il y a effectivement
	 * du nouveau à montrer.
	 */
	/**
	 * Le panneau de CET éditeur est-il affiché ?
	 *
	 * `TRISTATE_ON` est l'état que CK4 pose lui-même tant que le menu est ouvert : c'est la
	 * source autoritaire. Notre drapeau, alimenté par `menuShow`/`panelHide` — événements
	 * globaux à l'éditeur, donc faillibles — ne sert que de repli.
	 */
	function menuIsOpen(editor, button) {
		if (button && typeof button.getState === "function") {
			return button.getState() === CKEDITOR.TRISTATE_ON;
		}
		return uiState(editor).menuIsOpen;
	}

	/**
	 * Referme puis rouvre le menu — CK4 rejoue `onMenu` et reconstruit le panneau à partir du
	 * cache, désormais à jour.
	 */
	function toggleReopen(editor, buttonName) {
		try {
			var button = editor.ui.get(buttonName);
			if (!button || typeof button.click !== "function") return;

			button.click(editor); // ferme

			/*
			 * Réouverture au tour de boucle SUIVANT, et non dans la foulée. CK4 remet l'état du
			 * menubutton à zéro pendant la fermeture ; enchaîner les deux appels dans la même pile
			 * risque de faire lire un état encore « ouvert » au second, qui refermerait au lieu de
			 * rouvrir — le menu resterait clos.
			 */
			setTimeout(function () {
				try {
					button.click(editor);
				} catch {
					/* le contributeur recliquera */
				}
			}, 0);
		} catch {
			/* API du bouton différente : le contributeur recliquera. */
		}
	}

	function reopenWhenReady(editor, buttonName, before) {
		var ui = uiState(editor);
		ui.pendingBefore = before;

		if (ui.reopening) return;
		ui.reopening = true;

		readyWaiters.push(function () {
			ui.reopening = false;
			// Rien de neuf à l'écran : pas de clignotement gratuit.
			if (signature(capAnchors(cache.list).list) === ui.pendingBefore) return;

			var button = null;
			try {
				button = editor.ui.get(buttonName);
			} catch {
				/* on retombe sur le drapeau de repli */
			}

			if (menuIsOpen(editor, button)) {
				toggleReopen(editor, buttonName);
				return;
			}

			/*
			 * LE PANNEAU N'EST PAS *ENCORE* AFFICHÉ — et c'est le cas qui restait en défaut.
			 *
			 * `onMenu` s'abonne AVANT que CK4 ne montre le panneau, et CK4 ne pose
			 * `TRISTATE_ON` qu'à l'affichage. Depuis que la requête déclarée est légère, la
			 * réponse arrive couramment dans cet intervalle : le test d'ouverture répondait
			 * « non », la réouverture était abandonnée, et le panneau s'affichait juste après
			 * avec la liste périmée. C'est exactement le symptôme de la SUPPRESSION vue à la
			 * première ouverture puis corrigée à la seconde.
			 *
			 * On ne renonce donc plus : on note l'intention, et `menuShow` la rejouera au
			 * moment où le panneau existe réellement.
			 */
			ui.refreshOnShow = true;
		});
	}

	/* ------------------------------------------------------------------ *
	 * UI CKEditor 4
	 * ------------------------------------------------------------------ */

	/*
	 * PLAFOND D'AFFICHAGE.
	 *
	 * Un menu CKEditor 4 se dimensionne à son contenu : il est conçu pour une dizaine
	 * d'entrées, pas cent. Au-delà, il déborde du viewport et les dernières entrées
	 * deviennent inatteignables — sans le moindre signe pour le contributeur.
	 *
	 * Et même avec un défilement, une liste plate de cent ancres est inutilisable : on n'y
	 * retrouve rien.
	 *
	 * On plafonne donc, mais JAMAIS en silence, et jamais au détriment de ce qui compte :
	 *  - les ancres DÉCLARÉES passent toujours en entier. Ce sont celles qu'un contributeur
	 *    a posées volontairement, elles sont peu nombreuses et ce sont les seules qu'il
	 *    cherche vraiment ;
	 *  - seules les ancres héritées du CONTENU sont tronquées, et une entrée explicite
	 *    annonce combien ont été masquées.
	 *
	 * Le bornage à la page courante ramène déjà ces volumes à quelques unités dans le cas
	 * normal ; ce plafond est le garde-fou pour les pages exceptionnellement chargées.
	 */
	var MAX_CONTENT_ANCHORS = 25;

	/*
	 * FONCTION PURE : elle RETOURNE le nombre d'ancres masquées au lieu de l'écrire dans un
	 * état de module.
	 *
	 * Elle a plusieurs appelants qui ne veulent que la liste — `hasAnchorsToShow`, les
	 * comparaisons d'empreinte. Avec un compteur stocké en effet de bord, chacun d'eux
	 * l'écrasait au passage, et cela ne restait correct que parce que `onMenu` le relisait
	 * de façon synchrone juste après son propre appel. Le moindre entrelacement futur aurait
	 * libellé de travers l'entrée « … et N autres ancres non affichées », en silence.
	 */
	function capAnchors(list) {
		var declared = [];
		var content = [];
		list.forEach(function (anchor) {
			(anchor.source === "declared" ? declared : content).push(anchor);
		});

		return {
			list: declared.concat(content.slice(0, MAX_CONTENT_ANCHORS)),
			hidden: Math.max(0, content.length - MAX_CONTENT_ANCHORS),
		};
	}

	function escapeHtml(text) {
		return String(text)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	/*
	 * UI_MENUBUTTON et NON richcombo.
	 *
	 * Un richcombo doit être peuplé de façon SYNCHRONE dans son `init` : ses items sont
	 * figés dans le panneau au moment du `commit()`. Les ancres arrivent d'un appel
	 * GraphQL, donc après — et un `add()` tardif laissait le panneau vide puis faisait
	 * échouer CKEditor sur `Cannot read properties of null (reading 'removeClass')`,
	 * l'interne cherchant un élément de liste jamais rendu.
	 *
	 * `onMenu` d'un menubutton est au contraire rappelé à CHAQUE ouverture : il lit le
	 * cache rempli entre-temps. C'est le mécanisme prévu par CK4 pour un contenu dynamique.
	 */
	// L'instantané de session d'abord — il est synchrone, donc le menu a déjà quelque chose à
	// peindre même si le contributeur clique dans la seconde. Puis la requête, qui a tout le
	// temps d'initialisation de l'éditeur pour aboutir.
	/*
	 * SURFACE DE TEST — inerte en production.
	 *
	 * Ce fichier est chargé par CKEditor comme un script classique : pas de bundler, pas de
	 * modules. Ses helpers vivent dans une IIFE et ne sont donc atteignables d'AUCUNE façon
	 * depuis un test, si bien que la moitié risquée du plugin restait invérifiable.
	 *
	 * On expose les fonctions PURES — jamais l'état, jamais l'UI — derrière un drapeau que
	 * seul le harnais de test pose avant d'évaluer le fichier. En production le drapeau est
	 * absent, la branche ne s'exécute pas, et rien n'est publié sur `window`.
	 *
	 * Ce n'est pas la solution idéale : celle-ci consisterait à écrire le plugin comme un
	 * module de `src/` et à le faire produire par Vite dans `javascript/`. Tant que ce n'est
	 * pas fait, ce drapeau est le seul moyen de tester l'artefact RÉELLEMENT livré plutôt
	 * qu'une copie qui dériverait.
	 */
	if (typeof window !== "undefined" && window.__SOFINCO_TEST__) {
		window.__sofincoPageAnchors = {
			filterHtmlId: filterHtmlId,
			normalizeNumber: normalizeNumber,
			footnoteId: footnoteId,
			toSuperscript: toSuperscript,
			componentLabel: componentLabel,
			textFromHtml: textFromHtml,
			truncate: truncate,
			stripLeadingNumber: stripLeadingNumber,
			resolvePagePath: resolvePagePath,
			declaredAnchorOf: declaredAnchorOf,
			pageContentNodes: pageContentNodes,
			buildDeclaredAnchors: buildDeclaredAnchors,
			buildContentAnchors: buildContentAnchors,
			capAnchors: capAnchors,
			signature: signature,
			/*
			 * Pas des helpers, mais le PÉRIMÈTRE est une règle de correction à part entière :
			 * redescendre depuis la page au lieu de ses zones a suffi à vider le menu sur
			 * l'accueil sans lever d'erreur. Et les deux listes de zones sont une copie des
			 * gabarits, que leur test doit pouvoir confronter à l'original.
			 */
			PAGE_AREAS: PAGE_AREAS,
			EXCLUDED_AREAS: EXCLUDED_AREAS,
			DECLARED_QUERY: DECLARED_QUERY,
			CONTENT_QUERY: CONTENT_QUERY,
		};
	}

	/*
	 * Hors navigateur CKEditor — c'est-à-dire sous test — il n'y a ni éditeur à équiper ni
	 * ancres à précharger. La garde évite au harnais d'avoir à simuler tout CKEDITOR pour
	 * atteindre des fonctions pures.
	 */
	if (typeof CKEDITOR === "undefined") return;

	primeFromStore();
	requestRefresh();

	CKEDITOR.plugins.add("sofincoPageAnchors", {
		requires: "menubutton",

		init: function (editor) {
			// `this.path` = URL du dossier du plugin, résolue par CKEDITOR.plugins.addExternal.
			var iconUrl = this.path + "icons/sofincopageanchors.svg";

			/*
			 * Nouvel éditeur : la route jContent est cette fois établie, alors qu'elle pouvait ne
			 * pas l'être au chargement du fichier. On retente donc l'amorçage depuis
			 * l'instantané — c'est lui qui évite le « Chargement… » de la toute première
			 * ouverture — avant de relancer la requête.
			 */
			primeFromStore();
			requestRefresh();

			/*
			 * Reprendre le focus sur le champ signale presque toujours un retour depuis autre
			 * chose — souvent l'édition d'une mention légale dans une autre fiche. On force
			 * donc un rafraîchissement à ce moment-là : quand le contributeur ouvrira le menu,
			 * la liste sera déjà à jour, sans attente visible.
			 */
			editor.on("focus", function () {
				forceRefresh();
			});

			/*
			 * `init` s'exécute pendant la construction de l'éditeur, alors que la route jContent
			 * peut ne pas être encore stabilisée — le chargement partirait sur le chemin de la
			 * page PRÉCÉDENTE. `instanceReady` marque le moment où l'éditeur est réellement
			 * utilisable ; c'est là que `location.href` est fiable.
			 */
			editor.on("instanceReady", function () {
				// La route est ici FIABLE : c'est le meilleur moment pour amorcer depuis
				// l'instantané, y compris après une navigation vers une autre page.
				primeFromStore();
				requestRefresh();
			});

			/*
			 * Suivi de l'état d'ouverture, pour la réouverture automatique. `menuShow` est global
			 * à l'éditeur — menu contextuel et autre menubutton compris ; le drapeau `opening`
			 * posé par `onMenu` juste avant l'affichage restreint l'effet à notre seul menu.
			 */
			editor.on("menuShow", function () {
				var ui = uiState(editor);
				if (!ui.opening) return;
				ui.opening = false;
				ui.menuIsOpen = true;

				// Réponse arrivée pendant que CK4 montait le panneau : le panneau qu'on vient
				// d'afficher est donc déjà périmé. On le rejoue maintenant qu'il existe.
				if (!ui.refreshOnShow) return;
				ui.refreshOnShow = false;
				if (signature(capAnchors(cache.list).list) === ui.pendingBefore) return;

				// Au tour de boucle suivant : CK4 est encore en train de finir son affichage,
				// une bascule immédiate se ferait avaler.
				setTimeout(function () {
					toggleReopen(editor, "sofincoPageAnchors");
				}, 0);
			});

			// Fermeture d'un panneau, quel qu'il soit : on cesse de considérer le nôtre ouvert.
			// Conservateur — au pire on renonce à une réouverture automatique.
			editor.on("panelHide", function () {
				uiState(editor).menuIsOpen = false;
				/*
				 * L'état du bouton n'est pas retouché tant qu'un panneau est ouvert (cf.
				 * `refreshButtonState`). Une réponse arrivée pendant l'ouverture n'a donc pas été
				 * répercutée : on resynchronise à la fermeture, sinon le bouton pourrait rester
				 * actif alors que la page n'a plus aucune ancre.
				 */
				notifyState();
			});

			/*
			 * PRÉCHARGEMENT AU SURVOL DU BOUTON.
			 *
			 * `onMenu` est synchrone : la requête qu'il déclenche arrive toujours trop tard pour
			 * le panneau qu'il est en train de peindre. Le survol, lui, précède le clic de
			 * plusieurs centaines de millisecondes — largement de quoi laisser aboutir la requête
			 * légère. C'est le seul moment où l'on peut gagner du temps SANS rien deviner.
			 *
			 * `uiReady` plutôt qu'`instanceReady` : la barre d'outils n'existe dans le DOM qu'une
			 * fois l'interface montée. Entièrement défensif — si le bouton reste introuvable, on
			 * perd le préchargement, jamais l'éditeur.
			 */
			editor.on("uiReady", function () {
				try {
					var button = editor.ui.get("sofincoPageAnchors");
					var el =
						button && button._ && button._.id ? CKEDITOR.document.getById(button._.id) : null;
					if (!el) return;

					el.on("mouseenter", function () {
						requestRefresh();
					});

					/*
					 * L'ATTENTE EST PORTÉE PAR LE BOUTON, PLUS PAR LE PANNEAU.
					 *
					 * Ouvrir un menu pour y lire « Chargement des ancres… » revient à faire payer au
					 * contributeur un clic qui ne lui apporte rien, puis à lui faire recommencer. Un
					 * bouton grisé dit la même chose AVANT le clic, sans l'exiger — et CK4 refuse
					 * nativement d'ouvrir le menu d'un bouton désactivé, donc aucun détournement
					 * d'événement n'est nécessaire.
					 *
					 * L'infobulle porte le motif, puisqu'un bouton grisé sans explication
					 * s'interprète mal : « Chargement… » pendant la requête, « Aucune ancre » quand
					 * la page n'en a réellement aucune.
					 *
					 * Défensif de bout en bout : si `setState` n'existait pas dans cette version de
					 * CK4, le bouton reste actif et le panneau retombe sur ses items de repli —
					 * c'est-à-dire le comportement d'avant, jamais une barre cassée.
					 */
					function refreshButtonState() {
						try {
							if (typeof button.setState !== "function") return;

							/*
							 * MENU OUVERT : ON NE TOUCHE À RIEN.
							 *
							 * CK4 met le menubutton à `TRISTATE_ON` tant que son panneau est affiché —
							 * c'est cet état qui lui sert à savoir, au clic suivant, s'il doit ouvrir
							 * ou refermer. Le réécrire pendant que le panneau est ouvert, ce que
							 * faisait cette fonction dès qu'une réponse arrivait, désynchronisait le
							 * bouton : la réouverture automatique enchaînait alors deux bascules qui
							 * se neutralisaient, et le panneau gardait sa liste d'avant. C'est ce qui
							 * rendait une SUPPRESSION visible seulement à l'ouverture suivante.
							 */
							if (
								typeof button.getState === "function" &&
								button.getState() === CKEDITOR.TRISTATE_ON
							) {
								return;
							}

							if (hasAnchorsToShow()) {
								button.setState(CKEDITOR.TRISTATE_OFF);
								el.setAttribute("title", LABELS.buttonTitle);
								return;
							}
							if (cache.failed) {
								// Échec réseau : le bouton reste CLIQUABLE pour que le clic relance une
								// requête. Le griser enfermerait le contributeur dans l'erreur.
								button.setState(CKEDITOR.TRISTATE_OFF);
								el.setAttribute("title", LABELS.failedTitle);
								return;
							}

							button.setState(CKEDITOR.TRISTATE_DISABLED);
							el.setAttribute(
								"title",
								cache.loaded && !cache.loading ? LABELS.empty : LABELS.loading,
							);
						} catch {
							/* état inchangé : le menu reste utilisable tel quel */
						}
					}

					stateListeners.push(refreshButtonState);
					editor.on("destroy", function () {
						var i = stateListeners.indexOf(refreshButtonState);
						if (i !== -1) stateListeners.splice(i, 1);
					});
					refreshButtonState();
				} catch {
					/* pas de préchargement ni d'état : le menu reste fonctionnel */
				}
			});

			// Les groupes portent la séparation visuelle entre les deux populations.
			editor.addMenuGroup("sofincoAnchorsDeclared", 10);
			editor.addMenuGroup("sofincoAnchorsContent", 20);

			function insert(anchor) {
				editor.focus();
				editor.fire("saveSnapshot");

				var href = "#" + anchor.fragment;
				var selected = editor.getSelection().getSelectedText();

				if (anchor.kind === "footnote") {
					/*
					 * Un appel de note est TOUJOURS en exposant : la note elle-même est rendue
					 * `<sup>(n)</sup>` par buildNote, l'appel doit lui répondre. On insère la
					 * forme exposant Unicode, identique à celle que produit
					 * `superscriptFootnoteTokens` côté serveur — y compris son refus de convertir
					 * un marqueur non numérique — donc aucun décalage entre un renvoi posé ici et
					 * un renvoi contribué en `((n))` dans un champ texte.
					 */
					var mark = toSuperscript(anchor.number || "");
					editor.insertHtml('<a href="' + href + '">' + escapeHtml(selected) + mark + "</a>");
				} else {
					var text = selected || anchor.label;
					editor.insertHtml('<a href="' + href + '">' + escapeHtml(text) + "</a>");
				}

				editor.fire("saveSnapshot");
			}

			editor.ui.add("sofincoPageAnchors", CKEDITOR.UI_MENUBUTTON, {
				label: LABELS.buttonLabel,
				title: LABELS.buttonTitle,
				// Un menubutton s'affiche par son ICÔNE : `label` n'est que l'infobulle et le
				// nom accessible. Sans icône, il ne reste que la flèche du menu, sans repère
				// visuel — c'est ce qui rendait le bouton invisible dans la barre.
				icon: iconUrl,
				modes: { wysiwyg: 1 },
				// Pas de propriété `toolbar` : le bouton n'apparaît QUE là où une toolbar le
				// liste explicitement (cf. ckeditor_config.js). Sans ça CK4 le place tout seul,
				// y compris dans les barres minimalistes qui n'en veulent pas.

				onMenu: function () {
					var states = {};
					var items = {};

					// `menuShow` est global à l'éditeur : ce drapeau, posé juste avant l'affichage,
					// dit à l'écouteur que le panneau qui s'ouvre est le nôtre.
					uiState(editor).opening = true;

					/*
					 * Rafraîchissement FORCÉ à chaque ouverture — c'est ce qui rétablit le
					 * comportement du bouton Ancre natif, dont la boîte de dialogue relit les
					 * ancres à chaque fois. La liste connue est peinte immédiatement (pas de
					 * « Chargement… » à répétition) et la requête part en parallèle.
					 *
					 * Le panneau étant SYNCHRONE, cette requête-là ne peut pas alimenter
					 * l'ouverture en cours : on s'abonne donc à son terme pour rouvrir le menu si
					 * elle change quelque chose. C'est ce qui rend l'ajout, la suppression ou la
					 * correction d'une mention visible SANS que le contributeur ait à recliquer.
					 */
					requestRefresh();
					var capped = capAnchors(cache.list);
					var anchors = capped.list;
					/*
					 * On ne s'abonne QUE si une requête est réellement en cours. Hors route
					 * jContent (aperçu, test), `loadPageAnchors` se termine sans rien lancer : un
					 * abonné poserait alors une attente que rien ne viendrait jamais résoudre, et
					 * le drapeau `reopening` resté levé désarmerait la réouverture pour de bon.
					 */
					if (cache.loading || cache.pendingForce) {
						reopenWhenReady(editor, "sofincoPageAnchors", signature(anchors));
					}

					/*
					 * « Chargement… » UNIQUEMENT quand il n'y a rien d'autre à montrer.
					 *
					 * La version précédente l'affichait dès que le cache était marqué non chargé —
					 * ce qui, la clé portant sur la route, arrivait à presque chaque ouverture. Le
					 * contributeur voyait « Chargement des ancres… » en permanence alors que la
					 * liste était là. Une liste de la BONNE page, même d'une seconde, vaut
					 * infiniment mieux qu'un message d'attente.
					 */
					if (!anchors.length && (!cache.loaded || cache.loading)) {
						items.sofincoAnchorsLoading = {
							label: LABELS.loadingItem,
							group: "sofincoAnchorsDeclared",
							order: 0,
							onClick: function () {},
						};
						editor.addMenuItems(items);
						states.sofincoAnchorsLoading = CKEDITOR.TRISTATE_DISABLED;
						return states;
					}

					// Le clic RELANCE déjà la requête (`requestRefresh` plus haut) : on le dit, plutôt
					// que d'annoncer une page vide alors que c'est le réseau qui a lâché.
					if (!anchors.length && cache.failed) {
						items.sofincoAnchorsFailed = {
							label: LABELS.failedItem,
							group: "sofincoAnchorsDeclared",
							order: 0,
							onClick: function () {},
						};
						editor.addMenuItems(items);
						states.sofincoAnchorsFailed = CKEDITOR.TRISTATE_DISABLED;
						return states;
					}

					if (!anchors.length) {
						items.sofincoAnchorsEmpty = {
							label: LABELS.empty,
							group: "sofincoAnchorsDeclared",
							order: 0,
							onClick: function () {},
						};
						editor.addMenuItems(items);
						states.sofincoAnchorsEmpty = CKEDITOR.TRISTATE_DISABLED;
						return states;
					}

					anchors.forEach(function (anchor, index) {
						var name = "sofincoAnchor" + index;

						/*
						 * Une mention légale est identifiée par son TEXTE, pas par son numéro :
						 * « 5 » ne dit rien au contributeur, le début du texte légal si. Le type
						 * de composant est alors redondant, on le remplace par l'aperçu.
						 *
						 * Les ancres de section, elles, n'ont pas de contenu à montrer : leur
						 * valeur EST leur identité, on garde donc le type d'origine pour situer
						 * d'où elles viennent.
						 */
						var label;
						var title;
						if (anchor.kind === "footnote" && anchor.preview) {
							label = anchor.label + " · " + anchor.preview;
							title = anchor.full;
						} else {
							label = anchor.origin ? anchor.label + " · " + anchor.origin : anchor.label;
							title = anchor.path;
						}

						items[name] = {
							label: label,
							// Texte complet au survol. Si une version de CK4 ignorait `title`,
							// l'infobulle retombe sur le libellé — dégradation sans casse.
							title: title,
							group:
								anchor.source === "declared" ? "sofincoAnchorsDeclared" : "sofincoAnchorsContent",
							order: index,
							onClick: function () {
								insert(anchor);
							},
						};
						states[name] = CKEDITOR.TRISTATE_OFF;
					});

					// Troncature ANNONCÉE : une liste coupée en silence se lit comme une liste
					// complète, et le contributeur chercherait indéfiniment une ancre absente.
					if (capped.hidden > 0) {
						items.sofincoAnchorsHidden = {
							label: LABELS.hiddenItem(capped.hidden),
							title: LABELS.hiddenTitle,
							group: "sofincoAnchorsContent",
							order: 9999,
							onClick: function () {},
						};
						states.sofincoAnchorsHidden = CKEDITOR.TRISTATE_DISABLED;
					}

					// Ré-enregistrer les mêmes noms écrase proprement : le menu reflète toujours
					// l'état courant de la page.
					editor.addMenuItems(items);
					return states;
				},
			});
		},
	});
})();
