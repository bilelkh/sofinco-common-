import type { Meta, StoryObj } from "@storybook/react-vite";

import { SocialProof } from "./SocialProof";
import type { SocialProofTestimonial } from "./SocialProof.type";

/* Portrait de substitution : les vrais visuels viennent des renditions Jahia. */
const AVATAR =
	"data:image/svg+xml;utf8," +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
			<rect width="72" height="72" fill="#b0c0c8"/>
			<circle cx="36" cy="28" r="13" fill="#00334d"/>
			<path d="M8 72c0-15.5 12.5-28 28-28s28 12.5 28 28z" fill="#00334d"/>
		</svg>`,
	);

const QUOTE =
	"« Depuis que nous proposons les solutions Sofinco en caisse, notre panier moyen a bondi de 28 %. L'intégration s'est faite en deux jours, et notre conseiller dédié répond à chaque question en moins d'une heure. Un vrai partenaire de croissance. »";

const testimonial = (id: string, authorName: string, authorRole: string): SocialProofTestimonial => ({
	id,
	quote: QUOTE,
	authorName,
	authorRole,
	avatarSrc: AVATAR,
	link: { label: "Lire le témoignage", href: "#" },
});

const meta = {
	title: "B2B/SocialProof",
	component: SocialProof,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		title: "Ils nous font confiance",
		subtitle:
			"Rejoignez les 15 000 partenaires qui s'appuient sur Sofinco pour propulser leurs ventes, fidéliser leurs clients et sécuriser leur croissance.",
		testimonials: [
			testimonial("1", "Marie Dubois", "Directrice Commerciale, ElectroPlus"),
			testimonial("2", "Karim Benali", "Gérant, Confort & Maison"),
			testimonial("3", "Sophie Laurent", "Responsable Réseau, MobiliTop"),
			testimonial("4", "Thomas Renard", "Directeur Général, GreenAuto"),
		],
	},
} satisfies Meta<typeof SocialProof>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Sans accroche ni lien : la carte se réduit au témoignage et à sa signature. */
export const WithoutSubtitleAndLinks: Story = {
	args: {
		subtitle: undefined,
		testimonials: meta.args.testimonials.map(({ link: _link, ...rest }) => rest),
	},
};

/** Peu de témoignages : la rangée tient dans le conteneur et se recentre. */
export const TwoTestimonials: Story = {
	args: {
		testimonials: meta.args.testimonials.slice(0, 2),
	},
};

/** `tone` sur l'item force la teinte au lieu de l'alternance par index. */
export const ForcedTones: Story = {
	args: {
		testimonials: meta.args.testimonials.map((item, index) => ({
			...item,
			tone: index < 2 ? ("dark" as const) : ("light" as const),
		})),
	},
};
