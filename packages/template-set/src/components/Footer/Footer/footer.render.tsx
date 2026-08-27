import { Island, RenderChild } from "@jahia/javascript-modules-library";
import type { FooterPropsServer } from "./footer.types";
import type { FooterProps } from "sofinco-react";
import { FooterServer } from "./views/FooterServer";
import FooterClient from "./views/FooterClient.client";
import QrFooterJahia from "./views/QrFooterJahia.client";

export function renderFooterClient(props: FooterProps) {
	// avisClient est rendu séparément via RenderChild et exclu des props sérialisables
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { avisClient, ...serializableProps } = props;

	// Seule zone hydratée du footer : le CTA de téléchargement doit arbitrer entre l'App Store
	// et le Play Store, ce qui suppose de lire l'OS du visiteur. Le reste du sous-arbre reste
	// du HTML statique produit par GraalVM. `QrProps` ne contient que des chaînes et des
	// booléens, donc sérialisable tel quel.
	const qrCodeSlot = props.qrCode?.isActive ? (
		<Island component={QrFooterJahia} props={props.qrCode} />
	) : undefined;

	return (
		<FooterClient {...serializableProps} qrCodeSlot={qrCodeSlot}>
			<RenderChild name="avisClients" />
		</FooterClient>
	);
}

export function renderFooterServer(props: FooterPropsServer) {
	return <FooterServer {...props} />;
}
