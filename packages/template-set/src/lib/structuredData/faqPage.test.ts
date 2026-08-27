import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { buildFaqPage, FAQ_INTEGRATION_MIXIN } from "./faqPage";

const ID = "https://www.sofinco.fr/credit-pret/credit-auto#faq";
const LANG = "fr";

const faqItem = (question: string, answer: string) =>
	makeNode({ nodeTypes: ["sofnt:faqItem"], props: { "jcr:title": question, answer } });

// Aucun mixin par défaut : c'est le cas réel d'une FAQ à items. `sofmix:faqItems`
// n'ayant aucune propriété, Jahia ne l'attache jamais au nœud.
const faqBlock = (items: JCRNodeWrapper[], mixins: string[] = [], props = {}) =>
	makeNode({ nodeTypes: ["sofnt:faq", ...mixins], children: items, props });

describe("buildFaqPage", () => {
	it("aplatit les réponses richtext en texte brut", () => {
		const node = buildFaqPage(
			[
				faqBlock([
					faqItem(
						"Quel est le taux d'un crédit auto ?",
						"<p>Le taux d&eacute;pend du <b>montant</b>.</p>",
					),
				]),
			],
			{ id: ID, inLanguage: LANG },
		);

		expect(node).toEqual({
			"@type": "FAQPage",
			"@id": ID,
			"inLanguage": LANG,
			"mainEntity": [
				{
					"@type": "Question",
					"name": "Quel est le taux d'un crédit auto ?",
					"acceptedAnswer": { "@type": "Answer", "text": "Le taux dépend du montant." },
				},
			],
		});
	});

	it("fusionne les blocs éligibles en un seul FAQPage", () => {
		const node = buildFaqPage(
			[faqBlock([faqItem("Q1", "R1")]), faqBlock([faqItem("Q2", "R2"), faqItem("Q3", "R3")])],
			{ id: ID, inLanguage: LANG },
		);
		expect((node?.mainEntity as { name: string }[]).map((q) => q.name)).toEqual(["Q1", "Q2", "Q3"]);
	});

	it("écarte les blocs Smart Tribune, dont le contenu n'est pas dans le JCR", () => {
		expect(
			buildFaqPage([faqBlock([faqItem("Q", "R")], [FAQ_INTEGRATION_MIXIN])], {
				id: ID,
				inLanguage: LANG,
			}),
		).toBeNull();
	});

	it("balise une FAQ à items alors qu'aucun mixin n'est attaché au nœud", () => {
		// `sofmix:faqItems` est un `jmix:dynamicFieldset` sans propriété : Jahia ne le
		// persiste jamais. Exiger sa présence ne balisait donc AUCUNE FAQ.
		const node = buildFaqPage([faqBlock([faqItem("Q", "R")])], { id: ID, inLanguage: LANG });
		expect((node?.mainEntity as { name: string }[]).map((q) => q.name)).toEqual(["Q"]);
	});

	it("écarte un bloc marqué comme exclu (retranscription vidéo)", () => {
		expect(
			buildFaqPage([faqBlock([faqItem("Q", "R")], [], { excludeFromStructuredData: true })], {
				id: ID,
				inLanguage: LANG,
			}),
		).toBeNull();
	});

	it("écarte les items incomplets", () => {
		const node = buildFaqPage(
			[
				faqBlock([
					faqItem("Q1", ""),
					faqItem("", "R2"),
					faqItem("Q3", "<p></p>"),
					faqItem("Q4", "R4"),
				]),
			],
			{ id: ID, inLanguage: LANG },
		);
		expect((node?.mainEntity as { name: string }[]).map((q) => q.name)).toEqual(["Q4"]);
	});

	it("n'émet rien sans bloc ni sans question exploitable", () => {
		expect(buildFaqPage([], { id: ID, inLanguage: LANG })).toBeNull();
		expect(buildFaqPage([faqBlock([])], { id: ID, inLanguage: LANG })).toBeNull();
	});
});
