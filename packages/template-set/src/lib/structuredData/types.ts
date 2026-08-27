/**
 * Types du JSON-LD émis dans le `<head>`.
 *
 * Volontairement structurels et non nominatifs (pas d'interface `Organization`,
 * `Article`, ...) : schema.org compte des centaines de propriétés facultatives et
 * une modélisation nominale devrait être maintenue à chaque ajout de champ, pour
 * un gain nul — les builders sont déjà couverts par leurs tests, qui vérifient la
 * FORME réellement produite.
 *
 * La seule garantie utile ici est la **sérialisabilité** : un bean Java issu de
 * GraalVM ne satisfait pas `JsonLdValue`, ce qui interdit à la compilation d'en
 * faire entrer un dans le graphe (`JSON.stringify` d'un bean produit `{}` ou lève).
 */

export type JsonLdValue = string | number | boolean | JsonLdObject | JsonLdValue[];

export interface JsonLdObject {
	/** `undefined` est autorisé : `JSON.stringify` retire ces clés du rendu. */
	[key: string]: JsonLdValue | undefined;
}

/**
 * Un nœud du `@graph`. `@id` est facultatif — seuls les nœuds référencés en portent
 * un. `@type` accepte un tableau : schema.org autorise le typage multiple, dont on se
 * sert pour préciser une entité sans perdre son type de base (cf. `Organization` +
 * `FinancialService`).
 */
export interface JsonLdNode extends JsonLdObject {
	"@type": string | string[];
	"@id"?: string;
}

/** Référence vers un nœud déclaré ailleurs dans le même `@graph`. */
export interface JsonLdRef extends JsonLdObject {
	"@id": string;
}
