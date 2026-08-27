import { jahiaComponent } from "@jahia/javascript-modules-library";
import { useAppTranslation } from "#lib/i18n";
import { isEditMode } from "#lib/renderContext";
import {
	mapRepresentativeExampleProps,
	mapRepresentativeExampleServerProps,
	mapEmptyRepresentativeExampleProps,
} from "./representativeExample.mapping";
import {
	renderRepresentativeExampleClient,
	renderRepresentativeExampleServer,
	renderEmptyRepresentativeExample,
} from "./representativeExample.render";

/**
 * Entry point Jahia pour `sofnt:representativeExample`.
 *
 * Architecture moderne : données simulateur via le mixin `sofmix:simulatorCta`
 * directement sur le node (pas de child). Le bridge Java OSGi lit le mixin via
 * la même méthode publique `RepresentativeExampleBridge.getExample(node)`.
 */
export default jahiaComponent(
	{
		nodeType: "sofnt:representativeExample",
		displayName: "Exemple représentatif",
		componentType: "view",
		properties: {
			/*
			 * NE PAS RETIRER au motif que `SimulationCacheKeyPartGenerator` existe.
			 *
			 * Le générateur ne couvre que l'empreinte de SIMULATION — produit, montant, durée,
			 * barème, sourceId. Or ce composant rend aussi un CTA dont `idcatorigin` retombe sur
			 * la propriété `idcat` de la PAGE (spmix:eaPageOptions, cf. `mapSimulatorCtaInput`),
			 * qui n'entre dans aucune de ces deux clés.
			 *
			 * Sans cette propriété, deux pages aux mêmes paramètres de simulation mais aux `idcat`
			 * distincts partageraient le fragment : la seconde servirait le paramètre de suivi
			 * marketing de la première. Une erreur silencieuse, dans un champ que personne ne
			 * relit avant longtemps.
			 *
			 * Le retrait suppose donc d'abord de faire entrer `idcat` dans l'empreinte, ou de
			 * supprimer ce repli sur la page. Les deux mécanismes coexistent en attendant, sans
			 * se contredire : le générateur sert les richtexts de toute la page, celle-ci ne
			 * concerne que ce composant.
			 */
			"cache.mainResource": "true",
			"cache.expiration": "3600",
		},
	},
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();

		if (isEditMode(renderContext)) {
			return renderRepresentativeExampleServer(
				mapRepresentativeExampleServerProps(currentNode, renderContext, t),
			);
		}

		const props = mapRepresentativeExampleProps(currentNode, renderContext, t);
		if (!props) {
			// Bridge OSGi absent ou exemple introuvable → mode dégradé (titre + CTA).
			console.warn(
				`[RepresentativeExample] données indisponibles pour ${currentNode.getPath()} ` +
					`— bridge OSGi absent ou exemple introuvable.`,
			);
			return renderEmptyRepresentativeExample(
				mapEmptyRepresentativeExampleProps(currentNode, renderContext, t),
			);
		}
		return renderRepresentativeExampleClient(props);
	},
);
