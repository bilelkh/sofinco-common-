// ProductCreditPage link in dev mode : http://localhost:6006/iframe.html?id=pages-b2c-productpages-productcreditpage--default&viewMode=story

import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";

import * as HeaderStories from "@b2c/features/Header/Header.stories";
import * as HeroPPStories from "@b2c/features/Hero/HeroPP/HeroPP.stories";
import * as ProductAdvantagesStories from "@b2c/features/ProductAdvantages/ProductAdvantages.stories";
import * as HowItWorksStories from "@b2c/features/HowItWorks/HowItWorks/HowItWorks.stories";
import * as SeoBlockStories from "@b2c/features/SeoBlock/SeoBlock.stories";
import * as RepresentativeExampleStories from "@b2c/features/RepresentativeExample/RepresentativeExample.stories";
import * as SectionCarteStories from "@b2c/features/SectionCarte/SectionCarte.stories";
import * as AppMobileStories from "@b2c/features/AppMobile/AppMobile.stories";
import * as AvisClientStories from "@common/AvisClient/AvisClient.b2c.stories";
import * as SimulatorBlockStories from "@b2c/features/SimulatorBlock/SimulatorBlock.stories";
import * as ArrayFocusWrapperStories from "@b2c/features/ArrayFocusWrapper/ArrayFocusWrapper.stories";
import * as ComparativeTableStories from "@b2c/features/ComparativeTable/ComparativeTable.stories";
import * as ReassuranceStories from "@b2c/features/Reassurance/Reassurance.stories";
import * as FaqStories from "@common/Faq/Faq.b2c.stories";
import * as SeoMeshStories from "@common/SeoMesh/SeoMesh.b2c.stories";
import * as MentionLegalStories from "@b2c/features/MentionLegal/MentionLegal.stories";
import * as ReassurancePictosStories from "@b2c/features/ReassurancePictos/ReassurancePictos.stories";
import * as FooterStories from "@common/Footer/Footer/Footer.stories";

const { Default: Header } = composeStories(HeaderStories);
const { CreditRenouvelable: HeroPP } = composeStories(HeroPPStories);
const { CreditRenouvelable: ArrayFocusWrapper } = composeStories(ArrayFocusWrapperStories);
const { Default: SectionCarte } = composeStories(SectionCarteStories);
const { Default: SimulatorBlock } = composeStories(SimulatorBlockStories);
const { CreditRenouvelable: ComparativeTable } = composeStories(ComparativeTableStories);
const { Default: ReassurancePictos } = composeStories(ReassurancePictosStories);
const { Default: Footer } = composeStories(FooterStories);

const { CreditRenouvelable: ProductAdvantages } = composeStories(ProductAdvantagesStories);
const { CreditRenouvelable: HowItWorks } = composeStories(HowItWorksStories);
const { CreditRenouvelable: RepresentativeExample } = composeStories(RepresentativeExampleStories);
const { CreditRenouvelable: SeoBlockText } = composeStories(SeoBlockStories);
const { CreditRenouvelable: AppMobile } = composeStories(AppMobileStories);
const { CreditRenouvelable: AvisClient } = composeStories(AvisClientStories);
const { CreditRenouvelable: Reassurance } = composeStories(ReassuranceStories);
const { CreditRenouvelable: Faq } = composeStories(FaqStories);
const { CreditRenouvelable: SeoMesh } = composeStories(SeoMeshStories);
const { CreditRenouvelable: MentionLegal } = composeStories(MentionLegalStories);

const meta = {
	title: "Pages/B2C/ProductPages/ProductCreditPage",
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// SeoBlock apparaît deux fois (contenu identique).
export const Default: Story = {
	render: () => {
		return (
			<>
				<Header />

				<main>
					<HeroPP />
					<ProductAdvantages />
					<HowItWorks />
					<SeoBlockText />
					<RepresentativeExample />
					<SectionCarte />
					<AppMobile />
					<AvisClient />
					<SimulatorBlock />
					<ArrayFocusWrapper />
					<ComparativeTable />
					<SeoBlockText />
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
