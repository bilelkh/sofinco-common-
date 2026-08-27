import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import QrCode from "./QrCode";

// Le QR est consommé dans des sous-arbres non hydratés (footer Jahia, aperçu jContent) :
// le HTML serveur est le seul rendu qui existe. Ces tests verrouillent ce qui en sort.

describe("QrCode — server rendering", () => {
	it("emits the figure server-side, leaving the width switch to CSS", () => {
		const html = renderToString(<QrCode src="/files/qr.png" text="Scannez-moi" />);

		expect(html).toContain("<figure");
		expect(html).toContain('src="/files/qr.png"');
		expect(html).toContain("Scannez-moi");
	});

	it("renders nothing when no image is contributed, rather than an empty <img>", () => {
		expect(renderToString(<QrCode src="" text="Scannez-moi" />)).toBe("");
	});

	it("adds the authoring escape hatch only when asked", () => {
		const plain = renderToString(<QrCode src="/files/qr.png" />);
		const forced = renderToString(<QrCode src="/files/qr.png" alwaysVisible />);

		expect(plain).not.toMatch(/qr-code--always/);
		// Modificateur TOUJOURS posé en plus de la classe de base, jamais seul.
		expect(forced).toMatch(/qr-code[_a-zA-Z0-9-]*\s.*qr-code--always/);
	});
});
