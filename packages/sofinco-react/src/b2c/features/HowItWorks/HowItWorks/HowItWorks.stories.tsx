import type { Meta, StoryObj } from "@storybook/react-vite";
import { HowItWorks } from "./HowItWorks";

const meta = {
	title: "B2C/HowItWorks",
	component: HowItWorks,
	parameters: {
		layout: "fullscreen",
	},
	argTypes: {
		imagePosition: {
			control: { type: "inline-radio" },
			options: ["left", "right"],
			description:
				"Position de la colonne image en desktop. Sans effet en mobile (image toujours au-dessus).",
			table: { defaultValue: { summary: "left" } },
		},
	},
} satisfies Meta<typeof HowItWorks>;

export default meta;
type Story = StoryObj<typeof meta>;

const steps = [
	{
		id: "1",
		badge: 1,
		title: "Je fais ma demande en ligne",
		description:
			"Quelques minutes suffisent. Réponse immédiate, pas de déplacement, pas de dossier.",
		imageUrl:
			"/images/samples/ProductPages/ProductCardPage/HowItWorks/commande-carte-bancaire-desktop.webp",
	},
	{
		id: "2",
		badge: 2,
		title: "Je reçois ma carte par courrier",
		description:
			"Les fonds sont virés sur votre compte bancaire en 48 h. Si vous avez demandé la Carte Sofinco, elle arrive par courrier.",
		imageUrl:
			"/images/samples/ProductPages/ProductCardPage/HowItWorks/reception-carte-bancaire-desktop.webp",
	},
	{
		id: "3",
		badge: 3,
		title: "Je profite de mes achats en pilotant mes dépenses grâce au débit en fin de mois",
		description:
			"La réserve se reconstitue automatiquement à chaque remboursement, sans nouvelle souscription. Disponible 7j/7 depuis l'app.",
		imageUrl:
			"/images/samples/ProductPages/ProductCardPage/HowItWorks/debit-fin-mois-carte-bancaire-desktop.webp",
	},
	{
		id: "4",
		badge: 4,
		title: "Je choisis mes modalités de paiement, pour chaque dépense, même après l'achat",
		description:
			"La réserve se reconstitue automatiquement à chaque remboursement, sans nouvelle souscription. Disponible 7j/7 depuis l'app.",
		imageUrl:
			"/images/samples/ProductPages/ProductCardPage/HowItWorks/arbitrage-paiement-desktop.webp",
	},
];

const transcriptionContent = `
	<p><strong>Pourquoi choisir la carte de crédit Sofinco ?</strong></p>
	<p>La carte de crédit Sofinco vous permet de régler vos achats au quotidien
	tout en pilotant votre budget : votre compte n'est débité qu'en fin de mois.</p>
	<p>Après chaque achat, vous choisissez librement de rembourser au comptant ou à crédit.</p>
`;

export const CarteBancaire: Story = {
	name: "Carte bancaire (page produit)",
	args: {
		title: {
			children: "Je pilote mes finances dès maintenant",
			as: "h2",
			visualStyle: "h2",
		},
		steps,
		cta: {
			label: "Je commande ma carte",
			variant: "primary",
			href: "#",
		},
		video: {
			title: {
				children: "Titre vidéo",
				as: "h2",
			},
			video: {
				url: "https://www.youtube-nocookie.com/embed/QfSm9j6KFNw",
				title: "Carte de crédit Sofinco, comment ça marche ?",
			},
			previewImg: {
				url: "https://images.unsplash.com/photo-1781461241820-a32cf22e10dd?q=80&w=3132&auto=format&fit=crop",
				alt: "",
			},
			transcription: {
				title: "Retranscription vidéo",
				content: transcriptionContent,
			},
		},
	},
};

export const Default: Story = { args: CarteBancaire.args };

/** Sans CTA ni vidéo : en-tête + parcours d'étapes seul (champs optionnels omis). */
export const SansCtaNiVideo: Story = {
	name: "Sans CTA ni vidéo",
	args: {
		title: {
			children: "Je pilote mes finances dès maintenant",
			as: "h2",
			visualStyle: "h2",
		},
		steps,
	},
};

/**
 * `imagePosition: "right"` — la colonne image passe à droite des étapes en desktop.
 * L'ordre du DOM est inchangé (image en premier, décorative) : seul le rendu bascule,
 * l'ordre de lecture au clavier et au lecteur d'écran reste identique. En mobile,
 * la prop est sans effet — l'image reste au-dessus de l'étape active.
 */
export const ImageADroite: Story = {
	name: "Image à droite",
	args: {
		...Default.args,
		imagePosition: "right",
	},
};

const creditRenouvelableTranscriptionContent = `
	<p><strong>C'est quoi un crédit renouvelable ?</strong></p>
	<p>Le crédit renouvelable met à votre disposition une réserve d'argent que vous utilisez
	selon vos besoins, en totalité ou en partie.</p>
	<p>Au fur et à mesure de vos remboursements, le montant disponible se reconstitue
	automatiquement, sans nouvelle souscription.</p>
`;

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		title: {
			children: "Comment obtenir mon crédit renouvelable en ligne ?",
			as: "h2",
			visualStyle: "h2",
		},
		subtitle: "Des fonds disponibles et utilisables en 3 clics seulement",
		steps: [
			{
				id: "1",
				badge: 1,
				title: "Je souscris en ligne",
				description:
					"Simulez votre montant, remplissez le formulaire, obtenez une réponse de principe immédiate(4) et signez électroniquement(5) votre contrat.",
				imageUrl:
					"/images/samples/ProductPages/ProductCreditPage/HowItWorks/simulation-souscription-credit-renouvelable-desktop.webp",
			},
			{
				id: "2",
				badge: 2,
				title: "Je reçois mes fonds",
				description:
					"Les fonds sont virés sur votre compte bancaire en 48h(6). Si vous avez demandé la Carte Sofinco, elle vous est envoyée par courrier.",
				imageUrl:
					"/images/samples/ProductPages/ProductCreditPage/HowItWorks/virements-fonds-credit-renouvelable-desktop.webp",
			},
			{
				id: "3",
				badge: 3,
				title: "Je l'utilise à nouveau si besoin",
				description:
					"Le montant disponible de votre crédit renouvelable se reconstitue automatiquement à chaque remboursement, sans nouvelle souscription. Disponible 7j/7 depuis l'app.",
				imageUrl:
					"/images/samples/ProductPages/ProductCreditPage/HowItWorks/reconstitution-credit-renouvelable-desktop.webp",
			},
		],
		video: {
			title: {
				children: "Le crédit renouvelable, comment ça marche ?",
				as: "h2",
			},
			video: {
				url: "https://www.youtube-nocookie.com/embed/QfSm9j6KFNw",
				title: "C'est quoi un crédit renouvelable ?",
			},
			previewImg: {
				url: "https://images.unsplash.com/photo-1781461241820-a32cf22e10dd?q=80&w=3132&auto=format&fit=crop",
				alt: "",
			},
			transcription: {
				title: "Retranscription vidéo",
				content: creditRenouvelableTranscriptionContent,
			},
		},
	},
};

const pretPersoTranscriptionContent = `
	<p><strong>Le prêt personnel, comment ça marche ?</strong></p>
	<p>Retranscription à compléter avec la copie finale du design.</p>
`;

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		title: {
			children: "Je découvre le prêt personnel dès maintenant",
			as: "h2",
			visualStyle: "h2",
		},
		subtitle: "Je finance mon projet en confiance.",
		steps: [
			{
				id: "1",
				badge: 1,
				title: "Je simule et je souscris en ligne",
				description:
					"Choisissez votre montant et votre durée, obtenez une réponse définitive en quelques minutes(1), et signez votre contrat en ligne(4) depuis chez vous.",
				imageUrl:
					"/images/samples/ProductPages/ProductLoanPage/ScrollSteps/simulation-souscription-pret-perso-desktop.webp",
			},
			{
				id: "2",
				badge: 2,
				title: "Je reçois les fonds sur mon compte(5)",
				description:
					"Une fois votre dossier validé, le montant emprunté est versé en une seule fois sur votre compte bancaire.",
				imageUrl:
					"/images/samples/ProductPages/ProductLoanPage/ScrollSteps/transferd-fonds-pret-perso-desktop.webp",
			},
			{
				id: "3",
				badge: 3,
				title: "Je rembourse à mensualités fixes",
				description:
					"Chaque mois, le même montant est prélevé. À la fin du remboursement, votre prêt est terminé. Aucun renouvellement automatique.",
				imageUrl:
					"/images/samples/ProductPages/ProductLoanPage/ScrollSteps/mensualite-fixe-pret-perso-desktop.webp",
			},
			{
				id: "4",
				badge: "check",
				title: "Crédit remboursé : c'est terminé.",
				// La maquette n'affiche aucun texte sous ce titre (carte terminale, juste le check + le titre).
				description: "",
				imageUrl:
					"/images/samples/ProductPages/ProductLoanPage/ScrollSteps/pret-perso-solde-desktop.webp",
			},
		],
		video: {
			title: {
				children: "Le prêt personnel, comment ça marche ?",
				as: "h2",
			},
			video: {
				url: "https://www.youtube-nocookie.com/embed/QfSm9j6KFNw",
				title: "Le prêt personnel, comment ça marche ?",
			},
			previewImg: {
				url: "https://images.unsplash.com/photo-1781461241820-a32cf22e10dd?q=80&w=3132&auto=format&fit=crop",
				alt: "",
			},
			transcription: {
				title: "Retranscription vidéo",
				content: pretPersoTranscriptionContent,
			},
		},
	},
};
