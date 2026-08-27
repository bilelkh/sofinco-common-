/*
 * Tests de la règle ESLint `sofinco/require-footnote-text` (fichier `eslint-rules/`).
 *
 * Une règle de lint qui cesse silencieusement de matcher est PIRE que pas de règle : elle
 * donne l'illusion d'un filet. Ces cas verrouillent les deux bords — ce qui doit être
 * signalé, et ce qui ne doit surtout pas l'être, notamment le rendu conditionnel
 * `{cond && <JSX/>}` dont un traitement naïf ferait un faux positif sur tout le DS.
 *
 * Vit dans ce dossier parce que c'est le dispositif que la règle protège.
 */
import { describe, expect, it } from "vitest";
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import rule from "../../../eslint-rules/require-footnote-text.js";

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tseslint.parser as never,
		parserOptions: { ecmaFeatures: { jsx: true } },
	},
});

const options = [{ wrappingComponents: ["Title", "Subtitle", "Tag"], ignoreNames: ["srLabel"] }];
const missing = [{ messageId: "missing" as const }];

describe("require-footnote-text", () => {
	it("signale les textes contributeurs non enveloppés et rien d'autre", () => {
		ruleTester.run("require-footnote-text", rule as never, {
			valid: [
				// Enveloppé : le cas nominal.
				{ code: "<p><FootnoteText>{card.title}</FootnoteText></p>", options },
				{ code: "<a><FootnoteText inert>{label}</FootnoteText></a>", options },

				// Primitive qui enveloppe elle-même ses enfants.
				{ code: "<Title>{title}</Title>", options },
				{ code: "<Subtitle>{subtitle}</Subtitle>", options },
				{ code: "<Tag>{slot.feature.label}</Tag>", options },

				/*
				 * Rendu conditionnel : `cond &&` n'est qu'un GARDE de présence, la valeur rendue
				 * est à droite. Analyser la gauche signalerait chaque bloc conditionnel du DS,
				 * y compris ceux correctement enveloppés à l'intérieur — la règle deviendrait
				 * inutilisable et serait désactivée. Régression réellement rencontrée.
				 */
				{ code: "<div>{title && <p><FootnoteText>{title}</FootnoteText></p>}</div>", options },
				{ code: "<div>{label && <Badge label={label} />}</div>", options },

				// Position ATTRIBUT : c'est le composant destinataire qui enveloppe.
				{ code: "<Card title={card.title} />", options },

				// Aucune connotation textuelle.
				{ code: "<div>{count}</div>", options },
				{ code: "<div>{items.length}</div>", options },

				// Nom explicitement exempté.
				{ code: "<span>{srLabel}</span>", options },

				// Formes non analysables (appel, littéral) : hors périmètre, pas de bruit.
				{ code: "<p>{formatTitle(node)}</p>", options },
				{ code: '<p>{"Titre"}</p>', options },
			],

			invalid: [
				// Identifiant simple.
				{ code: "<p>{title}</p>", options, errors: missing },

				// Chaîne de membres — les balayages successifs ont buté sur chaque profondeur.
				{ code: "<p>{card.title}</p>", options, errors: missing },
				{ code: "<p>{slot.feature.text}</p>", options, errors: missing },

				// Mot-clé en fin de nom (`labelComplement`, `titleBadge`…).
				{ code: "<p>{card.labelComplement}</p>", options, errors: missing },

				// Composant `motion.*` : la casse de la balise ne doit pas servir de filtre.
				{ code: "<motion.p>{item.description}</motion.p>", options, errors: missing },

				// Élément interactif : signalé aussi, le correctif étant `inert` + describedby.
				{ code: "<button>{label}</button>", options, errors: missing },

				// Repli constant : la valeur contributeur est à gauche.
				{ code: '<h1>{title ?? "Menu"}</h1>', options, errors: missing },
				{ code: '<h1>{heading || ""}</h1>', options, errors: missing },

				// Chaînage optionnel et assertion non-nulle : de simples enveloppes syntaxiques.
				{ code: "<p>{card?.subtitle}</p>", options, errors: missing },
				{ code: "<p>{card.summary!}</p>", options, errors: missing },

				// Un composant non déclaré enveloppant ne blanchit rien.
				{ code: "<Heading>{title}</Heading>", options, errors: missing },
			],
		});

		// `ruleTester.run` lève à la première divergence : arriver ici vaut succès.
		expect(true).toBe(true);
	});
});
