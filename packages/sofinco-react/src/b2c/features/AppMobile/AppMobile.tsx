import React, { useId } from "react";
import clsx from "clsx";
import type { AppMobileProps } from "@b2c/features/AppMobile/AppMobile.type";
import styles from "@b2c/features/AppMobile/AppMobile.module.css";
import MobileDownloadCta from "@b2c/features/AppMobile/ui/MobileDownloadCta";
import useMobileAppHref from "@b2c/features/AppMobile/ui/useMobileAppHref";
import SectionHeading from "@shared/ui/SectionHeading";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

export const AppMobile = ({
	picto,
	backgroundColor,
	title,
	subtitle,
	cards,
	img,
	imgQrCode,
	mobileCtaHrefIos,
	mobileCtaHrefAndroid,
	className,
}: AppMobileProps) => {
	const headingId = useId();
	// Le href pilote la FORME de l'arbre (QR code vs CTA) : il doit passer par le hook, sinon
	// le SSR rend le CTA et l'hydratation desktop rend l'`<Image>` → React #418.
	// Pas de `fallbackHref` : hors iOS / Android on retombe sur le QR code.
	const resolvedMobileCtaHref = useMobileAppHref({
		hrefIos: mobileCtaHrefIos,
		hrefAndroid: mobileCtaHrefAndroid,
	});
	const hasMobileCta = Boolean(resolvedMobileCtaHref);
	const showQrCode = Boolean(imgQrCode) && !hasMobileCta;
	const sectionStyle = {
		backgroundColor,
	} as React.CSSProperties;

	return (
		<section
			className={clsx(
				styles["app-mobile"],
				!showQrCode && styles["app-mobile--without-qr"],
				className,
			)}
			aria-labelledby={headingId}
			style={sectionStyle}
		>
			<SectionHeading
				id={headingId}
				title={title}
				subtitle={subtitle}
				align="center"
				visualStyle="none"
				variant="white"
				className={styles["app-mobile__header"]}
				titleClassName={styles["app-mobile__title"]}
				/* This picto carries no CSS box at all, so its intrinsic 69x69 IS its layout size. */
				eyebrow={
					picto && (
						<Image
							src={picto}
							decorative
							width={69}
							height={69}
							className={styles["app-mobile__picto"]}
						/>
					)
				}
				children={
					<>
						{showQrCode && (
							<Image
								src={imgQrCode}
								decorative
								width={104}
								height={105}
								className={styles["app-mobile__qr-img"]}
							/>
						)}

						{hasMobileCta && (
							<MobileDownloadCta
								href={resolvedMobileCtaHref}
								className={styles["app-mobile__mobile-cta"]}
							/>
						)}
					</>
				}
			/>

			<div className={styles["app-mobile__scene"]}>
				<div className={styles["app-mobile__phone"]} aria-hidden="true">
					<Image
						src={img}
						decorative
						width={598}
						height={583}
						className={styles["app-mobile__phone-img"]}
					/>
				</div>

				{cards.map((card) => (
					<article key={card.id} className={styles["app-mobile__card"]}>
						<div className={styles["app-mobile__card-header"]}>
							<h3 className={styles["app-mobile__card-label"]}>
								<FootnoteText>{card.label}</FootnoteText>
							</h3>
							{card.picto && (
								<Image
									src={card.picto}
									decorative
									width={127}
									height={127}
									className={styles["app-mobile__card-picto"]}
								/>
							)}
						</div>
						<p className={styles["app-mobile__card-complement"]}>
							<FootnoteText>{card.labelComplement}</FootnoteText>
						</p>
					</article>
				))}
			</div>
		</section>
	);
};

export default AppMobile;
