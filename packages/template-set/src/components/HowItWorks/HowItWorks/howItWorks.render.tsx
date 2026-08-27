import { Island } from "@jahia/javascript-modules-library";
import type { HowItWorksProps } from "sofinco-react";
import type { HowItWorksPropsServer } from "./howItWorks.types";
import { HowItWorksServer } from "./views/HowItWorksServer";
import HowItWorksClient from "./views/HowItWorksClient.client";

/**
 * En live : on hydrate côté client via une <Island>, car le composant a besoin
 * de l'IntersectionObserver et des handlers hover/focus pour piloter l'étape
 * active (R.G. 3).
 */
export function renderHowItWorksClient(props: HowItWorksProps) {
	return <Island component={HowItWorksClient} props={props} />;
}

/**
 * En édition : on rend la version serveur qui injecte les <AddContentButtons>
 * pour permettre à l'auteur d'ajouter/réordonner des étapes inline.
 */
export function renderHowItWorksServer(props: HowItWorksPropsServer) {
	return <HowItWorksServer {...props} />;
}
