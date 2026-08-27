import { describe, it, expect } from "vitest";
import { toPlainText } from "./richText";

describe("toPlainText", () => {
	it("retire le balisage et normalise les espaces", () => {
		expect(toPlainText("<p>Le taux   dépend\n du <b>montant</b>.</p>")).toBe(
			"Le taux dépend du montant.",
		);
	});

	it("sépare les blocs plutôt que de coller leur contenu", () => {
		expect(toPlainText("<ul><li>Auto</li><li>Moto</li></ul>")).toBe("Auto Moto");
		expect(toPlainText("Ligne 1<br/>Ligne 2")).toBe("Ligne 1 Ligne 2");
	});

	it("décode les entités nommées et numériques", () => {
		expect(toPlainText("Cr&eacute;dit&nbsp;auto &agrave; 3&nbsp;%")).toBe("Crédit auto à 3 %");
		expect(toPlainText("L&#39;offre &#x2014; d&rsquo;abord")).toBe("L'offre — d’abord");
	});

	it("décode &amp; en dernier pour ne pas réintroduire d'entité", () => {
		expect(toPlainText("A &amp;lt; B")).toBe("A &lt; B");
		expect(toPlainText("Frais &amp; commissions")).toBe("Frais & commissions");
	});

	it("neutralise une balise script authorée dans le richtext", () => {
		expect(toPlainText("Avant<script>alert(1)</script>après")).toBe("Avantalert(1)après");
	});

	it("retourne une chaîne vide pour une valeur vide ou purement balisée", () => {
		expect(toPlainText("")).toBe("");
		expect(toPlainText("<p></p>")).toBe("");
	});
});
