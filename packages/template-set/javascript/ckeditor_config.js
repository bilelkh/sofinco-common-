// @ts-nocheck
/*
 * Template-set CKEditor configuration for Sofinco.
 *
 *
 * NE PAS auto-loadé par convention — DOIT être référencé EXPLICITEMENT
 * dans chaque CND ou via override Content Editor Form :
 *
 *   1. Via CND :
 *      content (string, richtext[ckeditor.toolbar='Full',
 *                ckeditor.customConfig='$context/modules/sofinco-template/javascript/ckeditor_config.js']) i18n
 *
 *   2. Via JSON override (recommandé) :
 *      packages/template-set/settings/content-editor-forms/fieldsets/sofnt_xxx.json
 *      avec selectorOptionsMap.ckeditor.customConfig
 *
 */
/* global CKEDITOR, contextJsParameters */

CKEDITOR.stylesSet.add("sofinco", [
	{ name: "Title H1", element: "h1" },
	{ name: "Title H2", element: "h2" },
	{ name: "Title H3", element: "h3" },
]);

// === Plugins externes ===
// Servis depuis le template-set : ils évoluent au même rythme que les CND qui les
// référencent, et une retouche de toolbar ne redéploie que ce module.
var SOFINCO_PLUGINS_BASE =
	(typeof contextJsParameters !== "undefined" ? contextJsParameters.contextPath : "") +
	"/modules/sofinco-template/javascript/ckeditor/plugins/";

// Liste déroulante « Ancres de la page » : recense les ancres de toute la page JCR,
// sépare les ancres déclarées de celles héritées du contenu, et pose le lien.
CKEDITOR.plugins.addExternal(
	"sofincoPageAnchors",
	SOFINCO_PLUGINS_BASE + "sofincoPageAnchors/",
	"plugin.js",
);

// Liste déroulante « Variables simulateur » : insère les tokens {{taea}}, {{monthlyAmount}}…
// dans les mentions d'assurance de RepresentativeExample.
CKEDITOR.plugins.addExternal(
	"sofincoSimulatorVars",
	SOFINCO_PLUGINS_BASE + "sofincoSimulatorVars/",
	"plugin.js",
);

CKEDITOR.editorConfig = function (config) {
	// === Paste comportement ===
	config.forcePasteAsPlainText = true;
	config.removePlugins = "pastefromword";
	config.extraPlugins = "sofincoPageAnchors,sofincoSimulatorVars";

	// === Preview CSS dans l'éditeur ===
	config.contentsCss = ["/modules/sofinco-template/dist/assets/style.css"];
	config.stylesSet = "sofinco";

	// === Format tags pour le dropdown "Format" ===
	config.format_tags = "p;h1;h2;h3;h4";

	// =================================================================
	//  TAILLES DE TEXTE — dropdown « Taille » (bouton FontSize)
	//
	//  Le bouton pose une CLASSE, pas un `style="font-size:20px"` : les
	//  tailles du DS sont des tokens qui changent au breakpoint
	//  (`--text-xl` vaut 20px partout, `--text-lg` 18px), et une valeur en
	//  dur figerait le texte contributeur hors de ce système — le seul
	//  endroit du site où la typo ne suivrait plus le responsive.
	//
	//  Les classes vivent dans `styles/richtext.css` (feuille GLOBALE, non
	//  hachée par les CSS Modules — une classe saisie par un contributeur ne
	//  peut par construction pas viser un nom haché). `config.contentsCss`
	//  charge déjà cette feuille, donc l'éditeur montre la taille réelle.
	//
	//  `overrides` empêche l'empilement `<span class="rt-l"><span class="rt-s">`
	//  quand le contributeur change deux fois la taille de la même sélection.
	// =================================================================

	config.fontSize_sizes =
		"Normal/rt-text-base;Grand/rt-text-l;Très grand/rt-text-xl;Petit/rt-text-s";

	config.fontSize_style = {
		element: "span",
		attributes: { class: "#(size)" },
		overrides: [{ element: "span", attributes: { class: /^rt-text-/ } }],
	};

	// =================================================================
	//  TOOLBAR "Full" — Toolbar riche générique (presque tous les boutons)
	//  Non référencée par défaut ; disponible pour un futur champ richtext
	//  qui en aurait besoin (ckeditor.toolbar='Full').
	// =================================================================
	//
	//  ⚠️  ATTENTION : Certains boutons (Macros, ACheck, wsc, Scayt, Templates,
	//  Preview, Print) sont des plugins NON installés par défaut. Si CKEditor
	//  affiche un warning console, retire-les de la liste.
	//
	//  Version SÉCURISÉE (recommandée pour démarrer) :

	config.toolbar_Full = [
		{ name: "document", items: ["Source"] },
		{ name: "clipboard", items: ["Cut", "Copy", "Paste", "PasteText", "-", "Undo", "Redo"] },
		{ name: "editing", items: ["Find", "Replace", "SelectAll", "-", "RemoveFormat"] },
		"/",
		{
			name: "basicstyles",
			items: ["Bold", "Italic", "Underline", "Strike", "Superscript", "Subscript"],
		},
		{ name: "colors", items: ["TextColor"] },
		{
			name: "paragraph",
			items: ["NumberedList", "BulletedList", "-", "Outdent", "Indent", "-", "Blockquote"],
		},
		{ name: "align", items: ["JustifyLeft", "JustifyCenter", "JustifyRight", "JustifyBlock"] },
		{ name: "links", items: ["Link", "Unlink", "Anchor"] },
		{
			name: "insert",
			items: [
				"Image",
				"Table",
				"HorizontalRule",
				"SpecialChar",
				"-",
				// Variables de simulation : la substitution vit dans `str()` (src/lib/jcr.ts),
				// donc elle opère sur TOUT champ contributeur. Le bouton est présent sur toutes
				// les barres pour que l'assistance à l'insertion couvre le même périmètre que la
				// résolution — sinon le contributeur devrait deviner les noms et les taper.
				// Le menu s'auto-désactive sur une page sans simulation, cf. le plugin.
				"sofincoSimulatorVars",
				"sofincoCampaignVars",
			],
		},
		"/",
		{ name: "styles", items: ["Styles", "Format"] },
		{ name: "tools", items: ["Maximize", "ShowBlocks"] },
	];

	// =================================================================
	//  TOOLBAR "Simple" — Pour MentionLegalItem (minimaliste)
	// =================================================================

	config.toolbar_Simple = [
		{
			name: "basicstyles",
			items: [
				"Bold",
				"Italic",
				"Underline",
				"-",
				"Subscript",
				"Superscript",
				"RemoveFormat",
				"Link",
				"Unlink",
				"Anchor",
			],
		},
		{
			name: "paragraph",
			items: ["NumberedList", "BulletedList", "-", "Outdent", "Indent", "-", "Blockquote"],
		},
		{
			name: "insert",
			items: ["sofincoSimulatorVars", "sofincoCampaignVars", "sofincoPageAnchors"],
		},
	];

	// =================================================================
	//  TOOLBAR "InsuranceMention" — mentions d'assurance de
	//  RepresentativeExample (insurancePB / CR / RAC, et mention).
	//
	//  Underline + Superscript sont indispensables : c'est la forme
	//  <u>texte<sup>(n)</sup></u> que `manageFooterNote`
	//  (src/lib/footnotes.ts) reconnaît pour fabriquer le renvoi.
	// =================================================================

	config.toolbar_InsuranceMention = [
		{
			name: "basicstyles",
			items: [
				"Bold",
				"Italic",
				"Underline",
				"-",
				"Subscript",
				"Superscript",
				"RemoveFormat",
				"Link",
				"Unlink",
			],
		},
		{
			name: "paragraph",
			items: ["NumberedList", "BulletedList"],
		},
		{
			name: "insert",
			items: ["sofincoSimulatorVars", "sofincoCampaignVars", "sofincoPageAnchors"],
		},
	];

	// =================================================================
	//  TOOLBAR "Description" — barre PAR DÉFAUT des champs descriptifs
	//  (accroche, chapô, texte d'introduction). Premier porteur :
	//  sofnt:productHero.description ; tout nouveau champ de même nature
	//  doit la reprendre plutôt que d'en dériver une variante.
	//
	//  Ce qu'elle donne, et pourquoi c'est ce périmètre :
	//   - mise en forme INLINE seulement (gras, italique, souligné, lien) ;
	//   - dropdown « Taille » — agrandir une partie du texte ;
	//   - Superscript + insertion d'ancres : c'est CE COUPLE qui produit le
	//     renvoi <u>texte<sup>(n)</sup></u> reconnu par `manageFooterNote`,
	//     donc les exposants ⁽¹⁾ vers les mentions légales.
	//
	//  Volontairement SANS listes ni titres, à la différence de `Simple` : un
	//  descriptif est un bloc d'accroche, pas du contenu structuré — une puce
	//  ou un <h2> y casserait la mise en page du composant hôte. Un champ qui
	//  a besoin de structure relève de `Simple` ou `TextBlockContent`.
	//
	//  RAPPEL : tout champ qui l'utilise doit être enregistré dans
	//  `src/lib/footnoteFields.ts` — sinon le bouton d'ancres pose un marqueur
	//  que le rendu ignore en silence. Contrôlé par `footnoteFields.cnd.test.ts`.
	// =================================================================

	config.toolbar_Description = [
		{
			name: "basicstyles",
			items: [
				"Bold",
				"Italic",
				"Underline",
				"-",
				"Subscript",
				"Superscript",
				"RemoveFormat",
				"Link",
				"Unlink",
			],
		},
		{ name: "styles", items: ["FontSize"] },
		{
			name: "insert",
			items: ["sofincoSimulatorVars", "sofincoCampaignVars", "sofincoPageAnchors"],
		},
	];

	// =================================================================
	//  TOOLBAR "TextBlockContent" — Pour SeoBlock (contenu, minimaliste)
	//  Référencée via settings/content-editor-forms/fieldsets/sofnt_seoBlock.json
	// =================================================================

	config.toolbar_TextBlockContent = [
		{ name: "basic", items: ["Bold", "Italic", "Underline"] },
		{ name: "links", items: ["Link", "Unlink"] },
		{ name: "insert", items: ["sofincoSimulatorVars", "sofincoCampaignVars"] },
		{ name: "tools", items: ["RemoveFormat"] },
	];
};

// === DTD override : permettre <div> et <dt>/<dd> dans <dl> ===
CKEDITOR.dtd["dl"] = {
	dt: 1,
	dd: 1,
	div: 1,
};
