import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { Footer } from "./Footer";
import type { FooterProps } from "./footer.types";

// Le sous-arbre du footer est rendu par GraalVM et n'est pas hydraté. Pour que le CTA de
// téléchargement puisse arbitrer iOS / Android, Jahia injecte un `<Island>` dans `qrCodeSlot`
// (voir `template-set` → `footer.render.tsx`). Ces tests verrouillent le contrat du slot :
// si `Footer` se remettait à rendre `QrFooter` lui-même alors qu'un slot est fourni, l'îlot
// serait rendu EN PLUS et la zone afficherait deux QR codes.

const base: FooterProps = {
	mainLogoUrl: "/files/logo.svg",
	qrCode: {
		src: "/files/qr.png",
		isActive: true,
		iosUrl: "https://apps.apple.com/app/sofinco",
		androidUrl: "https://play.google.com/store/apps/details?id=sofinco",
		ctaLabelFooter: "Télécharger l'app.",
	},
};

describe("Footer — slot qrCode", () => {
	it("rend le slot À LA PLACE du QrFooter interne, jamais en plus", () => {
		const html = renderToString(
			<Footer {...base} qrCodeSlot={<div data-testid="ilot">ILOT</div>} />,
		);

		expect(html).toContain("ILOT");
		// Le rendu interne aurait émis la vignette : sa présence signalerait un double rendu.
		expect(html).not.toContain('src="/files/qr.png"');
	});

	it("retombe sur le rendu interne quand aucun slot n'est fourni (Storybook, autonome)", () => {
		const html = renderToString(<Footer {...base} />);

		expect(html).toContain('src="/files/qr.png"');
		expect(html).toContain("Télécharger l&#x27;app.");
	});

	it("n'affiche rien dans la zone QR quand le sticker est désactivé et sans slot", () => {
		const html = renderToString(<Footer {...base} qrCode={{ ...base.qrCode!, isActive: false }} />);

		expect(html).not.toContain('src="/files/qr.png"');
	});
});
