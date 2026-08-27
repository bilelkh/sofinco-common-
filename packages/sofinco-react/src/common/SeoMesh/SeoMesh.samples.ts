// Données d'exemple partagées par les stories SeoMesh (fichier hors CSF pour
// éviter d'exporter des non-stories depuis un *.stories.tsx).

export const creditBlock = {
	id: "credit",
	title: "Besoin d'un crédit ?",
	ctaProps: {
		href: "/credit-conso",
		label: "Je fais un crédit conso",
		type: "button" as const,
		variant: "accent" as const,
		size: "small" as const,
		iconRight: "arrow-right" as const,
	},
	linkSectionLeft: {
		title: "Simulez vos crédits",
		links: [
			{ href: "/simulation-credit", label: "Simulation crédit", iconLeft: "arrow-right" as const },
			{
				href: "/simulation-credit-auto",
				label: "Simulation crédit auto",
				iconLeft: "arrow-right" as const,
			},
			{
				href: "/simulation-credit-travaux",
				label: "Simulation crédit travaux",
				iconLeft: "arrow-right" as const,
			},
			{
				href: "/simulation-pret-personnel",
				label: "Simulation prêt personnel",
				iconLeft: "arrow-right" as const,
			},
			{
				href: "/simulation-credit-renouvelable",
				label: "Simulation crédit renouvelable",
				iconLeft: "arrow-right" as const,
			},
			{
				href: "/simulation-rachat-credit",
				label: "Simulation rachat de crédit",
				iconLeft: "arrow-right" as const,
			},
		],
	},
	linkSectionRight: {
		title: "Nos offres de crédit",
		links: [
			{ href: "/credit-4000", label: "Crédit 4 000€", iconLeft: "arrow-right" as const },
			{ href: "/credit-5000", label: "Crédit 5 000€", iconLeft: "arrow-right" as const },
			{ href: "/credit-10000", label: "Crédit 10 000€", iconLeft: "arrow-right" as const },
			{ href: "/credit-20000", label: "Crédit 20 000€", iconLeft: "arrow-right" as const },
			{ href: "/credit-30000", label: "Crédit 30 000€", iconLeft: "arrow-right" as const },
			{ href: "/credit-50000", label: "Crédit 50 000€", iconLeft: "arrow-right" as const },
		],
	},
};

export const epargneBlock = {
	id: "epargne",
	title: "Envie d'épargner ?",
	ctaProps: {
		href: "/epargne",
		label: "Découvrir l'épargne",
		type: "button" as const,
		variant: "accent" as const,
		size: "small" as const,
		iconRight: "arrow-right" as const,
	},
	linkSectionLeft: {
		title: "Produits d'épargne",
		links: [
			{ href: "/livret-a", label: "Livret A", iconLeft: "arrow-right" as const },
			{
				href: "/pel",
				label: "Plan Épargne Logement",
				iconLeft: "arrow-right" as const,
			},
			{
				href: "/assurance-vie",
				label: "Assurance vie",
				iconLeft: "arrow-right" as const,
			},
			{
				href: "/per",
				label: "Plan Épargne Retraite",
				iconLeft: "arrow-right" as const,
			},
		],
	},
	linkSectionRight: {
		title: "Conseils épargne",
		links: [
			{
				href: "/guide/bien-epargner",
				label: "Comment bien épargner",
				iconLeft: "arrow-right" as const,
			},
			{
				href: "/guide/fiscalite",
				label: "Fiscalité de l'épargne",
				iconLeft: "arrow-right" as const,
			},
			{
				href: "/guide/placements",
				label: "Choisir ses placements",
				iconLeft: "arrow-right" as const,
			},
		],
	},
};
