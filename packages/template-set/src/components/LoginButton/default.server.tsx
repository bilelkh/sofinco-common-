import { jahiaComponent, Island } from "@jahia/javascript-modules-library";
import { Cta } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { buildConnectUrl, mapLoginButtonProps } from "./loginButton.mapping";
import LoginButtonClient, { type LoginButtonClientProps } from "./views/LoginButtonClient.client";
import classes from "./views/loginButton.module.css";

/**
 * sofnt:loginButton — Sofinco OAuth login button.
 *
 * Server side: resolves the three strings the client needs (connect-action URL, site key,
 * redirect URL) from the render context, then mounts the interactive Island. The fragile
 * "SofincoApi" naming contract stays entirely in the connector (packages/sofinco-core); the React
 * side only depends on the action URL, built via buildConnectUrl() (see loginButton.mapping.ts).
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:loginButton",
		displayName: "Bouton de connexion Sofinco",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		const { label, redirectUrl, variant } = mapLoginButtonProps(currentNode);

		// Edit mode: static, non-clickable preview so contributors can see and position the button.
		// Must run before the guest check — in jContent the author is an authenticated editor, so a
		// guest-only early return would make this preview dead code.
		const editMode = isEditMode(renderContext);
		if (editMode) {
			return (
				<div className={classes["login-button"]}>
					<Cta label={label} variant={variant} isDisabled />
				</div>
			);
		}

		// Live/preview mode: only guests see the login button — logged-in users get nothing.
		const isGuest = renderContext.getUser().getUsername() === "guest";
		if (!isGuest) {
			return <></>;
		}

		const props: LoginButtonClientProps = {
			label,
			variant,
			redirectUrl,
			siteKey: renderContext.getSite().getSiteKey(),
			connectUrl: buildConnectUrl(
				renderContext.getURLGenerator().getBase(),
				renderContext.getSite().getHome().getPath(),
			),
		};

		return (
			<div className={classes["login-button"]}>
				<Island component={LoginButtonClient} props={props} />
			</div>
		);
	},
);
