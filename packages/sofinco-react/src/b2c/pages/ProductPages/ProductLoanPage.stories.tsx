// ProductLoanPage link in dev mode : http://localhost:6006/iframe.html?id=pages-b2c-productpages-productloanpage--default&viewMode=story

import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";

import * as HeaderStories from "@b2c/features/Header/Header.stories";
import * as HeroPPStories from "@b2c/features/Hero/HeroPP/HeroPP.stories";
import * as ProductAdvantagesStories from "@b2c/features/ProductAdvantages/ProductAdvantages.stories";
import * as HowItWorksStories from "@b2c/features/HowItWorks/HowItWorks/HowItWorks.stories";
import * as RepresentativeExampleStories from "@b2c/features/RepresentativeExample/RepresentativeExample.stories";
import * as AppMobileStories from "@b2c/features/AppMobile/AppMobile.stories";
import * as AvisClientStories from "@common/AvisClient/AvisClient.b2c.stories";
import * as ComparativeTableStories from "@b2c/features/ComparativeTable/ComparativeTable.stories";
import * as SeoBlockStories from "@b2c/features/SeoBlock/SeoBlock.stories";
import * as ArrayFocusWrapperStories from "@b2c/features/ArrayFocusWrapper/ArrayFocusWrapper.stories";
import * as ReassuranceStories from "@b2c/features/Reassurance/Reassurance.stories";
import * as FaqStories from "@common/Faq/Faq.b2c.stories";
import * as SeoMeshStories from "@common/SeoMesh/SeoMesh.b2c.stories";
import * as MentionLegalStories from "@b2c/features/MentionLegal/MentionLegal.stories";
import * as ReassurancePictosStories from "@b2c/features/ReassurancePictos/ReassurancePictos.stories";
import * as FooterStories from "@common/Footer/Footer/Footer.stories";

const { Default: Header } = composeStories(HeaderStories);
const { PretPerso: HeroPP } = composeStories(HeroPPStories);
const { Default: ReassurancePictos } = composeStories(ReassurancePictosStories);
const { Default: Footer } = composeStories(FooterStories);

const { PretPerso: ProductAdvantages } = composeStories(ProductAdvantagesStories);
const { PretPerso: HowItWorks } = composeStories(HowItWorksStories);
const { PretPerso: RepresentativeExample } = composeStories(RepresentativeExampleStories);
const { PretPerso: ComparativeTable } = composeStories(ComparativeTableStories);
const { PretPerso: ArrayFocusWrapper } = composeStories(ArrayFocusWrapperStories);

const { PretPerso: SeoBlockText, PretPersoFinancement: SeoBlockFinancement } =
	composeStories(SeoBlockStories);
const { PretPerso: AppMobile } = composeStories(AppMobileStories);
const { PretPerso: AvisClient } = composeStories(AvisClientStories);
const { PretPerso: Reassurance } = composeStories(ReassuranceStories);
const { PretPerso: Faq } = composeStories(FaqStories);
const { PretPerso: SeoMesh } = composeStories(SeoMeshStories);
const { PretPerso: MentionLegal } = composeStories(MentionLegalStories);

const meta = {
	title: "Pages/B2C/ProductPages/ProductLoanPage",
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// `SeoBlockFinancement` puis `SeoBlockText` = deux blocs SeoBlock au contenu
// différent (cf. maquette).
export const Default: Story = {
	render: () => {
		return (
			<>
				<Header />

				<main>
					<HeroPP />
					<ProductAdvantages />
					<HowItWorks />
					<SeoBlockFinancement />
					<RepresentativeExample />
					<AppMobile />
					<AvisClient />
					<ComparativeTable />
					<SeoBlockText />
					<ArrayFocusWrapper />
					<Reassurance />
					<Faq />
					<SeoMesh />
					<MentionLegal />
					<ReassurancePictos />
				</main>
				<Footer />
			</>
		);
	},
};
