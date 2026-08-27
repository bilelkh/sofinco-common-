// @ts-nocheck
/*
 * CKEditor 4 plugin — sofincoSimulatorVars
 *
 * DEUX menus, un par famille de variables — « Variables simulateur » et « Variables campagne ».
 * Chacun insère un jeton au curseur, comme du texte brut ; le rendu serveur le remplace par la
 * valeur renvoyée par l'APIM.
 *
 * La séparation n'est pas cosmétique : les deux familles ne se corrigent pas au même endroit.
 * Une variable de SIMULATION dépend du type de crédit de la page et décrit un exemple calculé ;
 * une variable de CAMPAGNE ne dépend que de la provenance et décrit les bornes de l'offre. Un
 * bouton par famille rend l'indisponibilité lisible — celui dont la famille n'est pas résolvable
 * affiche son propre motif, l'autre reste utilisable.
 *
 * DEUX SOURCES, DEUX RÔLES
 * ------------------------
 *  1. LA PAGE ÉDITÉE décide si le menu a un sens. Les paramètres de simulation sont portés
 *     par le mixin `sofmix:simulationParams` (onglet Options de la page). Sans lui — ou avec
 *     un type de crédit non renseigné — aucun jeton ne serait résolu au rendu : on n'en
 *     propose donc aucun, et on explique pourquoi plutôt que d'afficher un menu vide, qui se
 *     lirait comme une panne.
 *
 *  2. LA CONFIG DE SITE (`contents/site-settings/simulator-vars`) décide de la liste et de sa
 *     présentation : jeton, libellé affiché, aide, ordre, activation. Config absente ou vide
 *     → repli sur `DEFAULT_VARS` ci-dessous, pour que le plugin reste utilisable sur un
 *     environnement fraîchement déployé. Amorçage : `init-simulator-vars.groovy`.
 *
 * ⚠️  UN JETON N'EXISTE QUE SI LE BRIDGE JAVA LE PRODUIT
 *     `buildInsuranceVarMap` (src/lib/insuranceVars.ts) reprend TOUTES les clés renvoyées par
 *     le bridge : une variable ajoutée côté Java est donc immédiatement insérable, sans
 *     modifier ce fichier. En revanche, un jeton contribué ici qu'aucune valeur Java
 *     n'alimente restera affiché brut ({{...}}) sur la page — le panneau d'audit le signale
 *     en mode édition (`unknown-token`). Ce plugin ne peut PAS le valider à la saisie : il ne
 *     connaît pas le record du bridge.
 *
 *     Les alias legacy (insuranceRate, totalInsuranceAmountT1…) restent reconnus au rendu
 *     mais ne sont jamais proposés : on n'en crée plus de nouveaux.
 */
/* global CKEDITOR, contextJsParameters */

(function () {
	"use strict";

	/* ------------------------------------------------------------------ *
	 * Repli — doit rester aligné sur INSURANCE_VAR_TOKENS (insuranceVars.ts)
	 * ------------------------------------------------------------------ */

	/** Familles de variables — alignées sur la choicelist `family` du CND. */
	var FAMILY_SIMULATION = "simulation";
	var FAMILY_CAMPAIGN = "campagne";

	var DEFAULT_VARS = [
		{ token: "exampleAmount", label: "Montant emprunté — exemple (€)" },
		{ token: "taeg", label: "TAEG (%)" },
		{ token: "debitRate", label: "Taux débiteur (%)" },
		{ token: "monthlyWithoutInsurance", label: "Mensualité hors assurance (€)" },
		{ token: "lastWithoutInsurance", label: "Dernière mensualité hors assurance (€)" },
		{ token: "totalWithoutInsurance", label: "Montant total dû hors assurance (€)" },
		{ token: "taea", label: "TAEA (%)" },
		{ token: "monthlyAmount", label: "Prime mensuelle d’assurance (€)" },
		{ token: "firstMonthlyAmount", label: "Première prime d’assurance — la plus élevée (€)" },
		{ token: "totalInsuranceCost", label: "Coût total assurance (€)" },
		{ token: "monthlyWithInsurance", label: "Mensualité avec assurance (€)" },
		{ token: "lastWithInsurance", label: "Dernière mensualité avec assurance (€)" },
		{ token: "totalWithInsurance", label: "Montant total dû avec assurance (€)" },
		{ token: "dueNumber", label: "Nombre d’échéances" },
		{ token: "dueNumberMinusOne", label: "Nombre d’échéances − 1" },
	].map(function (v) {
		return { token: v.token, label: v.label, family: FAMILY_SIMULATION };
	});

	/*
	 * Bornes de l’OFFRE, par opposition au résultat d’un exemple calculé. Elles ne dépendent que
	 * de la provenance de la page — pas du type de crédit, ni du montant, ni de la durée.
	 *
	 * Les durées sont des nombres nus : la mention écrit « de {minDuration} à {maxDuration} mois »,
	 * le mot appartient à la phrase du contributeur.
	 */
	var DEFAULT_CAMPAIGN_VARS = [
		{ token: "minAmount", label: "Montant minimum de l’offre (€)" },
		{ token: "maxAmount", label: "Montant maximum de l’offre (€)" },
		{ token: "minDuration", label: "Durée minimum (nombre de mois)" },
		{ token: "maxDuration", label: "Durée maximum (nombre de mois)" },
		{ token: "minAnnualGlobalEffectiveRate", label: "TAEG minimum (%)" },
		{ token: "maxAnnualGlobalEffectiveRate", label: "TAEG maximum (%)" },
		{ token: "minAnnualDebitRate", label: "Taux débiteur minimum (%)" },
		{ token: "maxAnnualDebitRate", label: "Taux débiteur maximum (%)" },
		{ token: "promoGlobalEffectiveRate", label: "TAEG promotionnel (%)" },
		{ token: "startDate", label: "Début de validité de l’offre" },
		{ token: "endDate", label: "Fin de validité de l’offre" },
	].map(function (v) {
		return { token: v.token, label: v.label, family: FAMILY_CAMPAIGN };
	});

	var DEFAULT_ALL_VARS = DEFAULT_VARS.concat(DEFAULT_CAMPAIGN_VARS);

	var SIMULATION_MIXIN = "sofmix:simulationParams";
	var CONFIG_REL_PATH = "/contents/site-settings/simulator-vars";

	/* ------------------------------------------------------------------ *
	 * Accès Jahia — même plomberie que sofincoPageAnchors
	 * ------------------------------------------------------------------ */

	function contextPath() {
		return typeof contextJsParameters !== "undefined" && contextJsParameters.contextPath
			? contextJsParameters.contextPath
			: "";
	}

	// Site, langue et chemin JCR du nœud édité, déduits de la route jContent.
	// Forme : /jcontent/{site}/{lang}/{mode}/{segments...}
	function contextFromRoute() {
		var m = location.href.match(/\/jcontent\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)(?:\?|$)/);
		if (!m) return null;
		return { site: m[1], lang: m[2], path: "/sites/" + m[1] + "/" + m[4] };
	}

	function gql(query, variables) {
		return fetch(contextPath() + "/modules/graphql", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ query: query, variables: variables }),
		}).then(function (res) {
			return res.json();
		});
	}

	/*
	 * PÉRIMÈTRE : on remonte les ANCÊTRES du nœud édité jusqu'au `jnt:page` englobant, et on
	 * lit son mixin. C'est une simple lecture de propriété — pas une requête `descendants`,
	 * qui aurait exigé de réécarter les contenus situés sous les sous-pages (piège documenté
	 * dans sofincoPageAnchors : `typesFilter` filtre ce qui est RETOURNÉ, pas ce qui est
	 * TRAVERSÉ). C'est le bénéfice direct d'avoir remonté les paramètres sur la page.
	 */
	var PAGE_QUERY =
		"query SofincoSimulationOnPage($path: String!) {" +
		"  jcr(workspace: EDIT) {" +
		"    nodeByPath(path: $path) {" +
		"      path" +
		'      isPage: isNodeType(type: { types: ["jnt:page"] })' +
		'      hasSimulation: isNodeType(type: { types: ["' +
		SIMULATION_MIXIN +
		'"] })' +
		'      product: property(name: "simProduct") { value }' +
		'      sourceId: property(name: "simSourceId") { value }' +
		"      ancestors {" +
		"        path" +
		'        isPage: isNodeType(type: { types: ["jnt:page"] })' +
		'        hasSimulation: isNodeType(type: { types: ["' +
		SIMULATION_MIXIN +
		'"] })' +
		'        product: property(name: "simProduct") { value }' +
		'        sourceId: property(name: "simSourceId") { value }' +
		"      }" +
		"    }" +
		"  }" +
		"}";

	/*
	 * `jcr:title` EST le libellé — pas de propriété `label` distincte, elle faisait double emploi.
	 * Il est i18n : sans `language`, sa valeur revient nulle et le menu s'afficherait sans
	 * libellé. Même exigence que sur les ancres richtext.
	 */
	var CONFIG_QUERY =
		"query SofincoSimulatorVarsConfig($path: String!, $language: String!) {" +
		"  jcr(workspace: EDIT) {" +
		"    nodeByPath(path: $path) {" +
		'      children(typesFilter: { types: ["sofnt:simulatorVar"] }) {' +
		"        nodes {" +
		'          token: property(name: "token") { value }' +
		'          label: property(name: "jcr:title", language: $language) { value }' +
		'          enabled: property(name: "enabled") { value }' +
		'          family: property(name: "family") { value }' +
		"        }" +
		"      }" +
		"    }" +
		"  }" +
		"}";

	/* ------------------------------------------------------------------ *
	 * Cache — une résolution par session d'édition, rafraîchie au focus
	 * ------------------------------------------------------------------ */

	var cache = {
		loaded: false,
		loading: false,
		/**
		 * Route pour laquelle ce cache a été construit (`chemin|langue`).
		 *
		 * INDISPENSABLE : jContent est une application monopage. Passer d'une page à l'autre ne
		 * recharge pas le navigateur, et ce cache — de portée module, partagé par toutes les
		 * instances d'éditeur — survit à la navigation. Sans cette clé, le menu proposerait les
		 * variables de la page précédente : sur une page sans simulation, des jetons qui ne se
		 * résoudront jamais.
		 */
		key: null,
		/** Un rafraîchissement demandé pendant une requête en vol, à rejouer à son terme. */
		pendingForce: false,
		/**
		 * Disponibilité PAR FAMILLE : `{ state, simulation, campaign }`.
		 *
		 * `state` ne sert plus qu’au refus global (`no-params`) ; ce sont les deux booléens qui
		 * décident de ce que le menu propose, chaque famille ayant ses propres préconditions.
		 */
		pageState: UNKNOWN_STATE(),
		vars: DEFAULT_ALL_VARS,
	};

	/*
	 * ÉTAT D'INTERFACE : PORTÉ PAR L'ÉDITEUR, JAMAIS PAR LE MODULE.
	 *
	 * Ce fichier est évalué une fois par page, mais jContent peut afficher PLUSIEURS champs
	 * richtext simultanément — chacun sa propre instance CKEditor, toutes partageant ces
	 * variables si on les déclare ici. Un menu ouvert dans le champ A marquerait alors le menu
	 * du champ B comme ouvert, et `reopenWhenReady` cliquerait le bouton du mauvais éditeur.
	 *
	 * Le cache de variables, lui, reste au niveau module : il décrit la PAGE, pas un éditeur, et
	 * le partager entre instances est précisément ce qu'on veut.
	 */
	function uiState(editor) {
		if (!editor._sofincoVars) {
			editor._sofincoVars = {
				/** Notre menu est-il ouvert ? Conditionne la réouverture automatique. */
				menuIsOpen: false,
				/** Un réarmement est déjà en vol pour CET éditeur. */
				reopening: false,
				/** Le panneau qui s'ouvre est le nôtre — posé par `onMenu`, lu par `menuShow`. */
				opening: false,
			};
		}
		return editor._sofincoVars;
	}

	/**
	 * Rappels à jouer quand le cache devient exploitable.
	 *
	 * Une file plutôt qu'une promesse : un chargement peut en enchaîner un autre (rafraîchissement
	 * demandé en cours de route). Avec une promesse par chargement, celle du premier n'était jamais
	 * résolue et l'abonné restait en attente indéfiniment. La file, elle, traverse les
	 * enchaînements et n'est vidée qu'une fois la donnée réellement disponible.
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

	/** Le `jnt:page` englobant, ou le nœud lui-même s'il en est un. */
	function pickPage(node) {
		if (!node) return null;
		if (node.isPage) return node;
		var ancestors = node.ancestors || [];
		// `ancestors` est ordonné de la racine vers le parent : la page la plus PROCHE est la
		// dernière. Prendre la première remonterait à la home du site.
		for (var i = ancestors.length - 1; i >= 0; i--) {
			if (ancestors[i].isPage) return ancestors[i];
		}
		return null;
	}

	/*
	 * DEUX DISPONIBILITÉS, PAS UNE.
	 *
	 * Une simulation exige le type de crédit ; une campagne se contente de la provenance. Un état
	 * unique forcerait à refuser les deux familles dès que l'une manque — et un contributeur qui
	 * ne veut afficher qu'un `{minAmount}` devrait renseigner un type de crédit qu'il n'utilise
	 * pas, alors que ce champ pilote des chiffres réglementés.
	 */
	/**
	 * État « on ne sait pas » — hors route jContent, ou requête de page en échec.
	 *
	 * Fabrique et non constante partagée : l'objet est stocké dans `cache.pageState`, une
	 * constante exposerait la même instance à toutes les pages.
	 *
	 * Les deux booléens restent à `false` : ils affirment ce qui est CONNU, et ici rien ne l'est.
	 * Ce n'est pas eux qui rendent le menu utilisable dans ce cas — c'est `onMenu`, qui traite
	 * `unknown` comme permissif. Les mettre à `true` ferait mentir l'état pour obtenir un effet
	 * de bord dans la garde.
	 */
	function UNKNOWN_STATE() {
		return { state: "unknown", simulation: false, campaign: false };
	}

	function readPageState(json) {
		var node = json && json.data && json.data.jcr ? json.data.jcr.nodeByPath : null;
		var page = pickPage(node);
		if (!page) return UNKNOWN_STATE();
		if (!page.hasSimulation) return { state: "no-params", simulation: false, campaign: false };

		var product = page.product && page.product.value ? String(page.product.value).trim() : "";
		var sourceId = page.sourceId && page.sourceId.value ? String(page.sourceId.value).trim() : "";

		return {
			state: product ? "ready" : "no-product",
			simulation: Boolean(product),
			campaign: Boolean(sourceId),
		};
	}

	/**
	 * Échappe un libellé destiné à un item de menu CK4.
	 *
	 * Les gabarits de menu de CKEditor 4 interpolent `{label}` dans du HTML SANS l'encoder. Or ce
	 * libellé vient du `jcr:title` d'un nœud de configuration : c'est une valeur contribuée, donc
	 * hors de notre contrôle. Sans encodage, du balisage saisi là s'exécuterait dans l'interface
	 * d'auteur.
	 *
	 * L'exploitation suppose déjà un accès en écriture à `contents/site-settings/simulator-vars`,
	 * ce qui borne fortement la portée. Elle ne l'annule pas : les droits sur les réglages du site
	 * et ceux d'un administrateur ne sont pas la même population, et la valeur est STOCKÉE — elle
	 * s'exécuterait donc dans la session de quiconque ouvre ensuite le menu.
	 *
	 * Encodé ICI, à la frontière où la donnée externe entre, plutôt qu'au point d'affichage :
	 * c'est le seul endroit qu'un futur consommateur ne peut pas contourner par oubli.
	 */
	function encodeLabel(value) {
		// `typeof` et non `CKEDITOR &&` : sur un identifiant NON DECLARE, la seconde forme leve
		// une ReferenceError au lieu de retomber sur le repli. Le cas se produit si le plugin
		// s'evalue avant CKEditor — et sous test, ou CKEDITOR n'existe pas du tout.
		if (
			typeof CKEDITOR !== "undefined" &&
			CKEDITOR.tools &&
			typeof CKEDITOR.tools.htmlEncode === "function"
		) {
			return CKEDITOR.tools.htmlEncode(value);
		}
		// Repli si l'API bougeait : mieux vaut un libellé trop échappé qu'un libellé exécutable.
		return String(value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	function readVars(json) {
		var node = json && json.data && json.data.jcr ? json.data.jcr.nodeByPath : null;
		var nodes = node && node.children ? node.children.nodes : null;
		if (!nodes || !nodes.length) return DEFAULT_ALL_VARS;

		var list = [];
		nodes.forEach(function (entry) {
			var token = entry.token && entry.token.value ? String(entry.token.value) : "";
			if (!token) return;
			// `enabled` est `autocreated` à true ; une valeur absente vaut donc « proposée ».
			var enabled = !entry.enabled || String(entry.enabled.value) !== "false";
			if (!enabled) return;
			// Titre absent (contenu importé, jamais traduit dans cette langue) : on retombe sur le
			// nom technique plutôt que d'afficher une entrée vide.
			var label = entry.label && entry.label.value ? String(entry.label.value) : token;
			// Famille absente = contenu antérieur à cette évolution : c’était bien de la simulation.
			var family =
				entry.family && entry.family.value === FAMILY_CAMPAIGN
					? FAMILY_CAMPAIGN
					: FAMILY_SIMULATION;
			list.push({ token: token, label: encodeLabel(label), family: family });
		});

		// Config présente mais tout désactivé : on respecte la décision du contributeur
		// plutôt que de réafficher le repli, qui donnerait l'impression d'un réglage ignoré.
		return list;
	}

	function load(force) {
		var ctx = contextFromRoute();
		var key = ctx ? ctx.path + "|" + ctx.lang : "";

		/*
		 * Navigation dans jContent : le cache porte sur une autre page. On le marque NON CHARGÉ,
		 * pas seulement périmé — `onMenu` affichera « Chargement… » plutôt que les variables de
		 * la page précédente. Mieux vaut faire patienter une seconde que proposer des jetons qui
		 * ne se résoudront pas.
		 */
		if (cache.key !== key) {
			cache.loaded = false;
			force = true;
		}

		// Requête déjà en vol : on mémorise la demande de rafraîchissement au lieu de la perdre.
		// Sans cela, un `load(true)` arrivant pendant un chargement était silencieusement
		// abandonné, et le cache restait sur la page précédente jusqu'au focus suivant.
		if (cache.loading) {
			if (force) cache.pendingForce = true;
			return;
		}
		if (cache.loaded && !force) return;

		if (!ctx) {
			// Hors route jContent (aperçu, test) : on reste utilisable avec le repli.
			cache.key = key;
			cache.loaded = true;
			cache.pageState = UNKNOWN_STATE();
			cache.vars = DEFAULT_ALL_VARS;
			return;
		}

		cache.loading = true;
		cache.key = key;

		// Deux requêtes indépendantes : l'absence du nœud de config ne doit pas empêcher de
		// connaître l'état de la page, et réciproquement.
		var pageReq = gql(PAGE_QUERY, { path: ctx.path })
			.then(readPageState)
			.catch(function () {
				// MÊME FORME que les autres sorties d'état : tout le reste lit `.state` et les
				// deux booléens de famille. Une chaîne nue rendrait `.state` indéfini, donc la
				// garde `no-params` inopérante ET `available()` faux — les deux menus se
				// verrouilleraient sur une page pourtant correctement configurée.
				return UNKNOWN_STATE();
			});

		var configReq = gql(CONFIG_QUERY, {
			path: "/sites/" + ctx.site + CONFIG_REL_PATH,
			language: ctx.lang,
		})
			.then(readVars)
			.catch(function () {
				return DEFAULT_ALL_VARS;
			});

		Promise.all([pageReq, configReq])
			.then(function (results) {
				cache.pageState = results[0];
				cache.vars = results[1];
			})
			.catch(function () {
				cache.pageState = UNKNOWN_STATE();
				cache.vars = DEFAULT_ALL_VARS;
			})
			.then(function () {
				cache.loading = false;
				cache.loaded = true;
				// Rafraîchissement demandé pendant la requête : on le rejoue maintenant. Le
				// drapeau est remis à zéro AVANT le rappel, sinon deux demandes concurrentes
				// s'entretiendraient indéfiniment.
				if (cache.pendingForce) {
					cache.pendingForce = false;
					// La file d'attente reste en place : elle sera vidée au terme de CE
					// chargement-là, quand la donnée sera enfin celle de la bonne page.
					load(true);
					return;
				}
				notifyReady();
			});
	}

	/**
	 * Rouvre le menu dès que la donnée est arrivée.
	 *
	 * `onMenu` est SYNCHRONE : au premier clic après une navigation, le chargement n'est pas
	 * terminé et le menu ne peut afficher que « Chargement… ». Le second clic tombe juste — c'est
	 * le symptôme « premier clic vide, deuxième bon », dans les deux sens : variables absentes sur
	 * une page qui en a, variables encore là sur une page qui vient de les perdre.
	 *
	 * CK4 rappelle `onMenu` à CHAQUE ouverture et reconstruit le panneau. Refermer puis rouvrir
	 * suffit donc à le repeupler. On passe par le bouton lui-même — `click()` bascule l'état du
	 * menubutton — plutôt que par les internes du panneau.
	 *
	 * Un seul réarmement en vol PAR ÉDITEUR, et rien ne se produit si le contributeur a refermé le
	 * menu entre-temps : rouvrir un menu qu'il vient de fermer serait pire que le premier défaut.
	 */
	function reopenWhenReady(editor, buttonName) {
		var ui = uiState(editor);
		if (ui.reopening) return;
		ui.reopening = true;

		readyWaiters.push(function () {
			ui.reopening = false;
			// Le contributeur a refermé entre-temps : rouvrir un menu qu'il vient de fermer
			// serait plus gênant que le défaut d'origine.
			if (!ui.menuIsOpen) return;
			try {
				var button = editor.ui.get(buttonName);
				if (!button || typeof button.click !== "function") return;

				button.click(editor); // ferme

				/*
				 * Réouverture au tour de boucle SUIVANT, et non dans la foulée. CK4 remet l'état
				 * du menubutton à zéro pendant la fermeture ; enchaîner les deux appels dans la
				 * même pile risque de faire lire un état encore « ouvert » au second, qui
				 * refermerait au lieu de rouvrir — le menu resterait clos.
				 */
				setTimeout(function () {
					try {
						button.click(editor); // rouvre -> onMenu rejoué, cache chaud
					} catch {
						/* le contributeur recliquera */
					}
				}, 0);
			} catch {
				/* API du bouton différente : le contributeur recliquera. */
			}
		});
	}

	// Départ immédiat : la requête a tout le temps d'initialisation de l'éditeur pour aboutir
	// avant le premier clic sur le bouton.
	load();

	/* ------------------------------------------------------------------ *
	 * UI
	 * ------------------------------------------------------------------ */

	/* ------------------------------------------------------------------ *
	 * Dimensions du panneau — largeur plancher, hauteur plafonnée
	 * ------------------------------------------------------------------ */

	/**
	 * Largeur minimale du panneau. Nos libellés sont longs — « TAEA — Taux Annuel Effectif de
	 * l'Assurance (%) » — et CK4 dimensionne sur le contenu : sans plancher, la largeur varie
	 * d'une ouverture à l'autre selon les variables activées, et les libellés se replient.
	 */
	var MIN_PANEL_WIDTH = 400;

	/**
	 * Nombre d'entrées visibles sans défilement. Au-delà, le menu déborderait de la fenêtre de
	 * Content Editor : le contributeur ne verrait plus les dernières variables, et sur un écran
	 * court il ne verrait même plus le champ qu'il édite.
	 */
	var MAX_VISIBLE_ITEMS = 10;

	/**
	 * Dimensionne le panneau de NOTRE menu, une fois CK4 l'ayant affiché.
	 *
	 * CK4 rend son menu dans l'IFRAME d'un panneau flottant : le conteneur
	 * `div.cke_menu_panel` vit dans le document principal, le `div.cke_menu` dans l'iframe. Les
	 * deux niveaux doivent être traités — élargir le conteneur sans élargir l'iframe ne donne
	 * qu'un cadre vide à droite, et faire défiler le contenu sans rabattre la hauteur de l'iframe
	 * ne sert à rien, CK4 la dimensionnant sur le contenu.
	 *
	 * <b>Pourquoi pas une simple règle CSS sur `.cke_menu_panel`.</b> Cette classe est aussi celle
	 * du MENU CONTEXTUEL (plugin `contextmenu`, même `className`) : une règle globale élargirait
	 * le clic droit de tout l'éditeur. On agit donc sur l'instance, pas sur la classe.
	 *
	 * `menuShow` est global à l'éditeur — menu contextuel et autres menubuttons compris. Le drapeau
	 * `opening` posé par `onMenu` juste avant l'affichage restreint l'effet à notre seul menu ;
	 * inspecter le contenu du panneau pour le reconnaître serait plus fragile.
	 *
	 * Entièrement défensif : au moindre écart d'API, on ne touche à rien et le menu s'affiche
	 * comme avant. Une contrainte de confort ne doit jamais casser un éditeur.
	 */
	function sizePanel(panel) {
		try {
			var wrapper = panel && panel.element;
			var iframe = wrapper && wrapper.findOne && wrapper.findOne("iframe.cke_panel_frame");
			if (!iframe || !iframe.$ || !iframe.$.contentWindow) return;

			// Largeur : plancher sur le conteneur, l'iframe suit. Inconditionnel — nos libellés
			// sont longs même quand peu de variables sont activées.
			wrapper.setStyle("minWidth", MIN_PANEL_WIDTH + "px");
			iframe.setStyle("width", "100%");

			var doc = iframe.$.contentWindow.document;
			if (!doc) return;

			/*
			 * LE PANNEAU EST RÉUTILISÉ D'UN MENU À L'AUTRE.
			 *
			 * CK4 garde UN panneau par éditeur et y empile un bloc `.cke_menu` par menu déclaré.
			 * Avec deux boutons, le document en contient donc deux, dont un seul est affiché.
			 * `querySelector` renvoyant le PREMIER, on dimensionnait le bloc du menu précédent :
			 * le menu visible héritait d'une iframe taillée pour l'autre, sans défilement propre —
			 * d'où une liste tronquée surmontant une zone blanche.
			 *
			 * On remet donc TOUS les blocs à zéro, puis on ne dimensionne que celui qui s'affiche.
			 */
			var blocks = doc.querySelectorAll(".cke_menu");
			for (var i = 0; i < blocks.length; i++) {
				blocks[i].style.maxHeight = "";
				blocks[i].style.overflowY = "";
			}
			// `setStyle(name, "")` plutôt que `removeStyle` : même effet, et disponible sur toutes
			// les versions de CK4 — le reste du fichier n'utilise déjà que setStyle.
			iframe.setStyle("height", "");

			var menu = visibleMenu(blocks);
			if (!menu) return;

			var items = menu.querySelectorAll(".cke_menuitem");
			if (items.length <= MAX_VISIBLE_ITEMS) return;

			// Hauteur mesurée sur une entrée réelle : elle dépend du thème, la coder en dur
			// produirait une coupe au milieu d'une ligne au premier changement de skin.
			var itemHeight = items[0].offsetHeight;
			if (!itemHeight) return;
			var maxHeight = itemHeight * MAX_VISIBLE_ITEMS;

			menu.style.maxHeight = maxHeight + "px";
			menu.style.overflowY = "auto";
			if (doc.body) doc.body.style.overflowY = "auto";
			iframe.setStyle("height", maxHeight + "px");
		} catch {
			/* API du panneau différente : on laisse le menu tel quel. */
		}
	}

	/**
	 * Bloc de menu réellement affiché parmi ceux du panneau.
	 *
	 * Un bloc masqué a une hauteur nulle : c'est le test le plus robuste, car il ne dépend
	 * d'aucune classe CSS interne de CK4. On parcourt à rebours pour privilégier le dernier
	 * ouvert si plusieurs se mesuraient — un panneau en transition, par exemple.
	 */
	function visibleMenu(blocks) {
		for (var i = blocks.length - 1; i >= 0; i--) {
			if (blocks[i].offsetHeight > 0) return blocks[i];
		}
		// Aucun bloc mesurable — panneau encore en cours d'affichage. Le dernier déclaré est le
		// candidat le plus probable ; au pire le dimensionnement est sans effet.
		return blocks.length ? blocks[blocks.length - 1] : null;
	}

	var NOTICE = {
		"no-params":
			"Aucune simulation sur cette page — Options de la page › Simulation (exemple représentatif)",
		"no-simulation":
			"Type de crédit non renseigné dans les Options de la page — ces variables " +
			"restent indisponibles",
		"no-campaign":
			"Provenance non renseignée dans les Options de la page — les bornes de l’offre " +
			"en dépendent",
		"empty": "Aucune variable activée dans la configuration du site",
		"loading": "Chargement des variables…",
	};

	/**
	 * Motif a afficher a la place des jetons, ou `null` quand le menu doit les proposer.
	 *
	 * Extraite de `onMenu` pour etre TESTABLE : c'est le seul aiguillage du plugin qui decide
	 * si un contributeur peut inserer une variable, et deux regressions y sont deja passees
	 * inapercues faute de test.
	 *
	 * Trois cas, dans cet ordre :
	 *
	 *  1. `no-params` — la page n'a pas le mixin. Refus COMMUN aux deux familles : il n'y a
	 *     rien a completer champ par champ, c'est l'option entiere qui manque.
	 *
	 *  2. `unknown` — ON NE SAIT PAS, et l'ignorance ne se refuse pas au contributeur. On y
	 *     tombe hors route jContent (apercu, editeur autonome, harnais de test) ou quand la
	 *     requete de page echoue. La liste de repli est chargee dans les deux cas : la refuser
	 *     rendrait le menu muet sur une page qui n'a peut-etre aucun probleme. Le rendu reste
	 *     protege — un jeton non resolvable ressort tel quel et l'audit le signale ; proposer
	 *     un jeton n'affirme rien sur sa resolution.
	 *
	 *  3. Sinon, chaque bouton ne juge QUE sa famille, pour que le motif nomme le champ exact
	 *     a completer au lieu d'un message commun aux deux.
	 */
	function unavailableReason(state, config) {
		if (!state || state.state === "no-params") return NOTICE["no-params"];
		if (state.state === "unknown") return null;
		return config.available(state) ? null : config.unavailableNotice;
	}

	/*
	 * UI_MENUBUTTON et NON richcombo — même choix que sofincoPageAnchors.
	 *
	 * Un richcombo doit être peuplé de façon SYNCHRONE dans son `init` : ses items sont figés
	 * au moment du `commit()`. Nos variables arrivent d'un appel GraphQL, donc après. `onMenu`
	 * d'un menubutton est au contraire rappelé à CHAQUE ouverture : il lit le cache rempli
	 * entre-temps. C'est le mécanisme prévu par CK4 pour un contenu dynamique.
	 */
	/*
	 * SURFACE DE TEST — inerte en production.
	 *
	 * Ce fichier est charge par CKEditor comme un script classique : pas de bundler, pas de
	 * modules. Ses helpers vivent dans une IIFE et ne sont donc atteignables d'AUCUNE facon
	 * depuis un test — c'est precisement ce qui a laisse passer deux regressions du menu.
	 *
	 * On expose les fonctions PURES — jamais l'etat, jamais l'UI — derriere un drapeau que
	 * seul le harnais de test pose avant d'evaluer le fichier. En production le drapeau est
	 * absent, la branche ne s'execute pas, et rien n'est publie sur `window`.
	 *
	 * Meme parti pris que `sofincoPageAnchors` : on evalue l'artefact REELLEMENT livre, pas
	 * une copie qui deriverait.
	 */
	if (typeof window !== "undefined" && window.__SOFINCO_TEST__) {
		window.__sofincoSimulatorVars = {
			pickPage: pickPage,
			UNKNOWN_STATE: UNKNOWN_STATE,
			readPageState: readPageState,
			encodeLabel: encodeLabel,
			readVars: readVars,
			unavailableReason: unavailableReason,
			contextFromRoute: contextFromRoute,
			NOTICE: NOTICE,
			DEFAULT_ALL_VARS: DEFAULT_ALL_VARS,
			FAMILY_SIMULATION: FAMILY_SIMULATION,
			FAMILY_CAMPAIGN: FAMILY_CAMPAIGN,
		};
	}

	/*
	 * Hors navigateur CKEditor — c'est-a-dire sous test — il n'y a aucun editeur a equiper.
	 * La garde evite au harnais d'avoir a simuler tout CKEDITOR pour atteindre des fonctions
	 * pures.
	 */
	if (typeof CKEDITOR === "undefined") return;

	CKEDITOR.plugins.add("sofincoSimulatorVars", {
		requires: "menubutton",

		init: function (editor) {
			// `this.path` = URL du dossier du plugin, résolue par CKEDITOR.plugins.addExternal.
			load();

			/*
			 * Reprendre le focus signale presque toujours un retour depuis autre chose — par
			 * exemple les Options de la page, où le contributeur vient justement d'activer la
			 * simulation. On rafraîchit donc à ce moment-là : le menu sera à jour dès
			 * l'ouverture suivante, sans attente visible.
			 */
			editor.on("focus", function () {
				load(true);
			});

			/*
			 * `init` s'exécute pendant la construction de l'éditeur, alors que la route jContent
			 * peut ne pas être encore stabilisée — le chargement partirait sur le chemin de la
			 * page PRÉCÉDENTE. `instanceReady` marque le moment où l'éditeur est réellement
			 * utilisable ; c'est là que `location.href` est fiable. Sans ce déclenchement, le
			 * premier clic sur le bouton tombait systématiquement sur un cache invalidé.
			 */
			editor.on("instanceReady", function () {
				load(true);
			});

			// Dimensionne le panneau juste après son affichage — voir `sizePanel`.
			editor.on("menuShow", function (evt) {
				var ui = uiState(editor);
				if (!ui.opening) return;
				ui.opening = false;
				ui.menuIsOpen = true;
				sizePanel(evt.data && evt.data[0]);
			});

			// Fermeture d'un panneau, quel qu'il soit : on cesse de considérer le nôtre ouvert.
			// Conservateur — au pire on renonce à une réouverture automatique.
			editor.on("panelHide", function () {
				uiState(editor).menuIsOpen = false;
			});

			editor.addMenuGroup("sofincoSimulatorVars", 10);
			editor.addMenuGroup("sofincoCampaignVars", 11);

			/*
			 * DEUX BOUTONS, UN PAR FAMILLE.
			 *
			 * Les deux familles ne se corrigent pas au même endroit : une variable de simulation
			 * dépend du type de crédit de la page, une variable de campagne de sa provenance. Un
			 * menu unique mélangeait vingt-six entrées dont la moitié pouvait être indisponible
			 * sans que le contributeur comprenne pourquoi.
			 *
			 * Séparer les boutons rend l'état LISIBLE : celui dont la famille n'est pas résolvable
			 * affiche son propre motif, l'autre reste utilisable. C'est aussi ce qui permet à une
			 * barre d'outils de n'exposer qu'une des deux (cf. ckeditor_config.js).
			 */
			addVariablesButton(editor, {
				name: "sofincoSimulatorVars",
				family: FAMILY_SIMULATION,
				icon: this.path + "icons/sofincosimulatorvars.svg",
				label: "Variables simulateur",
				title: "Insérer une variable calculée par le simulateur",
				group: "sofincoSimulatorVars",
				available: function (state) {
					return state.simulation;
				},
				unavailableNotice: NOTICE["no-simulation"],
			});

			addVariablesButton(editor, {
				name: "sofincoCampaignVars",
				family: FAMILY_CAMPAIGN,
				icon: this.path + "icons/sofincocampaignvars.svg",
				label: "Variables campagne",
				title: "Insérer une borne de l'offre (montants, durées, taux)",
				group: "sofincoCampaignVars",
				available: function (state) {
					return state.campaign;
				},
				unavailableNotice: NOTICE["no-campaign"],
			});
		},
	});

	/**
	 * Déclare un menubutton pour UNE famille de variables.
	 *
	 * Fabrique plutôt que deux blocs jumeaux : tout le comportement délicat — chargement paresseux,
	 * réouverture au terme du chargement, dimensionnement du panneau, drapeau `opening` — est
	 * identique d'une famille à l'autre. Le dupliquer garantirait qu'une correction n'atteigne
	 * qu'un seul des deux boutons.
	 */
	function addVariablesButton(editor, config) {
		editor.ui.add(config.name, CKEDITOR.UI_MENUBUTTON, {
			label: config.label,
			title: config.title,
			// Un menubutton s'affiche par son ICÔNE, `label` n'étant que l'infobulle.
			icon: config.icon,
			modes: { wysiwyg: 1 },
			// Pas de propriété `toolbar` : le bouton n'apparaît QUE là où une toolbar le liste
			// explicitement (cf. ckeditor_config.js). Avec elle, CK4 le place tout seul, y
			// compris dans les barres minimalistes qui n'en veulent pas.

			onMenu: function () {
				var states = {};
				var items = {};

				// `menuShow` est global à l'éditeur : ce drapeau, posé juste avant l'affichage,
				// dit à l'écouteur que le panneau qui s'ouvre est le nôtre.
				uiState(editor).opening = true;

				// Un item désactivé porteur du motif, plutôt qu'un panneau vide : ce dernier se
				// lit comme un dysfonctionnement, pas comme un réglage manquant.
				function notice(message) {
					// Nom PREFIXE par le bouton : `addMenuItems` est un `Map.put` sur un registre
					// global a l'editeur. Sans prefixe, les deux menus ecrasent en permanence
					// l'entree de l'autre — group compris.
					var noticeName = config.name + "_notice";
					items[noticeName] = {
						label: message,
						group: config.group,
						order: 0,
						onClick: function () {},
					};
					editor.addMenuItems(items);
					states[noticeName] = CKEDITOR.TRISTATE_DISABLED;
					return states;
				}

				load();

				if (!cache.loaded) {
					// Le chargement vient d'être lancé : on rouvrira le menu à son terme, pour que
					// le contributeur n'ait pas à recliquer.
					reopenWhenReady(editor, config.name);
					return notice(NOTICE.loading);
				}
				var blocked = unavailableReason(cache.pageState, config);
				if (blocked) return notice(blocked);

				var available = cache.vars.filter(function (variable) {
					return variable.family === config.family;
				});
				if (!available.length) return notice(NOTICE.empty);

				available.forEach(function (variable, index) {
					// Meme raison que pour le motif : un espace de noms par bouton. Sans lui,
					// des `sofincoVar11..14` de la famille la plus longue survivaient dans le
					// registre apres l'ouverture de l'autre menu.
					var name = config.name + "_" + index;
					items[name] = {
						label: variable.label,
						group: config.group,
						order: index,
						onClick: function () {
							editor.focus();
							editor.fire("saveSnapshot");
							// `insertText` et non `insertHtml` : le jeton doit rester du texte
							// brut, c'est le rendu serveur qui le substitue.
							editor.insertText("{{" + variable.token + "}}");
							editor.fire("saveSnapshot");
						},
					};
					states[name] = CKEDITOR.TRISTATE_OFF;
				});

				editor.addMenuItems(items);
				return states;
			},
		});
	}
})();
