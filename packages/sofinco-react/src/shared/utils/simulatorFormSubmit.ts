import type { SyntheticEvent } from "react";

export interface SimulatorFormSubmitOptions {
	/** L'href complet du CTA, contenant possiblement un hash route Vue.js. */
	ctaHref?: string;
	/** "_blank" pour ouvrir dans un nouvel onglet, sinon navigation in-place. */
	ctaTarget?: string;
}

/**
 * Logique PURE de construction de l'URL de redirection simulateur — extraite du
 * handler `onSubmit` pour être testable en node (zéro DOM, zéro navigation).
 *
 * Le helper Jahia `buildSimulatorCtaUrl` produit des URLs avec un hash
 * (`#/montant-financement`) que le navigateur strippe lors d'un form GET natif.
 * On reconcatène donc `actionBase + (? | &) + params + hash`.
 *
 * @param ctaHref - L'href complet du CTA (peut porter une query et/ou un `#fragment`).
 * @param params  - Les inputs sérialisés du formulaire (FormData → URLSearchParams).
 * @returns L'URL finale à charger, ou `null` quand il n'y a rien à préserver
 *          (href absent, ou aucun hash → la soumission HTML native suffit).
 */
export function buildSimulatorSubmitUrl(
	ctaHref: string | undefined,
	params: URLSearchParams,
): string | null {
	if (!ctaHref) return null;
	const hashIdx = ctaHref.indexOf("#");
	if (hashIdx < 0) return null; // pas de hash → soumission native suffit

	const actionBase = ctaHref.slice(0, hashIdx);
	const hash = ctaHref.slice(hashIdx);
	const query = params.toString();
	const separator = actionBase.includes("?") ? "&" : "?";
	return `${actionBase}${query ? separator + query : ""}${hash}`;
}

/**
 * Factory du handler `onSubmit` pour les formulaires simulateur Sofinco.
 *
 * Glue DOM mince autour de {@link buildSimulatorSubmitUrl} :
 *   1. Sérialise les inputs du form (FormData → URLSearchParams)
 *   2. Délègue la construction d'URL à la fonction pure
 *   3. Navigue via `window.location.href` (ou `window.open` si target=_blank)
 *
 * Fallback gracieux :
 *   - Pas de hash dans l'href → `null` retourné → soumission native HTML (rien à préserver)
 *   - JS désactivé / non hydraté → soumission native vers `action=ctaHref`
 *     (le hash sera perdu mais le simulateur Vue.js route via query params)
 *
 * Utilisé par `<HeroSimulator>` (sofnt:simulatorCredit) et `<SimulatorBlock>`
 * (sofnt:simulatorBlock) — source unique de la logique de submit simulateur.
 */
export function createSimulatorFormSubmitHandler({
	ctaHref,
	ctaTarget,
}: SimulatorFormSubmitOptions): (event: SyntheticEvent<HTMLFormElement>) => void {
	return (event: SyntheticEvent<HTMLFormElement>) => {
		const formData = new FormData(event.currentTarget);
		const params = new URLSearchParams(formData as unknown as Record<string, string>);
		const finalUrl = buildSimulatorSubmitUrl(ctaHref, params);
		if (finalUrl === null) return; // rien à préserver → soumission native

		event.preventDefault();
		if (ctaTarget === "_blank") {
			window.open(finalUrl, "_blank", "noopener,noreferrer");
		} else {
			window.location.href = finalUrl;
		}
	};
}
