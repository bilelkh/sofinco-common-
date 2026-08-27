// HomePage link in dev mode : http://localhost:6006/iframe.html?id=pages-b2c-homepage--default&viewMode=story

import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";

import * as HeaderStories from "@b2c/features/Header/Header.stories";
import * as SectionHeroStories from "@b2c/features/Hero/Section/SectionHero.stories";
import * as ChatBotStories from "@b2c/features/ChatBot/ChatBot.stories";
import * as SolutionComplementaryStories from "@common/SolutionComplementary/SolutionComplementary.stories";
import * as SolutionSliderStories from "@b2c/features/SolutionSlider/SolutionSlider.stories";
import * as AppMobileStories from "@b2c/features/AppMobile/AppMobile.stories";
import * as NewsBlockStories from "@common/NewsBlock/NewsBlock.stories";
import * as SeoMeshStories from "@common/SeoMesh/SeoMesh.stories";
import * as ReassuranceStories from "@b2c/features/Reassurance/Reassurance.stories";
import * as OfferCarouselStories from "@b2c/features/OfferCarousel/OfferCarousel.stories";
import * as CardAdvantagesStories from "@b2c/features/Card/CardAdvantages/CardAdvantages.stories";
import * as GuideStories from "@b2c/features/Guide/Guide.stories";
import * as MentionLegalStories from "@b2c/features/MentionLegal/MentionLegal.stories";
import * as FooterStories from "@common/Footer/Footer/Footer.stories";
import * as AvisClientStories from "@common/AvisClient/AvisClient.stories";
import * as SeoBlockStories from "@b2c/features/SeoBlock/SeoBlock.stories";
import * as FaqStories from "@common/Faq/Faq.stories";
import * as ReassurancePictosStories from "@b2c/features/ReassurancePictos/ReassurancePictos.stories";

const { Default: Header } = composeStories(HeaderStories);
const { WithQrSticker: SectionHero } = composeStories(SectionHeroStories);
const { Default: ChatBot } = composeStories(ChatBotStories);
const { Default: SolutionComplementary } = composeStories(SolutionComplementaryStories);
const { Default: SolutionSlider } = composeStories(SolutionSliderStories);
const { Default: AppMobile } = composeStories(AppMobileStories);
const { Default: NewsBlock } = composeStories(NewsBlockStories);
const { Default: SeoMesh } = composeStories(SeoMeshStories);
const { Default: CardAdvantages } = composeStories(CardAdvantagesStories);
const { WithDescriptions: Reassurance } = composeStories(ReassuranceStories);
const { Default: OfferCarousel } = composeStories(OfferCarouselStories);
const { Default: Guide } = composeStories(GuideStories);
const { Default: MentionLegal } = composeStories(MentionLegalStories);
const { Default: Footer } = composeStories(FooterStories);
const { Default: AvisClient } = composeStories(AvisClientStories);
const { Default: SeoBlock } = composeStories(SeoBlockStories);
const { Default: Faq } = composeStories(FaqStories);
const { Default: ReassurancePictos } = composeStories(ReassurancePictosStories);

const meta = {
	title: "Pages/B2C/HomePage",
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
				<SectionHero />

				<main>
					<ChatBot />

					<SolutionComplementary />

					<SolutionSlider />

					<CardAdvantages />

					<AppMobile />

					<AvisClient />

					<Reassurance />

					<OfferCarousel />

					<SeoBlock />

					<Faq />

					<NewsBlock />

					<Guide />

					<SeoMesh />

					<MentionLegal />

					<ReassurancePictos />
				</main>
				<Footer />
			</>
		);
	},
};
