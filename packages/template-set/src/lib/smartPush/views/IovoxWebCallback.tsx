/* Le bootstrap iovox doit être inline pour s'exécuter au parsing SSR : le bouton
 * déclencheur est injecté par Smart Tribune à un moment que nous ne maîtrisons pas, et le
 * délégué de clic doit déjà être en place quand il apparaît. */
/* eslint-disable @eslint-react/dom/no-dangerously-set-innerhtml */
import iovoxWebCallbackBootstrap from "../iovox-webcallback-bootstrap.ts?inline-script";
import { ICONS } from "sofinco-react";
import { useAppTranslation } from "#lib/i18n";
import classes from "./iovoxWebCallback.module.css";

/** Icône du design system, comme la croix du menu mobile. Elle porte son `aria-hidden`. */
const CloseIcon = ICONS.x;

/**
 * Server-only view carrying the iovox "rappel immédiat" modal. Rendered by `NavMenu`
 * (live/preview branch) next to `SmartPushScript`, under the same `smartPushConfig` guard:
 * the trigger button only ever exists inside the Smart Tribune panel, so the two share a
 * lifetime.
 *
 * The `<dialog>` is native — it supplies the scrim, Escape-to-close and the focus trap,
 * which is the whole of what Bootstrap did for this modal on the legacy site.
 *
 * `iovoxWebCallback` / `iovoxWebCallbackBody` / `iovoxIframe` are the bootstrap's only
 * hooks into this markup: CSS Module class names are hashed at build time, so they cannot
 * serve as selectors. Renaming any of them means editing `iovox-webcallback-bootstrap.ts`
 * in the same commit.
 *
 * The header bar is a LAST RESORT, not standard chrome. The iovox form renders its own
 * header — logo and close button — as soon as it arrives, on phones as much as on desktop,
 * and its close posts `iovox_wcb_close` back to us. Showing ours alongside it would stack
 * two crosses and two titles.
 *
 * It earns its place only when the form never arrives (ad blocker, network, CSP): iovox's
 * close button does not exist either then, and below 48rem nothing else gets the user out —
 * no Escape key on a phone, and the full-screen dialog leaves an 8px strip of backdrop to
 * aim at. The bootstrap therefore reveals this bar only after the iframe has failed to
 * load (`data-iovox-stalled`), and it sits OUTSIDE the iframe where it cannot collide.
 *
 * The title stays visually hidden throughout — it is the dialog's accessible name, not a
 * heading anyone needs to read.
 *
 * ASSUMPTION: `NavMenu` is rendered once per page. The three ids below depend on it — a
 * second render would produce homonyms, and `getElementById` would only ever see the first.
 * The bootstrap's `__IOVOX_WCB_BOOT__` guard protects the LISTENERS, not the markup: it
 * would not catch that case.
 *
 * The iframe ships WITHOUT `src` — the bootstrap sets it on the first click, from the
 * account id and key it reads off the Smart Tribune button.
 */
export default function IovoxWebCallback() {
	const { t } = useAppTranslation();

	return (
		<>
			<dialog
				id="iovoxWebCallback"
				className={classes.dialog}
				aria-labelledby="iovoxWebCallbackTitle"
			>
				<div className={classes.header}>
					<h2 id="iovoxWebCallbackTitle" className={classes.title}>
						{t("iovoxWebCallback.title")}
					</h2>

					<button
						type="button"
						data-iovox-close
						className={classes.close}
						aria-label={t("a11y.iovoxClose")}
					>
						<CloseIcon />
					</button>
				</div>

				<div id="iovoxWebCallbackBody" className={classes.body}>
					<iframe
						id="iovoxIframe"
						className={classes.iframe}
						/* L'URL de la page porte le parcours client (page produit, simulateur,
						   étape) et partirait telle quelle dans le `Referer` vers un tiers. */
						referrerPolicy="no-referrer"
						/* Nom accessible de la frame, pas de l'éditorial : il reste hors CND pour
						   qu'on ne puisse pas casser la conformité RGAA en silence. */
						title={t("a11y.iovoxFormTitle")}
					/>
				</div>
			</dialog>

			<script dangerouslySetInnerHTML={{ __html: iovoxWebCallbackBootstrap }} />
		</>
	);
}
