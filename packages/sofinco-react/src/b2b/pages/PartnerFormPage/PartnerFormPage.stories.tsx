// PartnerFormPage link in dev mode : http://localhost:6006/iframe.html?id=pages-b2b-partnerformpage--default&viewMode=story

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";

import type { MultiStepFormValues } from "@b2b/features/MultiStepForm";
import * as FormHeroStories from "@b2b/features/FormHero/FormHero.stories";
import * as MultiStepFormStories from "@b2b/features/MultiStepForm/MultiStepForm.stories";
import * as SocialProofStories from "@b2b/features/SocialProof/SocialProof.stories";

/*
 * Barre, bandeau, formulaire et preuve sociale sont repris de leurs stories respectives :
 * une page n'a à redéclarer ni une navigation, ni une accroche, ni un parcours, ni des
 * témoignages, et deux copies divergeraient à la première évolution de la maquette.
 *
 * La barre est prise dans sa variante « sans rubrique courante » et non dans l'aperçu :
 * « Devenir partenaire » est un CTA de la barre, pas une entrée de premier niveau. Aucune
 * pastille blanche ne doit donc s'allumer — l'aperçu, lui, désigne « Accueil » comme
 * courante, ce qui reviendrait à annoncer une page où l'on n'est pas.
 */

const { Default: Hero } = composeStories(FormHeroStories);
const { Default: Form } = composeStories(MultiStepFormStories);

/*
 * Preuve sociale reprise de sa propre story, comme le reste de la page. Les témoignages
 * y sont ceux de la maquette : en production ils viennent de Jahia, au même titre que le
 * titre et l'accroche.
 */
const { Default: SocialProof } = composeStories(SocialProofStories);

/**
 * Page « Devenir partenaire » — assemblage des composants que Jahia pilote :
 * `FormHero` reçoit son titre et son accroche du CMS, `MultiStepForm` reçoit sa
 * configuration d'étapes et remonte les valeurs complètes via `onSubmit`, et
 * `SocialProof` ses témoignages. Ce composant de démonstration tient le rôle du
 * parent Jahia.
 *
 * `SocialProof` est posé APRÈS le bandeau, pas dans son emplacement chevauchant : ce
 * dernier impose un gabarit de 660px à ce qu'il reçoit (`.form-hero__slot > *`), qui
 * écraserait le carrousel pleine largeur. Les deux blocs partagent le même fond
 * `--color-primary-surface`, la couture est donc invisible.
 */
const PartnerFormPage = () => {
	const [submitted, setSubmitted] = useState<MultiStepFormValues>();

	return (
		<>
			{/*
			 * `Menu` rend un simple `div` : la barre collante du B2C vit dans son
			 * `Header`, qui est propre à cette marque. Le B2B n'a pas encore d'enveloppe
			 * équivalente, la barre reste donc dans le flux.
			 */}
			<Hero>
				{/* Côté Jahia : appel du service de dépôt de candidature partenaire. */}
				<Form onSubmit={(values) => setSubmitted(values)} />

				{submitted && (
					<pre
						style={{
							maxWidth: 660,
							margin: "calc(var(--spacing) * 6) auto 0",
							padding: "calc(var(--spacing) * 6)",
							background: "var(--color-white)",
							borderRadius: "var(--radius-lg)",
							overflowX: "auto",
						}}
					>
						{JSON.stringify(submitted, null, 2)}
					</pre>
				)}
			</Hero>

			<SocialProof />
		</>
	);
};

const meta = {
	title: "Pages/B2B/PartnerFormPage",
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Parcours complet. Les valeurs remises à `onSubmit` sont affichées sous la carte
 * une fois la dernière étape validée — c'est le point de sortie vers Jahia.
 */
export const Default: Story = {
	render: () => <PartnerFormPage />,
};
