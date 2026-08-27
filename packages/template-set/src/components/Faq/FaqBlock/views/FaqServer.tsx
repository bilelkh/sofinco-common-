import { RenderChild, RenderChildren } from "@jahia/javascript-modules-library";
import type { FaqBlockPropsServer } from "../faqBlock.types";
import { Faq } from "sofinco-react";
import classes from "./faqBlock.module.css";

export function FaqServer(props: FaqBlockPropsServer) {
	// External source (Smart Tribune): the DS <Faq> injects the widget loader
	// script (`integration.jsUrl`), which would fetch the external service on
	// every edit-mode render. Show a static notice instead — the real widget is
	// only loaded in preview and live (renderFaqBlockClient). See faqBlock.render.
	if (props.useExternalSource) {
		return (
			<div className={classes.faq}>
				<div className={classes.editExternalNotice} role="status">
					<span className={classes.editExternalNoticeIcon} aria-hidden="true">
						💬
					</span>
					<div>
						<strong>FAQ en ligne (Smart Tribune)</strong>
						<p>
							L'aperçu n'est pas chargé en mode édition pour éviter l'appel au service externe. La
							FAQ s'affiche en prévisualisation et en ligne.
						</p>
					</div>
				</div>
			</div>
		);
	}

	// Manual source: reuse the design-system <Faq> for the header (image, title,
	// subtitle) exactly as it renders live, but with an empty items list — the
	// items themselves are rendered as editable sofnt:faqItem children through
	// RenderChildren (filtered to faqItem so the `link` child stays out of the
	// list), so authors can edit, reorder and delete them in place. RenderChildren
	// also exposes the add-content area in edit mode. The optional bottom link
	// (sofnt:link child) is rendered editable and centered below the list.
	return (
		<div className={classes.faq}>
			<Faq {...props} items={[]} />
			<div className={classes.editItems}>
				<RenderChildren nodeTypes={["sofnt:faqItem"]} filter="sofnt:faqItem" />
			</div>
			<div className={classes.editLink}>
				<RenderChild name="link" nodeTypes={["sofnt:link"]} />
			</div>
		</div>
	);
}
