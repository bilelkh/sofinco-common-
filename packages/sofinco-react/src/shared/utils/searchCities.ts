import type { AutocompleteOption } from "@shared/ui/Autocomplete/Autocomplete.type";

/** Point d'entrée par défaut du référentiel des communes. */
export const CITIES_ENDPOINT = "https://api-ref.sofinco.fr/nomenclatures/v1/cities";

/** Une commune du référentiel. */
export interface City {
	/**
	 * Code postal. **Non unique** : quatorze communes partagent 62128. Il ne
	 * suffit donc pas à désigner un choix — c'est `label` qui l'identifie.
	 */
	code: string;
	/** Nom de la commune, sans le code — « BOYELLES ». */
	name: string;
	/** Libellé complet du référentiel — « BOYELLES (62128) ». Unique. */
	label: string;
	/** Graphie alternative quand le référentiel en donne une (« SAINT » / « ST »). */
	alternativeLabel?: string;
}

/** Forme brute renvoyée par le référentiel. */
interface CityPayload {
	label?: string;
	alternativeLabel?: string | null;
	code?: string;
}

/**
 * Aligne la saisie sur ce que le référentiel sait apparier. Il compare des
 * chaînes brutes, sans normalisation de son côté :
 *
 * - il est **sensible aux accents** — « ORLÉANS » ne renvoie rien, « orleans »
 *   renvoie les deux communes ;
 * - il ne connaît **que l'espace** comme séparateur — « saint-denis » ne renvoie
 *   rien, « saint denis » renvoie vingt communes.
 *
 * Il est en revanche insensible à la casse, et apparie de lui-même les graphies
 * alternatives (« SAINT DENIS LES BOURG » trouve « ST DENIS LES BOURG »).
 */
export function normalizeCityQuery(raw: string): string {
	return (
		raw
			// Décompose puis retire les diacritiques : « É » → « E » + accent → « E ».
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			// Traits d'union, apostrophes (droites comme typographiques) et points
			// sont autant de séparateurs que le référentiel écrit en espaces.
			.replace(/[-'’._/]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
	);
}

/** Sépare « BOYELLES (62128) » en nom de commune et code. */
function splitLabel(label: string, code: string): string {
	const withoutCode = label.replace(/\s*\(\s*\d{4,5}\s*\)\s*$/, "").trim();
	// Un libellé qui ne suivrait pas la convention est rendu tel quel plutôt que
	// vidé : mieux vaut afficher trop que rien.
	return withoutCode || label.replace(code, "").trim() || label;
}

export interface SearchCitiesOptions {
	/** Surcharge du point d'entrée — recette, bouchon de test, proxy Jahia. */
	endpoint?: string;
	/** Annulation, transmise par `Autocomplete` à chaque nouvelle frappe. */
	signal?: AbortSignal;
}

/**
 * Interroge le référentiel des communes.
 *
 * Le référentiel plafonne lui-même à vingt réponses et **répond 400 sur un `q`
 * vide** : une saisie vide n'est donc pas envoyée, elle retourne une liste vide.
 *
 * Les erreurs ne sont pas avalées : une panne réseau ou un statut non-2xx
 * remonte à l'appelant, à qui il revient de l'afficher — `Autocomplete` en fait
 * sa ligne d'état « recherche indisponible ».
 */
export async function searchCities(
	query: string,
	{ endpoint = CITIES_ENDPOINT, signal }: SearchCitiesOptions = {},
): Promise<City[]> {
	const q = normalizeCityQuery(query);
	if (q === "") return [];

	const response = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, {
		headers: { Accept: "application/json" },
		signal,
	});

	if (!response.ok) {
		console.error(`Référentiel des communes : réponse ${response}`);
		throw new Error(`Référentiel des communes : réponse ${response.status}`);
	}

	const payload: unknown = await response.json();
	// Le référentiel répond un objet d'erreur, et non un tableau, sur requête
	// invalide : sans ce garde-fou un `.map` casserait sur un 200 inattendu.
	if (!Array.isArray(payload)) return [];

	return (payload as CityPayload[])
		.filter((city): city is CityPayload & { label: string; code: string } =>
			Boolean(city?.label && city?.code),
		)
		.map((city) => ({
			code: city.code,
			name: splitLabel(city.label, city.code),
			label: city.label,
			...(city.alternativeLabel ? { alternativeLabel: city.alternativeLabel } : {}),
		}));
}

/**
 * `searchCities` habillé pour `Autocomplete`.
 *
 * La valeur retenue est le **code postal**, le libellé affiché la commune. Comme
 * un code désigne jusqu'à quatorze communes, `meta` transporte les deux : c'est
 * par là qu'un formulaire récupère la commune réellement choisie.
 */
export async function searchCityOptions(
	query: string,
	options: SearchCitiesOptions = {},
): Promise<AutocompleteOption[]> {
	const cities = await searchCities(query, options);

	return cities.map((city) => ({
		value: city.code,
		label: city.label,
		meta: { code: city.code, city: city.name },
	}));
}
