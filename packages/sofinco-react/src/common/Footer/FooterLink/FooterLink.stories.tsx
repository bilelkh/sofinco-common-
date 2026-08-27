import type { Meta, StoryObj } from "@storybook/react-vite";
import { FooterLink } from "./FooterLink";

/*
 * Le bouton de consentement N'EXISTAIT que dans la story `Footer` complète, noyé au milieu
 * de quatorze liens légaux. Impossible d'y vérifier d'un coup d'œil ce qui compte ici :
 * l'indicateur de focus clavier — que la branche avait justement supprimé — et le fait que
 * l'entrée soit bien un `<button>` et non un `<a>`.
 *
 * L'addon a11y de Storybook tourne sur chaque story : isoler celle-ci lui donne une cible
 * nette plutôt qu'un pied de page entier où le contrôle se perd.
 */

const meta = {
	title: "Common/Footer/FooterLink",
	component: FooterLink,
	args: {
		id: "legal",
		label: "Politique des données personnelles",
		href: "#",
		size: "small",
	},
	argTypes: {
		size: { control: "inline-radio", options: ["small", "medium"] },
		isConsent: { control: "boolean" },
		target: { control: "inline-radio", options: ["_self", "_blank"] },
	},
	parameters: { layout: "centered" },
	/*
	 * Fond obligatoire : `.link` peint le texte en blanc à 70 %, calibré pour le navy le
	 * plus sombre du pied de page (`--sof-primary-contrast`). Sur le blanc par défaut de
	 * Storybook, la story serait illisible — et l'addon a11y remonterait un faux défaut de
	 * contraste qui n'existe nulle part en production.
	 */
	decorators: [
		(Story) => (
			<div style={{ background: "var(--sof-primary-contrast)", padding: "2rem" }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof FooterLink>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Entrée de navigation ordinaire — rendue en `<a>`. */
export const Default: Story = {};

/**
 * Entrée « Gérer mes cookies » : un `<button>` porteur de `data-consent-action`, ouvert par
 * le délégué de clic du `<head>`. Inerte dans Storybook, aucun SDK Didomi n'y étant chargé —
 * c'est l'apparence et la sémantique que cette story sert à vérifier, pas le comportement.
 *
 * **À contrôler au clavier** : `Tab` doit faire apparaître la surbrillance de focus. Son
 * absence est un échec WCAG 2.4.7 (AA), sur le seul contrôle permettant à un utilisateur de
 * revenir sur son consentement.
 */
export const Consent: Story = {
	args: { id: "consent", label: "Gérer mes cookies", isConsent: true },
};

/** Le libellé est contribué : il peut porter un renvoi vers une mention légale. */
export const ConsentWithFootnote: Story = {
	args: { id: "consent", label: "Gérer mes cookies ⁽¹⁾", isConsent: true },
};
