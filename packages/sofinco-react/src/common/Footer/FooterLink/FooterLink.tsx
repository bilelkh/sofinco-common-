import type { FooterLinkProps } from "./footerLink.types";
import classes from "./footerLink.module.css";
import Link from "@shared/ui/Link/Link";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";
import clsx from "clsx";

export function FooterLink({
	label,
	href,
	target,
	ariaLabel,
	size,
	tracking,
	isConsent,
}: FooterLinkProps) {
	const className = clsx(classes.link, {
		[classes["footerLink--small"]]: size === "small",
	});

	const text = label || ariaLabel;

	if (isConsent) {
		return (
			<button
				type="button"
				data-consent-action="preferences"
				data-tracking={tracking?.event ? JSON.stringify(tracking) : undefined}
				className={clsx(className, classes.footer__consentButton)}
				aria-describedby={footnoteDescribedBy(text)}
			>
				<FootnoteText inert>{text}</FootnoteText>
			</button>
		);
	}

	return (
		<Link
			href={href}
			label={text}
			isExternal={target === "_blank"}
			className={className}
			tracking={tracking}
		/>
	);
}
