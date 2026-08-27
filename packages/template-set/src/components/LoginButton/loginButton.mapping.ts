import type { JCRNodeWrapper } from "org.jahia.services.content";
import { str } from "#lib/jcr";

/**
 * jahia-oauth "connect" action name. MUST stay byte-identical to `connectToActionName` in
 * packages/sofinco-core/src/main/resources/META-INF/configurations/
 *   org.jahia.modules.jahiaoauth.connector.actions-sofinco.cfg
 * That .cfg is what makes jahia-oauth expose the `.connectToSofincoAction.do` action this button calls.
 * This constant is the ONLY place the action name is authored on the React side. Treat a rename as cross-cutting.
 */
export const CONNECT_ACTION = "connectToSofincoAction";

/** Default post-login destination when the node leaves redirectUrl blank */
export const DEFAULT_REDIRECT_URL = "/jahia/dashboard";

/** Default visible label when the node leaves buttonLabel blank. */
export const DEFAULT_LABEL = "Se connecter avec Sofinco";

/**
 * Accepts only a same-origin, site-relative path: a single leading "/" not followed by another "/" or a
 * backslash (rejects "//evil.com" and "/\evil.com" — browsers normalize "\" to "/", so both resolve to a
 * protocol-relative navigation) and no scheme (rejects "https://evil.com"). Also rejects any backslash or
 * whitespace/control char in the body, which browsers likewise normalize into path separators.
 * `redirectUrl` is a contributor-authored JCR string used verbatim as `window.location.href` after a
 * successful login — an unvalidated value is a post-auth open redirect (phishing vector). Anything that
 * isn't a safe relative path falls back to DEFAULT_REDIRECT_URL.
 */
export function safeRedirectUrl(raw: string): string {
	return /^\/(?![/\\])[^\s\\]*$/.test(raw) ? raw : DEFAULT_REDIRECT_URL;
}

export type LoginButtonVariant = "primary" | "secondary" | "accent";

export interface LoginButtonNodeProps {
	label: string;
	redirectUrl: string;
	variant: LoginButtonVariant;
}

/**
 * Builds the jahia-oauth connect-action URL the client XHRs against, e.g.
 * "/cms/render/live/fr/sites/sofinco/home.connectToSofincoAction.do".
 * `urlBase` comes from renderContext.getURLGenerator().getBase(), `siteHomePath` from
 * renderContext.getSite().getHome().getPath() — both resolved server-side in default.server.tsx.
 */
export function buildConnectUrl(urlBase: string, siteHomePath: string): string {
	return `${urlBase}${siteHomePath}.${CONNECT_ACTION}.do`;
}

export function mapLoginButtonProps(node: JCRNodeWrapper): LoginButtonNodeProps {
	const variant = str(node, "variant") as LoginButtonVariant;
	return {
		label: str(node, "buttonLabel") || DEFAULT_LABEL,
		redirectUrl: safeRedirectUrl(str(node, "redirectUrl")),
		variant: variant || "primary",
	};
}
