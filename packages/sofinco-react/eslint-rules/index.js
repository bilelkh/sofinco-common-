/**
 * Plugin ESLint local du projet. Une seule règle pour l'instant : le garde-fou des renvois
 * de notes de bas de page (cf. `require-footnote-text.js` pour le pourquoi).
 */
import requireFootnoteText from "./require-footnote-text.js";

export default {
	meta: { name: "eslint-plugin-sofinco", version: "1.0.0" },
	rules: {
		"require-footnote-text": requireFootnoteText,
	},
};
