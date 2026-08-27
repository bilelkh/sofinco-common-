import { FooterLink } from "sofinco-react";
import type { FooterLinkProps } from "sofinco-react";

export function renderFooterLinkClient(props: FooterLinkProps) {
	return <FooterLink {...props} />;
}

export function renderFooterNav(props: FooterLinkProps) {
	return (
		<li>
			<FooterLink {...props} />
		</li>
	);
}
