import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import Image from "./Image";

// Les composants du DS sont rendus côté serveur par Jahia (GraalVM) : le HTML émis ici est
// celui que Lighthouse audite. Ces tests verrouillent le contrat CLS de la primitive —
// l'audit `unsized-images` exige `width` ET `height` sur l'`<img>`, et une image
// art-dirigée dont le crop change de ratio doit porter les siens sur chaque `<source>`.

describe("Image — dimensions explicites (CLS)", () => {
	it("emits width and height on the <img>", () => {
		const html = renderToString(
			<Image src="/files/visuel.webp" alt="Visuel" width={928} height={300} />,
		);

		expect(html).toContain('width="928"');
		expect(html).toContain('height="300"');
	});

	it("gives each art-directed <source> its own intrinsic size", () => {
		const html = renderToString(
			<Image
				src="/files/desktop.webp"
				decorative
				width={820}
				height={480}
				sources={[
					{ media: "(max-width: 600px)", srcSet: "/files/mobile.webp", width: 400, height: 640 },
				]}
			/>,
		);

		// Le crop mobile est vertical : sans ses propres dimensions, le ratio 820/480 du
		// fallback serait réservé sous 600px et la page sauterait au décodage.
		expect(html).toMatch(/<source[^>]*width="400"[^>]*height="640"/);
		expect(html).toMatch(/<img[^>]*width="820"[^>]*height="480"/);
	});

	it("omits the attributes on a <source> that shares the fallback ratio", () => {
		const html = renderToString(
			<Image
				src="/files/desktop.webp"
				decorative
				width={350}
				height={200}
				sources={[{ media: "(max-width: 600px)", srcSet: "/files/mobile.webp" }]}
			/>,
		);

		expect(html).toMatch(/<source[^>]*srcSet="\/files\/mobile.webp"/i);
		expect(html).not.toMatch(/<source[^>]*width=/);
	});
});
