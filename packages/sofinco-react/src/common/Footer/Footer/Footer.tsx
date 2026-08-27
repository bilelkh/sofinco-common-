import type { FooterProps } from "./footer.types";
import classes from "./footer.module.css";

import { FooterPartnerLogo } from "../FooterPartnerLogo/FooterPartnerLogo";
import { FooterCategory } from "../FooterCategory/FooterCategory";
import { FooterSocialLink } from "../FooterSocialLink/FooterSocialLink";
import { FooterLink } from "../FooterLink/FooterLink";

import { AvisClientsSticker } from "@b2c/features/AvisClientsSticker/AvisClientsSticker";
import { QrFooter } from "@b2c/features/QrCode/Footer/QrFooter";
import { sanitizeHtml } from "@utils/sanitizeHtml";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

export function Footer(props: Readonly<FooterProps>) {
	return (
		<footer className={classes.footer} id="footer">
			<div className={classes.footer__container}>
				{/* LOGO PRINCIPAL */}
				{props.mainLogoUrl && (
					<div className={classes.footer__mainLogoWrapper}>
						{props.mainLogoLinkUrl ? (
							<a href={props.mainLogoLinkUrl} aria-label={props.mainLogoAlt}>
								<Image
									src={props.mainLogoUrl}
									alt={props.mainLogoAlt ?? ""}
									width={245}
									height={54}
									className={classes.footer__mainLogo}
								/>
							</a>
						) : (
							<Image
								src={props.mainLogoUrl}
								alt={props.mainLogoAlt || "Sofinco"}
								width={245}
								height={54}
								className={classes.footer__mainLogo}
							/>
						)}
					</div>
				)}

				{/* GRILLE CENTRALE */}
				<div className={classes.footer__mainGrid}>
					{/* ZONE 1 : Colonne Gauche (Partenaires) */}
					<div className={classes.footer__partnersCol}>
						{props.partners?.map((partner) => (
							<FooterPartnerLogo key={partner.id} {...partner} />
						))}
					</div>

					{/* ZONE 2 : Colonnes Centrales (Catégories) */}
					<nav className={classes.footer__categoriesCol}>
						{props.categories?.map((category) => (
							<FooterCategory key={category.id} {...category} />
						))}
					</nav>

					{/* ZONE 3 : Colonne Droite (App, Réseaux, Avis) */}
					<div className={classes.footer__socialCol}>
						{/* App & QR Code (Adapté avec l'objet qrCode) */}
						<div className={classes.footer__appSection} id="qrCodeFooter">
							{props.qrCodeSlot ??
								(props?.qrCode && props.qrCode.isActive && <QrFooter {...props.qrCode} />)}
						</div>

						{/* Réseaux Sociaux */}
						<div className={classes.footer__socialLinksWrapper}>
							<span className={classes.footer__socialLabel}>
								<FootnoteText>{props.socialTitle}</FootnoteText>
							</span>
							<div className={classes.footer__socialIcons}>
								{props.socialLinks?.map((social) => (
									<FooterSocialLink key={social.id} {...social} />
								))}
							</div>
						</div>

						{/* Avis Clients */}
						<div className={classes.footer__ratingSection}>
							<AvisClientsSticker {...props.avisClientData} theme="dark" />
						</div>
					</div>
				</div>

				{/* ZONE 4 : LIGNE INFÉRIEURE (Légal) */}
				<div className={classes.footer__bottomBar}>
					{props.bottomSubtitle && (
						<h3 className={classes.footer__bottomSubtitle}>
							<FootnoteText>{props.bottomSubtitle}</FootnoteText>
						</h3>
					)}

					<div className={classes.footer__legalLinks}>
						{props.legalLinks?.map((link) => (
							<FooterLink key={link.id} {...link} size="small" />
						))}
					</div>

					{props.legalMention && (
						<div
							className={classes.footer__legalText}
							dangerouslySetInnerHTML={{
								__html: sanitizeHtml(props.legalMention),
							}}
						/>
					)}
				</div>
			</div>
		</footer>
	);
}
