/**
 * Aplatissement d'un champ richtext CKEditor en texte brut, pour les valeurs
 * textuelles du JSON-LD (`acceptedAnswer.text`, `VideoObject.transcript`).
 *
 * Google accepte du HTML simple dans une réponse de FAQ, mais exige surtout que le
 * balisage corresponde au contenu VISIBLE de la page. Le texte brut satisfait cette
 * contrainte dans tous les cas, sans dépendre de ce que le contributeur a laissé
 * passer dans l'éditeur ni de ce qui survit à l'échappement du `<script>` inline.
 */

/**
 * Entités HTML produites par CKEditor sur du contenu français. Liste volontairement
 * courte : les entités numériques sont traitées séparément, et tout ce qui n'est ni
 * l'une ni l'autre est déjà en UTF-8 dans le JCR.
 *
 * `&amp;` est décodé EN DERNIER (cf. `decodeEntities`), sans quoi un `&amp;lt;`
 * authentique deviendrait `<`.
 */
const NAMED_ENTITIES: Record<string, string> = {
	"&nbsp;": " ",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&apos;": "'",
	"&rsquo;": "’",
	"&lsquo;": "‘",
	"&ldquo;": "“",
	"&rdquo;": "”",
	"&hellip;": "…",
	"&eacute;": "é",
	"&egrave;": "è",
	"&ecirc;": "ê",
	"&agrave;": "à",
	"&ccedil;": "ç",
	"&ugrave;": "ù",
	"&deg;": "°",
	"&euro;": "€",
};

const decodeEntities = (value: string): string => {
	let out = value;
	for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
		out = out.split(entity).join(char);
	}
	// Entités numériques décimales (`&#39;`) et hexadécimales (`&#x27;`).
	out = out.replace(/&#(x[0-9a-f]+|\d+);/gi, (match, code: string) => {
		const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
		return Number.isFinite(point) && point > 0 ? String.fromCodePoint(point) : match;
	});
	// `&amp;` en dernier, pour ne pas réintroduire d'entité décodable.
	return out.split("&amp;").join("&");
};

/**
 * Balises de bloc : leur frontière est une séparation de mots dans le rendu visuel.
 * Sans cette étape, `<li>Auto</li><li>Moto</li>` produirait `AutoMoto`.
 */
const BLOCK_BOUNDARY = /<\/?(?:p|div|li|ul|ol|br|h[1-6]|tr|td|th|table|blockquote)\b[^>]*>/gi;

/**
 * Convertit un fragment HTML en une seule ligne de texte brut, espaces normalisés.
 * Retourne `""` pour une valeur vide ou ne contenant que du balisage.
 */
export const toPlainText = (html: string): string => {
	if (!html) return "";
	return decodeEntities(html.replace(BLOCK_BOUNDARY, " ").replace(/<[^>]*>/g, ""))
		.replace(/\s+/g, " ")
		.trim();
};
