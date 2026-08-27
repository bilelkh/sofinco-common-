import { jahiaComponent, Island } from "@jahia/javascript-modules-library";

import { HeroSimulator } from "sofinco-react";
import { useAppTranslation } from "#lib/i18n";
import { mapSimulatorProps } from "./simulator.mapper";
import SimulatorCreditJahia from "./SimulatorCreditJahia.client";

export default jahiaComponent(
	{ nodeType: "sofnt:simulatorCredit", displayName: "Hero Simulator", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();
		const props = mapSimulatorProps(currentNode, renderContext, t);
		if (renderContext.isEditMode()) {
			return <HeroSimulator {...props} />;
		}
		// Hydratation obligatoire : le champ montant est contrôlé (séparateur de
		// milliers) et la valeur soumise passe par un input caché alimenté par le
		// state React — sans Island, le CTA partirait avec `amount=` vide.
		return <Island component={SimulatorCreditJahia} props={props} />;
	},
);
