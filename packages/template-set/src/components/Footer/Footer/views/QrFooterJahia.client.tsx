import { QrFooter } from "sofinco-react";
import type { QrProps } from "sofinco-react";

/**
 * Pont d'hydratation pour la zone QR / CTA du footer.
 *
 * `export default function` obligatoire : le tagging `__filename` du plugin Vite ne se
 * déclenche que sur cette forme. Un ré-export (`export { QrFooter as default }`) serait
 * tree-shaké vers l'export brut du design system, et `<Island>` émettrait alors
 * `data-src="/modules/sofinco-template/undefined.js"` → 404.
 *
 * Raison d'être : le reste du footer est rendu par GraalVM et n'est jamais hydraté. Sans cet
 * îlot, `useMobileAppHref` reste figé sur son instantané serveur et l'arbitrage iOS / Android
 * du CTA de téléchargement ne s'exécute jamais.
 */
export default function QrFooterJahia(props: Readonly<QrProps>) {
	return <QrFooter {...props} />;
}
