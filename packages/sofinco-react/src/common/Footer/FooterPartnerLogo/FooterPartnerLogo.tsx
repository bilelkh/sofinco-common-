import type { FooterPartnerLogoProps } from "./footerPartnerLogo.types";
import classes from "./footerPartnerLogo.module.css";
import Image from "@shared/ui/Image";

export function FooterPartnerLogo({
	imageUrl,
	altText,
	linkUrl,
	openInNewTab,
	disclaimer,
}: FooterPartnerLogoProps) {
	/* Partner logos are delivered on an 85x85 tile — also the `max-width` of `.logo`.
	   That rule keeps `height: auto`, so a non-square logo (logo-casa is 85x33) still
	   renders at its own ratio once decoded; 85x85 only reserves the slot until then. */
	const imageElement = (
		<Image
			src={imageUrl}
			alt={altText ?? ""}
			title={disclaimer}
			width={85}
			height={85}
			className={classes.logo}
		/>
	);

	if (linkUrl) {
		return (
			<a
				href={linkUrl}
				className={classes.partnerLink}
				target={openInNewTab ? "_blank" : undefined}
				rel={openInNewTab ? "noopener noreferrer" : undefined}
				aria-label={altText}
			>
				{imageElement}
			</a>
		);
	}

	return <div className={classes.partnerWrapper}>{imageElement}</div>;
}
