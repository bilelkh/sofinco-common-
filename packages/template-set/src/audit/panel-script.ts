/*
 * Le script du bandeau de contrôle, prêt à être inséré en ligne dans la page.
 *
 * Miroir de `#lib/footnotes-script` pour le site public : le plugin Vite `?inline-script`
 * transforme le module en IIFE minifiée, que `Layout.tsx` écrit dans un `<script>` — le seul
 * moyen de rendre un script inline en SSR.
 *
 * Il n'est écrit dans la page qu'en mode édition. Le visiteur n'en reçoit jamais un octet.
 */
import auditPanel from "./panel-bootstrap.ts?inline-script";

export { auditPanel };
