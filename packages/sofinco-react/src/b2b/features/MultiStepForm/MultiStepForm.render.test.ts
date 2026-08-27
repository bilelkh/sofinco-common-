/*
 * Contrat de rendu de `MultiStepForm`.
 *
 * Rendu SSR (`environment: node`) : c'est aussi la garantie que le composant est
 * consommable en Island Jahia, où GraalVM n'offre ni `document` ni `window`.
 *
 * Ce qui est vérifié ici échappe à tout test visuel :
 *
 *  - **le cloisonnement des étapes** — seuls les champs de l'étape courante sont
 *    montés. C'est ce qui fait que la validation d'une étape ne peut pas être
 *    contaminée par les suivantes ;
 *  - **la dérivation du Stepper** depuis `steps`, qu'aucun `totalSteps` ne vient
 *    doubler ;
 *  - **le libellé du bouton principal**, qui bascule sur la dernière étape ;
 *  - **le contrat d'accessibilité** (libellés liés, `aria-required`, groupe nommé).
 *
 * Écrit en `.ts` et non `.tsx`, comme `Stepper.render.test.ts`, d'où
 * `createElement` plutôt que du JSX.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import MultiStepForm from "./MultiStepForm";
import type { FormStepConfig, MultiStepFormProps } from "./MultiStepForm.type";

const STEPS: FormStepConfig[] = [
	{
		id: "entreprise",
		label: "Votre entreprise",
		title: "Votre entreprise",
		description: "Vérifiez que les informations pré-remplies sont correctes.",
		fields: [
			{ name: "siret", label: "Siret", required: true, value: "32476789990963" },
			{ name: "raisonSociale", label: "Raison sociale" },
			{
				name: "secteur",
				type: "select",
				label: "Secteur d'activité",
				options: [
					{ value: "bricolage", label: "Bricolage" },
					{ value: "auto", label: "Automobile" },
				],
			},
		],
	},
	{
		id: "contact",
		label: "Votre contact",
		title: "Votre contact",
		fields: [
			{ name: "email", type: "email", label: "E-mail" },
			{ name: "message", type: "textarea", label: "Message" },
		],
	},
	{ id: "recap", label: "Récapitulatif", title: "Récapitulatif", content: "Tout est prêt." },
];

const render = (props: Partial<MultiStepFormProps> = {}) =>
	renderToStaticMarkup(createElement(MultiStepForm, { steps: STEPS, ...props }));

const countClass = (html: string, name: string) =>
	(html.match(new RegExp(`_${name}_[A-Za-z0-9]+`, "g")) ?? []).length;

const attr = (html: string, name: string): string | undefined =>
	html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe("cloisonnement des étapes", () => {
	it("ne monte que les champs de l'étape courante", () => {
		const html = render();

		expect(html).toContain("Siret");
		expect(html).toContain("Raison sociale");
		// Champs de l'étape 2 : absents du DOM, donc hors de portée de la validation.
		expect(html).not.toContain("E-mail");
		expect(html).not.toContain("<textarea");
	});

	it("rend le titre et la description de l'étape courante", () => {
		const html = render();

		expect(html).toContain("Votre entreprise");
		expect(html).toContain("Vérifiez que les informations pré-remplies sont correctes.");
	});

	it("rend le contenu libre d'une étape sans champ", () => {
		const html = render({ steps: [STEPS[2]] });

		expect(html).toContain("Tout est prêt.");
	});

	it("reporte la valeur par défaut d'un champ dans le contrôle", () => {
		expect(render()).toContain('value="32476789990963"');
	});
});

describe("Stepper", () => {
	it("dérive le nombre d'étapes de la configuration", () => {
		const html = render();

		expect(countClass(html, "stepper__segment")).toBe(3);
		expect(countClass(html, "stepper__segment--filled")).toBe(1);
		expect(attr(html, "aria-valuemax")).toBe("3");
		expect(attr(html, "aria-valuetext")).toBe("1/3");
	});

	it("peut être masqué", () => {
		expect(countClass(render({ stepper: { show: false } }), "stepper__segment")).toBe(0);
	});
});

describe("boutons", () => {
	it("affiche le libellé d'avancement tant que des étapes restent", () => {
		const html = render();

		expect(html).toContain("Continuer");
		expect(html).not.toContain("Envoyer");
	});

	it("bascule sur le libellé de soumission quand il n'y a qu'une étape", () => {
		const html = render({ steps: [STEPS[0]] });

		expect(html).toContain("Envoyer");
		expect(html).not.toContain("Continuer");
	});

	it("accepte des libellés personnalisés", () => {
		const html = render({ labels: { next: "Étape suivante" } });

		expect(html).toContain("Étape suivante");
	});

	it("n'affiche pas de retour sur la première étape sans rappel de sortie", () => {
		expect(countClass(render(), "form__back")).toBe(0);
	});

	it("affiche le retour dès qu'une sortie est fournie", () => {
		const html = render({ onFirstStepBack: () => {} });

		expect(countClass(html, "form__back")).toBeGreaterThan(0);
		expect(html).toContain("Étape précédente");
	});

	it("porte le bouton principal en submit — la touche Entrée passe par la validation", () => {
		expect(render()).toContain('type="submit"');
	});
});

describe("accessibilité", () => {
	it("associe chaque libellé à son contrôle", () => {
		const html = render();
		const forId = html.match(/for="([^"]*siret)"/)?.[1];

		expect(forId).toBeDefined();
		expect(html).toContain(`id="${forId}"`);
	});

	it("marque les champs obligatoires", () => {
		expect(render()).toContain('required=""');
	});

	it("désactive la validation native, qui doublonnerait les messages du DS", () => {
		expect(render()).toContain("noValidate");
	});

	it("nomme le formulaire quand un libellé est fourni", () => {
		expect(attr(render({ ariaLabel: "Devenir partenaire" }), "aria-label")).toBe(
			"Devenir partenaire",
		);
	});
});

describe("champ autocomplete", () => {
	/*
	 * `fills` et `display` vont par paire : `fills` déclare les clés annexes —
	 * c'est ce qui les fait exister dans l'état du formulaire — et `display` les
	 * relit pour reconstruire le libellé. Configurer l'une sans l'autre laisse un
	 * champ qui se rouvre vide sur une valeur pourtant renseignée.
	 */
	const AUTOCOMPLETE_STEPS: FormStepConfig[] = [
		{
			id: "entreprise",
			label: "Votre entreprise",
			fields: [
				{
					name: "codePostal",
					type: "autocomplete",
					label: "Code postal",
					onSearch: async () => [],
					fills: (option) => ({ ville: option.meta?.city ?? "" }),
					display: (values) =>
						values.codePostal && values.ville ? `${values.ville} (${values.codePostal})` : "",
				},
			],
		},
	];

	it("rend un combobox complété par liste plutôt qu'un champ texte", () => {
		const html = render({ steps: AUTOCOMPLETE_STEPS });

		expect(html).toContain('role="combobox"');
		expect(html).toContain('aria-autocomplete="list"');
	});

	it("n'interroge pas la source au rendu — la recherche part à la frappe", () => {
		const onSearch = vi.fn(async () => []);

		render({
			steps: [
				{ fields: [{ name: "codePostal", type: "autocomplete", label: "Code postal", onSearch }] },
			],
		});

		expect(onSearch).not.toHaveBeenCalled();
	});

	/*
	 * `display` ne peut plus refaire « LILLE (59800) » au premier rendu : il lui
	 * faut `ville`, qui n'a pas de champ à elle et que plus rien ne peut amorcer
	 * depuis la configuration. Le code est bien porté, le libellé reste vide — et
	 * `display` ne reprend son rôle qu'au retour sur une étape où l'utilisateur a
	 * effectivement choisi une commune.
	 */
	it("porte le code amorcé dans le miroir caché, sans pouvoir en refaire le libellé", () => {
		const html = render({
			steps: [
				{
					...AUTOCOMPLETE_STEPS[0],
					fields: [{ ...AUTOCOMPLETE_STEPS[0].fields![0], value: "59800" }],
				},
			],
		});

		expect(html).toContain('<input type="hidden" name="codePostal" value="59800"/>');
		expect(html).not.toContain('value="LILLE (59800)"');
	});

	it("laisse le champ vide tant qu'aucune commune n'a été retenue", () => {
		const html = render({ steps: AUTOCOMPLETE_STEPS });

		expect(html).toContain('<input type="hidden" name="codePostal" value=""/>');
	});
});

describe("configuration dégénérée", () => {
	it("ne rend rien plutôt qu'un formulaire qui ne collecterait aucune valeur", () => {
		expect(render({ steps: [] })).toBe("");
	});
});
