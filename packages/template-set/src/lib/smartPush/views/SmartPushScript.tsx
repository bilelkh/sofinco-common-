/* Le bootstrap Smart Tribune doit être inline pour s'exécuter au parsing SSR (même
 * contrainte que les scripts de tracking dans Layout.tsx). */
/* eslint-disable @eslint-react/dom/no-dangerously-set-innerhtml */
import { buildSmartPushInitScript, type SmartPushConfig } from "../smartPush.mapping";

/**
 * Server-only view that injects the Smart Tribune PUSH bootstrap once per page. Rendered
 * by `NavMenu` (live/preview branch) next to the Menu Island when the MySpace
 * `showSmartPush` flag is on and the shared `spnt:smartPush` config resolves. The actual
 * trigger button is a `Link` fed into the Menu (see `buildSmartPushLink`); this component
 * only carries the inline loader that lazy-loads `push.main.js` on the first click.
 */
export default function SmartPushScript({ cfg }: { cfg: SmartPushConfig }) {
	return <script dangerouslySetInnerHTML={{ __html: buildSmartPushInitScript(cfg) }} />;
}
