import path from "node:path";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("./src/", import.meta.url));

/**
 * Carte d'alias des sources du design system — source de vérité unique.
 *
 * Consommée par `vite.config.ts`, `vitest.unit.config.ts` (et donc Storybook, qui hérite de
 * la config Vite du projet) ainsi que par les consommateurs en aval : le module Jahia
 * `sofinco-template` compile les sources du DS et doit résoudre les mêmes alias.
 *
 * Les chemins sont résolus depuis `import.meta.url`, donc corrects quel que soit le
 * répertoire courant du consommateur. Le DS reste ainsi propriétaire de son arborescence :
 * une réorganisation (nouvelle marque, déplacement d'un dossier) se répercute ici et nulle
 * part ailleurs.
 *
 * L'entrée `"@"` est volontairement en dernier : Vite teste les alias dans l'ordre
 * d'insertion, et même si la correspondance exige une frontière `/` (donc `"@"` ne capte pas
 * `@shared/…`), garder le préfixe le plus court en fin de liste évite toute ambiguïté si un
 * alias plus spécifique est ajouté plus tard.
 */
export const sofincoReactAliases = {
	"@shared": path.join(src, "shared"),
	"@common": path.join(src, "common"),
	"@b2c": path.join(src, "b2c"),
	"@b2b": path.join(src, "b2b"),
	"@styles": path.join(src, "styles"),
	"@assets": path.join(src, "assets"),
	"@utils": path.join(src, "utils"),
	"@": path.join(src),
};
