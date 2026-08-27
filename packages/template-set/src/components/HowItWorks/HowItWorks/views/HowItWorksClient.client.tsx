import type { HowItWorksProps } from "sofinco-react";
import { HowItWorks } from "sofinco-react";

/**
 * Client wrapper pour hydratation via `<Island>`.
 *
 * Pourquoi ce fichier existe ?
 * La lib `@jahia/javascript-modules-library` attend un COMPOSANT LOCAL (dans le
 * dossier template-set) comme argument de `<Island component={...} />`, pas
 * un composant importé depuis un package externe (`sofinco-react`). On enroule
 * donc `<HowItWorks>` du DS dans ce thin wrapper local — sinon Vite ne détecte
 * pas les dépendances pour le bundle client.
 *
 * L'extension `.client.tsx` est significative : elle indique à la lib Jahia
 * que ce composant doit être bundlé côté client (hydratation), pas SSR-only.
 */
export default function HowItWorksClient(props: HowItWorksProps) {
	return <HowItWorks {...props} />;
}
