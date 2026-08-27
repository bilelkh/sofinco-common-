import { jahiaComponent } from "@jahia/javascript-modules-library";
import { mapHowItWorksStep } from "./howItWorksStep.mapping";
import { HowItWorksStepServer } from "./views/HowItWorksStepServer";

/**
 * Le node `sofnt:howItWorksStep` n'a pas de rendu indépendant en live :
 * c'est le container `sofnt:howItWorks` qui agrège ses enfants et délègue
 * l'affichage au composant React via <Island>.
 *
 * En mode édition, Jahia rend chaque enfant via <RenderChildren> côté
 * container → cette fonction est appelée pour chaque étape, ce qui injecte
 * les wrappers d'édition (clic-pour-éditer, drag-and-drop, suppression).
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:howItWorksStep",
		displayName: "How It Works — Step",
		componentType: "view",
	},
	(_, { currentNode }) => {
		const props = mapHowItWorksStep(currentNode);
		return <HowItWorksStepServer {...props} />;
	},
);
