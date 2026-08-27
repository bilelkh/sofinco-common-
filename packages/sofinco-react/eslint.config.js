import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintReact from "@eslint-react/eslint-plugin";
import storybook from "eslint-plugin-storybook";
import sofinco from "./eslint-rules/index.js";

/**
 * Configuration ESLint « flat » du design system.
 *
 * L'INTENTION : le lint n'est pas là pour discuter du style — le formatage n'est pas de son
 * ressort — mais pour verrouiller ce qui casse SILENCIEUSEMENT. D'où trois couches, de la
 * plus générique à la plus locale :
 *
 *   1. `js` + `typescript-eslint` : les fautes que le compilateur ne voit pas (variable
 *      inutilisée, `case` qui traverse, promesse jetée).
 *   2. `react-hooks` : les règles des hooks, dont la violation ne se manifeste qu'au
 *      runtime, souvent au deuxième rendu seulement.
 *   3. `sofinco/require-footnote-text` : le garde-fou maison (cf. `eslint-rules/`), qui
 *      transforme en échec de lint le défaut de renvoi de note remonté cinq fois en recette.
 *
 * Les règles à correction NON évidente sont en `warn` : une règle qui bloque sans dire quoi
 * faire finit désactivée en masse, ce qui coûte plus que ce qu'elle rapporte.
 */
export default tseslint.config(
	{
		/*
		 * Artefacts de build et dépendances. `storybook-static/` et `dist/` contiennent du
		 * code généré et minifié : le linter y passerait des secondes pour rien.
		 */
		ignores: ["node_modules/**", "dist/**", "coverage/**", "storybook-static/**"],
	},

	// ── 1. Socle JS/TS, sur tout ce que le dépôt contient ────────────────────────────────
	js.configs.recommended,
	tseslint.configs.recommended,

	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: { ...globals.browser, ...globals.node },
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		rules: {
			/*
			 * `_foo` est la convention explicite pour « je dois nommer ce paramètre mais je ne
			 * m'en sers pas » — typiquement le `_event` d'un gestionnaire, ou une destructuration
			 * qui écarte une clé (`const { onClick: _onClick, ...rest } = props`). Sans cette
			 * dérogation, la seule issue est un commentaire de désactivation à chaque occurrence.
			 */
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],

			/*
			 * `any` est signalé sans bloquer : le code existant en contient dans les zones de
			 * frontière (props Jahia, `never` des tests), et un `error` ici rendrait le lint
			 * rouge dès l'installation — le meilleur moyen de ne jamais le lancer.
			 */
			"@typescript-eslint/no-explicit-any": "warn",

			/*
			 * Le composant est consommé en Island Jahia, donc rendu côté serveur par GraalVM :
			 * un `console.log` oublié s'y écrit dans les journaux de production à chaque rendu
			 * de page. `warn`/`error` restent permis, ce sont de vrais signaux.
			 */
			"no-console": ["warn", { allow: ["warn", "error"] }],

			/*
			 * `==` avec `null` est la forme idiomatique pour « null ou undefined » et reste
			 * autorisée ; toutes les autres comparaisons lâches sont des pièges de coercition.
			 */
			eqeqeq: ["error", "always", { null: "ignore" }],

			/*
			 * `alert`/`confirm`/`prompt` bloquent le fil principal et n'ont aucune place dans un
			 * composant de DS. Le dépôt s'appuyait déjà dessus (dérogation en ligne dans
			 * `Select.stories.tsx`, où la boîte de dialogue EST la démonstration).
			 */
			"no-alert": "error",

			// Un `case` qui traverse sans `break` est presque toujours un oubli.
			"no-fallthrough": "error",

			/*
			 * Une promesse non attendue échoue en silence : le rejet n'apparaît nulle part et
			 * l'ordre d'exécution devient non déterministe. `no-misused-promises`, son pendant,
			 * exige l'analyse de types — cf. la note en fin de fichier.
			 */
			"require-atomic-updates": "warn",
		},
	},

	// ── 2. React : les règles dont la violation ne se voit qu'au runtime ─────────────────
	{
		files: ["src/**/*.{ts,tsx}"],
		/*
		 * `@eslint-react` couvre ce que `react-hooks` ne regarde pas : clé JSX avalée par un
		 * spread, `useId`/`useRef` mal nommés, `set` d'état appelé directement dans un effet.
		 * Le dépôt s'y référait déjà (cf. la dérogation `@eslint-react/purity` dans
		 * `StarRating`) sans que le paquet soit installé — le préréglage `recommended` remet
		 * cette référence sur ses pieds.
		 */
		extends: [eslintReact.configs.recommended],
		plugins: { "react-hooks": reactHooks },
		rules: {
			/*
			 * Seules les deux règles historiques sont activées. Le préréglage `recommended` de
			 * la v7 embarque en plus l'analyse du React Compiler (~25 règles : `purity`,
			 * `immutability`, `set-state-in-effect`…) — utile, mais c'est un chantier en soi sur
			 * une base existante, et pas ce qu'on veut découvrir en installant le lint.
			 */
			"react-hooks/rules-of-hooks": "error",

			/*
			 * En `warn` volontairement : une dépendance manquante est parfois délibérée (effet
			 * de montage unique), et le correctif automatique de la règle peut changer le
			 * comportement. Elle signale, le développeur tranche.
			 */
			"react-hooks/exhaustive-deps": "warn",

			/*
			 * DÉSACTIVÉE, et c'est un choix documenté : ce DS rend du rich-text de CMS, donc
			 * `dangerouslySetInnerHTML` est un point de passage OBLIGÉ (~13 emplacements) et non
			 * un écart. Le garde-fou réel n'est pas cette règle mais `sanitizeHtml()`
			 * (`@utils/sanitizeHtml`, DOMPurify), par lequel passe chaque injection — la seule
			 * exception étant le script d'amorçage SmartTribune dans `Faq`, que DOMPurify
			 * détruirait. Laissée active, elle imposerait treize dérogations en ligne, ce qui
			 * masquerait justement le jour où une injection oublierait le sanitiseur.
			 */
			"@eslint-react/dom/no-dangerously-set-innerhtml": "off",

			/*
			 * En `warn` : appeler un `set` d'état dans un effet est parfois la seule forme
			 * possible (synchronisation d'une recherche asynchrone, remise à zéro sur
			 * changement de props). Chaque occurrence restante porte une justification en
			 * ligne ; la règle sert de rappel, pas de barrage.
			 */
			"@eslint-react/hooks-extra/no-direct-set-state-in-use-effect": "warn",
		},
	},

	// ── 3. Le garde-fou maison des renvois de notes ──────────────────────────────────────
	{
		files: ["src/**/*.tsx"],
		plugins: { sofinco },
		rules: {
			"sofinco/require-footnote-text": [
				"error",
				{
					/*
					 * Les primitives qui appliquent elles-mêmes `FootnoteText` À LEURS ENFANTS :
					 * `<Title>{title}</Title>` est donc correct tel quel. `Badge`, `Cta`, `Link`,
					 * `Pill`, `AlertBand`, `Modal` et `SectionHeading` enveloppent aussi, mais des
					 * PROPS — or la règle n'inspecte que la position enfant, ils n'ont rien à faire
					 * ici. Une primitive ajoutée demain qui enveloppe ses enfants doit être ajoutée
					 * à cette liste, sinon ses appelants seront signalés à tort.
					 */
					wrappingComponents: ["Title", "Subtitle", "Tag"],

					/*
					 * Noms que l'heuristique attrape alors qu'ils ne portent aucun texte
					 * contributeur : `srLabel` est le libellé lecteur d'écran de la note
					 * elle-même, construit par `footnoteLabel()` — l'envelopper serait circulaire.
					 */
					ignoreNames: ["srLabel"],
				},
			],
		},
	},

	// ── 4. Storybook ────────────────────────────────────────────────────────────────────
	...storybook.configs["flat/recommended"],

	{
		files: ["src/**/*.stories.{ts,tsx}"],
		rules: {
			/*
			 * Les stories sont des FIXTURES : leur texte est écrit dans le fichier, il ne vient
			 * pas d'un contributeur et ne peut donc pas porter de renvoi de note. Ce sont les
			 * composants qu'elles montent qui sont couverts.
			 */
			"sofinco/require-footnote-text": "off",

			/*
			 * Une story est un banc de démonstration : journaliser l'événement reçu est
			 * précisément ce qu'on veut montrer dans le panneau Actions.
			 */
			"no-console": "off",
		},
	},

	// ── 5. Tests ────────────────────────────────────────────────────────────────────────
	{
		files: ["src/**/*.test.{ts,tsx}"],
		rules: {
			/*
			 * Les tests montent volontairement des formes incorrectes (c'est le propos du test
			 * de la règle elle-même) et transtypent en `never` pour raccorder les types d'ESLint
			 * à ceux de `typescript-eslint`.
			 */
			"sofinco/require-footnote-text": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"no-console": "off",
		},
	},

	// ── 6. Fichiers d'outillage : Node, hors `src` ───────────────────────────────────────
	{
		files: ["*.{js,ts,mjs}", ".storybook/**/*.ts", "eslint-rules/**/*.js"],
		languageOptions: {
			globals: globals.node,
		},
		rules: {
			"no-console": "off",
		},
	},
);

/*
 * PISTE D'ÉVOLUTION — `tseslint.configs.recommendedTypeChecked`.
 *
 * Le préréglage typé attrape ce que celui-ci ne peut pas voir : promesse non attendue
 * (`no-floating-promises`), gestionnaire d'événement `async` mal placé
 * (`no-misused-promises`), comparaison toujours vraie. Il exige `projectService: true` et
 * coûte un `tsc` complet à chaque exécution — d'où le choix de ne pas l'imposer d'entrée.
 */
