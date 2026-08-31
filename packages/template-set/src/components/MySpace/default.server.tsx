import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import { Cta, Link } from "sofinco-react";
import { getCtaProps } from "#lib/cta";
import { getAsBoolean } from "#lib/jcr";
import { buildSmartPushLink } from "#lib/smartPush/smartPush.mapping";
import classes from "./component.module.css";

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:mySpace",
	},
	(_, { currentNode }) => {
		const cta = getCtaProps(currentNode, "myspace-cta");
		// En édition (vue du menu), donne un aperçu du bouton "Aide & Contact". En live/preview
		// c'est NavMenu qui injecte ce lien dans le Menu React + le bootstrap Smart Tribune.
		const showSmartPush = getAsBoolean(currentNode, "showSmartPush");

		return (
			<div className={classes.actions}>
				<div className={classes.links}>
					<RenderChildren nodeTypes={["sofnt:link"]} />
					{showSmartPush && <Link {...buildSmartPushLink()} />}
				</div>
				{cta && (
					<div className={classes.cta}>
						<Cta {...cta} variant="accent" />
					</div>
				)}
			</div>
		);
	},
);
