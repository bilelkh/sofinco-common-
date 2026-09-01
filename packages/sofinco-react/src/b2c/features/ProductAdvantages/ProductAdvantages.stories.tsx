import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProductAdvantages } from "./ProductAdvantages";
import type { ProductAdvantageCategory } from "./ProductAdvantages.type";

const categories: ProductAdvantageCategory[] = [
	{
		id: "paiement-fractionne",
		label: "Paiement fractionné",
		title: "Je choisis comment rembourser chaque achat, même après avoir payé.",
		text: "<p>Avec la carte Sofinco associée à votre crédit renouvelable<sup>(1)</sup>, c'est vous qui décidez : à chaque achat, vous choisissez de régler comptant ou d'étaler le paiement.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/paiement-fractionne-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/paiement-fractionne-carte-bancaire-mobile.webp",
		imageAlt: "Une personne payant par carte bancaire chez un commerçant.",
	},
	{
		id: "praticite",
		label: "Praticité",
		title: "Je paie où je veux, chez qui je veux",
		text: "<p>Acceptée chez tous les commerçants du réseau Visa en France et à l'étranger, cette carte de crédit renouvelable peut être utilisée comme n'importe quelle carte : pour vos paiements en ligne, en magasins et même vos retraits. Et en plus, elle est compatible Apple Pay !</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-mobile.webp",
		imageAlt: "Une personne payant sans contact avec sa carte bancaire Sofinco.",
	},
	{
		id: "assurance",
		label: "Assurance",
		title: "Je profite de garanties incluses gratuitement",
		text: "<p>Chaque achat réglé avec la carte Sofinco est couvert de façon concrète : l'Extension de Garantie Constructeur vous permet d'allonger automatiquement la garantie de vos appareils, la Garantie Vol et Casse prend en charge le remboursement d'un produit réglé avec votre carte en cas de vol ou de casse dans les 30 jours suivant l'achat, la Garantie Livraison Internet couvre vos colis perdus comme endommagés.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/assurance-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/assurance-carte-bancaire-mobile.webp",
		imageAlt: "Une bouée de sauvetage symbolisant les garanties incluses avec la carte.",
	},
	{
		id: "credit-renouvelable-associe",
		label: "Crédit renouvelable associé",
		title: "J'utilise mon crédit comme bon me semble, l'esprit libre",
		text: "<p>La carte Sofinco, c'est bien plus qu'une carte de crédit. Elle est associée à un crédit renouvelable. C'est un montant disponible<sup>(8)</sup> jusqu'à 21 500€, que vous pouvez utiliser sous réserve du montant effectivement accessible et du bon fonctionnement de votre compte (remboursements honorés, absence d'impayés…). Vous pouvez l'utiliser comptant ou à crédit, sans attendre.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/credit-renouvelable-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/credit-renouvelable-carte-bancaire-mobile.webp",
		imageAlt: "Une personne consultant son crédit renouvelable associé à sa carte.",
	},
	{
		id: "souplesse",
		label: "Souplesse",
		title: "J'ai la main sur mes mensualités",
		text: "<p>Je les mets en pause<sup>(3)</sup> en cas de besoin.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/souplesse-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/souplesse-carte-bancaire-mobile.webp",
		imageAlt: "Une personne mettant en pause ses mensualités depuis l'app Sofinco.",
	},
];

/** Jeu de catégories générique (6 items) conservé uniquement pour le test structurel `ThreeCategories`. */
const genericCategories: ProductAdvantageCategory[] = [
	{
		id: "reserve-argent",
		label: "Réserve d'argent",
		title: "Une réserve d'argent disponible",
		text: "<p>Disposez d'une réserve d'argent <strong>réutilisable</strong> au fur et à mesure de vos remboursements, sans nouvelle demande à chaque fois.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-mobile.webp",
		imageAlt: "Une cliente dispose d'une réserve d'argent au quotidien.",
	},
	{
		id: "etalement",
		label: "Étalement",
		title: "Étalez après avoir payé",
		text: "<p>Vous avez déjà réglé vos courses, votre billet d'avion, votre canapé. Depuis l'app, choisissez de les rembourser en <strong>3, 12 ou 60 mensualités</strong>. Sans rien faire au moment du paiement.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/souplesse-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-mobile.webp",
		imageAlt: "Une cliente étale ses achats après paiement.",
	},
	{
		id: "virements-instantanes",
		label: "Virements instantanés",
		title: "Recevez vos fonds <em>en quelques secondes</em>",
		text: "<p>Demandez un virement depuis l'application et recevez l'argent sur votre compte <strong>en quelques instants</strong>, à tout moment.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-mobile.webp",
		imageAlt: "Un client reçoit un virement instantané sur son téléphone.",
	},
	{
		id: "gestion-mensualites",
		label: "Gestion des mensualités",
		title: "Pilotez vos mensualités",
		text: "<p>Augmentez, diminuez ou reportez vos mensualités directement depuis votre espace client, en toute autonomie.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/souplesse-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-mobile.webp",
		imageAlt: "Une cliente pilote ses mensualités depuis son espace client.",
	},
	{
		id: "debit-differe",
		label: "Débit différé",
		title: "Payez aujourd'hui, débité plus tard",
		text: "<p>Profitez du <strong>débit différé</strong> pour décaler le prélèvement de vos achats et garder la maîtrise de votre trésorerie.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-mobile.webp",
		imageAlt: "Un client profite du débit différé pour ses achats.",
	},
	{
		id: "assurance-generique",
		label: "Assurance",
		title: "Une assurance pour <strong>être serein</strong>",
		text: "<p>Protégez vos remboursements en cas d'imprévu grâce à une assurance facultative adaptée à votre situation.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/souplesse-carte-bancaire-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCardPage/ProductAdvantages/praticite-carte-bancaire-mobile.webp",
		imageAlt: "Une cliente sereine protégée par son assurance.",
	},
];

const meta = {
	title: "B2C/ProductAdvantages",
	component: ProductAdvantages,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		sectionHeadingProps: {
			title: "La simplicité pour tous mes achats",
			titleAs: "h2",
			align: "center",
		},
		categories,
	},
} satisfies Meta<typeof ProductAdvantages>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CarteBancaire: Story = {
	name: "Carte bancaire (page produit)",
};

/** Minimum required by R.G. 3: three categories. */
export const ThreeCategories: Story = {
	args: {
		categories: genericCategories.slice(0, 3),
	},
};

export const Mobile: Story = {
	parameters: {
		viewport: { defaultViewport: "mobile1" },
	},
};

const creditRenouvelableCategories: ProductAdvantageCategory[] = [
	{
		id: "disponibilite-permanente",
		label: "Disponibilité permanente",
		title: "Un crédit disponible à tout moment",
		text: "<p>Votre crédit renouvelable est accessible directement depuis l'app. Une seule souscription suffit pour conserver votre crédit aussi longtemps que vous le souhaitez.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCreditPage/ProductAdvantages/disponibilite-permanente-credit-renouvelable-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCreditPage/ProductAdvantages/disponibilite-permanente-credit-renouvelable-mobile.webp",
		imageAlt: "Une personne consultant son crédit renouvelable disponible depuis l'app.",
	},
	{
		id: "liberte-usage",
		label: "Liberté d'usage",
		title: "Je l'utilise librement selon mes besoins",
		text: "<p>Courses, projets perso, imprévus… aucun justificatif d'achat n'est demandé. Vous utilisez votre crédit selon vos envies et vos besoins.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCreditPage/ProductAdvantages/liberte-usage-credit-renouvelable-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCreditPage/ProductAdvantages/liberte-usage-credit-renouvelable-mobile.webp",
		imageAlt: "Une personne utilisant librement son crédit renouvelable.",
	},
	{
		id: "aucun-frais-inutilise",
		label: "Aucun frais si inutilisé",
		title: "Aucun frais tant que je ne l'active pas",
		text: "<p>Aucun frais lorsque vous ne l'utilisez pas, votre crédit renouvelable vous attend sans vous coûter quoi que ce soit.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCreditPage/ProductAdvantages/aucun-frais-inutilise-credit-renouvelable-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCreditPage/ProductAdvantages/aucun-frais-inutilise-credit-renouvelable-mobile.webp",
		imageAlt: "Une personne sereine, sans frais tant que son crédit n'est pas utilisé.",
	},
	{
		id: "remboursements-flexibles",
		label: "Remboursements flexibles",
		title: "Je pilote mes remboursements comme je l'entends",
		text: "<p>Mensualités ajustables<sup>(2)</sup>, pauses dans le remboursement<sup>(3)</sup>… Ajustez vos remboursements quand vous le souhaitez.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductCreditPage/ProductAdvantages/remboursements-flexibles-credit-renouvelable-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductCreditPage/ProductAdvantages/remboursements-flexibles-credit-renouvelable-mobile.webp",
		imageAlt: "Une personne ajustant ses remboursements en toute flexibilité.",
	},
];

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		sectionHeadingProps: {
			title: "Les avantages du Crédit Renouvelable Sofinco",
			subtitle: "Une solution pensée pour votre quotidien et les aléas de la vie",
			align: "center",
		},
		categories: creditRenouvelableCategories,
	},
};

const pretPersoCategories: ProductAdvantageCategory[] = [
	{
		id: "plus-personnalisation",
		label: "Plus de personnalisation",
		title: "J'emprunte juste ce qu'il me faut, ni plus ni moins",
		text: "<p>Entre 3 001 et 75 000 €, c'est vous qui décidez du montant de votre prêt selon vos besoins et votre projet<sup>(1)</sup>.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductLoanPage/ProductAdvantages/plus-personnalisation-pret-perso-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductLoanPage/ProductAdvantages/plus-personnalisation-pret-perso-mobile.webp",
		imageAlt: "Une personne finançant son projet grâce à un prêt personnel sur mesure.",
	},
	{
		id: "libre-emploi",
		label: "Libre d'emploi",
		title: "Libre d'emploi, sans justificatif",
		text: "<p>Petit ou grand projet… Aucun justificatif d'achat n'est demandé. Vous utilisez votre crédit comme vous l'entendez, pour n'importe quel besoin.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductLoanPage/ProductAdvantages/plus-de-garanties-pret-perso-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductLoanPage/ProductAdvantages/plus-de-garanties-pret-perso-mobile.webp",
		imageAlt: "Une personne assise avec une valise, prête à partir sans justificatif à fournir.",
	},
	{
		id: "plus-flexibilite",
		label: "Plus de flexibilité",
		title: "Remboursements ajustables à tout moment",
		text: "<p>Dès lors que votre dossier a plus de 6 mois, modifiez le montant de vos mensualités<sup>(2)</sup>, mettez une échéance en pause jusqu'à 2 fois par an<sup>(3)</sup> (sous réserve du bon fonctionnement de votre crédit et de l'acceptation du prêteur). Vous avez également la possibilité de rembourser par anticipation — sans frais ni pénalité.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductLoanPage/ProductAdvantages/plus-de-flexibilite-pret-perso-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductLoanPage/ProductAdvantages/plus-de-flexibilite-pret-perso-mobile.webp",
		imageAlt: "Un couple serein, mensualité mise en pause à 105,88 €.",
	},
	{
		id: "plus-autonomie",
		label: "Plus d'autonomie",
		title: "Souscription 100 % en ligne, réponse en 5 minutes",
		text: "<p>Simulez, souscrivez et signez votre contrat en ligne<sup>(2)</sup> depuis chez vous. Aucun déplacement, aucune attente : une réponse définitive en quelques minutes<sup>(3)</sup>.</p>",
		imageDesktop:
			"/images/samples/ProductPages/ProductLoanPage/ProductAdvantages/plus-autonomie-pret-perso-desktop.webp",
		imageMobile:
			"/images/samples/ProductPages/ProductLoanPage/ProductAdvantages/plus-autonomie-pret-perso-mobile.webp",
		imageAlt: "Un homme souriant consultant son téléphone, sa demande de prêt est acceptée.",
	},
];

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		sectionHeadingProps: {
			title: "Enfin un emprunt à la hauteur !",
			subtitle:
				"Montant précis, taux garanti, calendrier de remboursement … on ne laisse rien au hasard.",
			align: "center",
		},
		categories: pretPersoCategories,
	},
};
