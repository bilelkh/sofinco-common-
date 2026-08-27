import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { QrFooter } from "./QrFooter";
import type { QrProps } from "../QrCode.type";

// Le footer Jahia est rendu par GraalVM et n'est PAS hydraté : le HTML serveur est le seul
// rendu que le visiteur reçoit. La vignette QR et le CTA doivent donc TOUS DEUX y figurer,
// la bascule étant laissée au média CSS. Une régression a déjà supprimé la vignette de ce
// HTML en confiant le choix à `useMediaQuery`, dont l'instantané serveur vaut `false` :
// ces tests verrouillent le contrat côté serveur, seul endroit où il est observable.

const props: QrProps = {
	src: "/files/qr-sofinco.png",
	text: "Scannez pour télécharger",
	isActive: true,
	iosUrl: "https://apps.apple.com/app/sofinco",
	androidUrl: "https://play.google.com/store/apps/details?id=sofinco",
	fallbackUrl: "/telecharger-l-application",
	ctaLabelFooter: "Télécharger l'app.",
};

describe("QrFooter — server rendering", () => {
	it("emits the QR image AND the download CTA in the same server HTML", () => {
		const html = renderToString(<QrFooter {...props} />);

		expect(html).toContain('src="/files/qr-sofinco.png"');
		expect(html).toContain("Scannez pour télécharger");
		expect(html).toContain("Télécharger l&#x27;app.");
	});

	it("hides the CTA above the threshold by tagging it, so exactly one branch shows", () => {
		const html = renderToString(<QrFooter {...props} />);

		// La classe est hashée par CSS Modules — on vérifie la présence du hook, pas son nom.
		expect(html).toMatch(/qr-footer__cta/);
	});

	it("serves the fallback destination when the OS is unknown, as it is on the server", () => {
		const html = renderToString(<QrFooter {...props} />);

		expect(html).toContain('href="/telecharger-l-application"');
	});

	it("keeps the CTA unconditionally visible when no QR image is contributed", () => {
		const html = renderToString(<QrFooter {...props} src="" />);

		expect(html).not.toContain("<figure");
		// Sans vignette à révéler, rien ne doit masquer le CTA au-dessus du seuil.
		expect(html).not.toMatch(/qr-footer__cta/);
		expect(html).toContain("Télécharger l&#x27;app.");
	});

	it("falls back to a default label when none is contributed", () => {
		const html = renderToString(<QrFooter {...props} ctaLabelFooter={undefined} />);

		expect(html).toContain("Télécharger l&#x27;application");
	});
});
