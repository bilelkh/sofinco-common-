/*
 * Test de COUVERTURE, pas de comportement.
 *
 * Il lit les définitions CND et échoue dès qu'un champ richtext dont la barre d'outils
 * expose le bouton « Ancres de la page » n'est ni enregistré dans `FOOTNOTE_FIELDS` ni
 * explicitement exempté. Sans lui, ajouter un composant richtext donne au contributeur un
 * bouton qui insère un marqueur que le rendu ignore en silence — le défaut « ça marche en
 * édition, pas en preview » remonté en recette.
 *
 * Il vaut aussi dans l'autre sens : une entrée de `FOOTNOTE_FIELDS` qui ne correspond plus
 * à aucun champ CND est signalée, pour que le registre ne se remplisse pas de fantômes.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FOOTNOTE_FIELDS, FOOTNOTE_FIELDS_EXEMPT } from "./footnoteFields";

const COMPONENTS_DIR = fileURLToPath(new URL("../components", import.meta.url));
const CKEDITOR_CONFIG = fileURLToPath(
	new URL("../../javascript/ckeditor_config.js", import.meta.url),
);

/**
 * Barres d'outils qui exposent le bouton d'ancres, LUES dans `ckeditor_config.js`
 * plutôt que recopiées ici.
 *
 * Une liste en dur se désynchronise au premier ajout de barre — et le symptôme est
 * silencieux, puisque le test se contente alors de ne rien vérifier pour la barre
 * oubliée. C'est précisément le trou que ce fichier existe pour fermer.
 *
 * Découpage sur `config.toolbar_X = [` : chaque tranche court jusqu'à la déclaration
 * suivante, donc la présence de `sofincoPageAnchors` dedans est bien celle de CETTE
 * barre.
 */
function anchorToolbars(): string[] {
	const source = readFileSync(CKEDITOR_CONFIG, "utf8");
	const names: string[] = [];
	const declarations = [...source.matchAll(/config\.toolbar_(\w+)\s*=\s*\[/g)];

	for (const [index, match] of declarations.entries()) {
		const start = match.index + match[0].length;
		const end = declarations[index + 1]?.index ?? source.length;
		if (source.slice(start, end).includes("sofincoPageAnchors")) names.push(match[1]);
	}
	return names;
}

const ANCHOR_TOOLBARS = anchorToolbars();

interface RichTextField {
	nodeType: string;
	property: string;
	toolbar: string;
	file: string;
}

function cndFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...cndFiles(full));
		else if (entry === "definition.cnd") out.push(full);
	}
	return out;
}

/** `[sofnt:x] > …` ouvre un type ; ` - name (string, richtext[ckeditor.toolbar='T'])` déclare un champ. */
function parseRichTextFields(): RichTextField[] {
	const fields: RichTextField[] = [];

	for (const file of cndFiles(COMPONENTS_DIR)) {
		let nodeType = "";
		for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
			const typeMatch = /^\s*\[([^\]]+)]/.exec(line);
			if (typeMatch) {
				nodeType = typeMatch[1].trim();
				continue;
			}
			const propMatch = /^\s*-\s*([A-Za-z_][\w:]*)\s*\(\s*string\s*,\s*richtext([^)]*)\)/.exec(
				line,
			);
			if (!propMatch || !nodeType) continue;

			const toolbar = /toolbar\s*=\s*'([^']+)'/.exec(propMatch[2])?.[1] ?? "";
			fields.push({ nodeType, property: propMatch[1], toolbar, file });
		}
	}
	return fields;
}

const richTextFields = parseRichTextFields();

const isRegistered = (nodeType: string, property: string) =>
	(FOOTNOTE_FIELDS[nodeType] ?? []).includes(property);

const isExempt = (nodeType: string, property: string) =>
	Object.prototype.hasOwnProperty.call(FOOTNOTE_FIELDS_EXEMPT, `${nodeType}.${property}`);

describe("couverture footnote des champs richtext", () => {
	it("trouve les définitions CND (garde-fou : un parseur muet passerait tout)", () => {
		expect(richTextFields.length).toBeGreaterThanOrEqual(10);
	});

	it("trouve les barres à ancres dans ckeditor_config.js (même garde-fou)", () => {
		// Sans cette assertion, un `anchorToolbars()` vide rendrait le test suivant
		// vert en ne contrôlant plus rien.
		expect(ANCHOR_TOOLBARS).toEqual(
			expect.arrayContaining(["Simple", "InsuranceMention", "Description"]),
		);
	});

	it("n'a pas de champ richtext à barre d'ancres non couvert", () => {
		const missing = richTextFields
			.filter((f) => ANCHOR_TOOLBARS.includes(f.toolbar))
			.filter((f) => !isRegistered(f.nodeType, f.property) && !isExempt(f.nodeType, f.property))
			.map((f) => `${f.nodeType}.${f.property} (toolbar=${f.toolbar})`);

		expect(
			missing,
			"Champs richtext offrant le bouton d'ancres mais absents de FOOTNOTE_FIELDS. " +
				"Ajoutez-les au registre, ou justifiez l'exclusion dans FOOTNOTE_FIELDS_EXEMPT.",
		).toEqual([]);
	});

	it("n'a pas de champ richtext sans barre d'outils déclarée", () => {
		// Un `richtext` nu retombe sur la configuration par défaut de Jahia : pas de bouton
		// d'ancres, donc marqueur impossible à insérer autrement qu'à la main en source.
		const bare = richTextFields.filter((f) => !f.toolbar).map((f) => `${f.nodeType}.${f.property}`);

		expect(
			bare,
			"Champ richtext sans ckeditor.toolbar — le contributeur n'a pas le bouton d'ancres.",
		).toEqual([]);
	});

	it("n'a pas d'entrée fantôme dans FOOTNOTE_FIELDS", () => {
		const declared = new Set(richTextFields.map((f) => `${f.nodeType}.${f.property}`));
		const ghosts: string[] = [];
		for (const [nodeType, properties] of Object.entries(FOOTNOTE_FIELDS)) {
			for (const property of properties) {
				if (!declared.has(`${nodeType}.${property}`)) ghosts.push(`${nodeType}.${property}`);
			}
		}

		expect(ghosts, "Entrées de FOOTNOTE_FIELDS sans champ richtext correspondant.").toEqual([]);
	});

	it("n'a pas d'exemption fantôme", () => {
		const declared = new Set(richTextFields.map((f) => `${f.nodeType}.${f.property}`));
		const ghosts = Object.keys(FOOTNOTE_FIELDS_EXEMPT).filter((key) => !declared.has(key));

		expect(ghosts, "Exemptions sans champ richtext correspondant.").toEqual([]);
	});
});
