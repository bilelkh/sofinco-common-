import { useRef } from "react";
import { Cta } from "sofinco-react";
import type { LoginButtonVariant } from "../loginButton.mapping";

/**
 * Max time we keep the `message` listener alive after opening the popup. If the popup is closed
 * manually, blocked by COOP, or never posts back, the listener is removed anyway so it can't leak
 * or stack across repeated clicks.
 */
const MESSAGE_LISTENER_MAX_LIFETIME_MS = 5 * 60 * 1000;

export interface LoginButtonClientProps {
	/** Visible button label. */
	label: string;
	/** sofinco-react Cta variant. */
	variant: LoginButtonVariant;
	/** Post-login destination (already defaulted + same-origin-validated server-side, see safeRedirectUrl). */
	redirectUrl: string;
	/** Current site key, appended as ?site=<siteKey> so jahia-authentication's SSOValve performs the login. */
	siteKey: string;
	/** Pre-built jahia-oauth connect-action URL (e.g. "/cms/render/live/fr/sites/sofinco/home.connectToSofincoAction.do"). */
	connectUrl: string;
}

/**
 * Sofinco OAuth login button.
 *   popup -> XHR .connectToSofincoAction.do -> jahia-oauth returns the IdP authorize URL ->
 *   popup redirects there -> on the callback's postMessage, reload with ?site=<siteKey> so the
 *   SSOValve performs the actual Jahia login.
 * Hardenings over the JSP: same-origin check on the message event + listener cleanup (the JSP leaked it),
 * guarded JSON parse + network error/timeout handlers that close the popup instead of leaving it blank.
 * SSR-safe: no state, no window access at render — only inside the click handler.
 */
export default function LoginButtonClient({
	label,
	variant,
	redirectUrl,
	siteKey,
	connectUrl,
}: LoginButtonClientProps) {
	// Guards against a second flow starting while one is already in-flight — stops repeated clicks
	// from stacking concurrent popups and redirect handlers.
	const inFlightRef = useRef(false);

	const onClick = () => {
		if (inFlightRef.current) return;

		const popup = window.open(
			"",
			"Sofinco Authorization",
			"menubar=no,status=no,scrollbars=no,width=1145,height=725",
		);
		if (!popup) return;

		inFlightRef.current = true;

		// Closes the popup and clears the in-flight lock on any terminal path (error, abort, done),
		// so the next click can start a fresh flow.
		const abandon = () => {
			popup.close();
			inFlightRef.current = false;
		};

		const xhr = new XMLHttpRequest();
		xhr.open("GET", connectUrl);
		xhr.setRequestHeader("Accept", "application/json;");
		// Bound the request so a stalled server can't leave the popup hanging — makes ontimeout reachable.
		xhr.timeout = 15000;
		// Any failure (HTTP error, malformed body, network error, timeout) closes the popup so the user
		// never sees a silently-stuck blank window.
		xhr.onerror = abandon;
		xhr.ontimeout = abandon;
		xhr.onreadystatechange = () => {
			if (xhr.readyState !== 4) return;
			if (xhr.status !== 200) {
				abandon();
				return;
			}

			let authorizationUrl: string;
			try {
				({ authorizationUrl } = JSON.parse(xhr.responseText) as { authorizationUrl: string });
			} catch {
				abandon();
				return;
			}
			if (!authorizationUrl) {
				abandon();
				return;
			}
			popup.location.href = authorizationUrl;

			// Bounded-lifetime listener: if the popup is closed manually, blocked by COOP, or never
			// posts back, cleanupTimer removes the listener and releases the in-flight lock so it can't
			// leak or stack across repeated clicks.
			const cleanupTimer = setTimeout(() => {
				window.removeEventListener("message", onMessage);
				inFlightRef.current = false;
			}, MESSAGE_LISTENER_MAX_LIFETIME_MS);
			const onMessage = (event: MessageEvent) => {
				// Hardening vs the legacy JSP: drop cross-origin messages and unsubscribe once handled.
				if (event.origin !== window.location.origin) return;
				const data = event.data as { authenticationIsDone?: boolean; isAuthenticate?: boolean };
				if (!data?.authenticationIsDone) return;
				window.removeEventListener("message", onMessage);
				clearTimeout(cleanupTimer);
				setTimeout(() => {
					abandon();
					if (data.isAuthenticate) {
						const separator = redirectUrl.includes("?") ? "&" : "?";
						window.location.href = `${redirectUrl}${separator}site=${siteKey}`;
					}
				}, 1500);
			};
			window.addEventListener("message", onMessage);
		};
		xhr.send();
	};

	return (
		<Cta label={label} variant={variant} onClick={onClick} tracking={{ event: "login_oauth" }} />
	);
}
