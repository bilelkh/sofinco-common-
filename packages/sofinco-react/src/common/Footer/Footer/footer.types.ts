import type { ReactNode } from "react";

import type { QrProps } from "@b2c/features/QrCode/QrCode.type";
import type { AvisClientsStickerProps } from "@b2c/features/AvisClientsSticker/avisClientsSticker.types";

import type { FooterPartnerLogoProps } from "../FooterPartnerLogo/footerPartnerLogo.types";
import type { FooterCategoryProps } from "../FooterCategory/footerCategory.types";
import type { FooterSocialLinkProps } from "../FooterSocialLink/footerSocialLink.types";
import type { FooterLinkProps } from "../FooterLink/footerLink.types";

export interface FooterProps {
	mainLogoUrl: string;
	mainLogoAlt?: string;
	mainLogoLinkUrl?: string;

	socialTitle?: string;
	bottomSubtitle?: string;
	legalMention?: string;

	qrCode?: QrProps;
	/**
	 * Remplace le rendu interne de `QrFooter` par un nœud fourni par le consommateur.
	 *
	 * Existe pour Jahia : `<Island>` ne peut être monté que depuis `template-set` (ce paquet
	 * n'a pas le droit d'importer `@jahia/javascript-modules-library`), et le sous-arbre du
	 * footer n'est pas hydraté. Passer l'îlot par ce slot est le seul moyen d'hydrater la
	 * seule zone qui en a besoin sans hydrater tout le footer.
	 *
	 * Quand il est absent — Storybook, consommateur autonome — `qrCode` est rendu localement.
	 */
	qrCodeSlot?: ReactNode;
	avisClient?: ReactNode;

	avisClientData?: AvisClientsStickerProps;

	partners?: FooterPartnerLogoProps[];
	categories?: FooterCategoryProps[];
	socialLinks?: FooterSocialLinkProps[];
	legalLinks?: FooterLinkProps[];
}
