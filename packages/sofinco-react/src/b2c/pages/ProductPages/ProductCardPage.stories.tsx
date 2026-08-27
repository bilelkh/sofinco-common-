// ProductCardPage link in dev mode : http://localhost:6006/iframe.html?id=pages-b2c-productpages-productcardpage--default&viewMode=story

import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";

import * as HeaderStories from "@b2c/features/Header/Header.stories";
import * as HeroPPStories from "@b2c/features/Hero/HeroPP/HeroPP.stories";
import * as ProductAdvantagesStories from "@b2c/features/ProductAdvantages/ProductAdvantages.stories";
import * as CardComparatorTableStories from "@b2c/features/CardComparatorTable/CardComparatorTable.stories";
import * as HowItWorksStories from "@b2c/features/HowItWorks/HowItWorks/HowItWorks.stories";
import * as OfferComparisonTableStories from "@b2c/features/OfferComparisonTable/OfferComparisonTable.stories";
import * as AppMobileStories from "@b2c/features/AppMobile/AppMobile.stories";
import * as RepresentativeExampleStories from "@b2c/features/RepresentativeExample/RepresentativeExample.stories";
import * as AvisClientStories from "@common/AvisClient/AvisClient.b2c.stories";
import * as FaqStories from "@common/Faq/Faq.b2c.stories";
import * as SeoMeshStories from "@common/SeoMesh/SeoMesh.stories";
import * as ReassurancePictosStories from "@b2c/features/ReassurancePictos/ReassurancePictos.stories";
import * as FooterStories from "@common/Footer/Footer/Footer.stories";

const { Default: Header } = composeStories(HeaderStories);
const { CarteBancaire: HeroPP } = composeStories(HeroPPStories);
const { CarteBancaire: ProductAdvantages } = composeStories(ProductAdvantagesStories);
const { Default: CardComparatorTable } = composeStories(CardComparatorTableStories);
const { CarteBancaire: HowItWorks } = composeStories(HowItWorksStories);
const { Default: OfferComparisonTable } = composeStories(OfferComparisonTableStories);
const { CarteBancaire: RepresentativeExample } = composeStories(RepresentativeExampleStories);
const { Default: SeoMesh } = composeStories(SeoMeshStories);
const { Default: ReassurancePictos } = composeStories(ReassurancePictosStories);
const { Default: Footer } = composeStories(FooterStories);

const { CarteBancaire: AppMobile } = composeStories(AppMobileStories);
const { CarteBancaire: AvisClient } = composeStories(AvisClientStories);
const { CarteBancaire: Faq } = composeStories(FaqStories);

const meta = {
	title: "Pages/B2C/ProductPages/ProductCardPage",
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		return (
			<>
				<Header />

				<main>
					<HeroPP />
					<ProductAdvantages />
					<CardComparatorTable />
					<HowItWorks />
					<OfferComparisonTable />
					<AppMobile />
					<RepresentativeExample />
					<AvisClient />
					<Faq />
					<SeoMesh />
					<ReassurancePictos />
				</main>
				<Footer />
			</>
		);
	},
};
