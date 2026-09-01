/**
 * Point d'entrée public du design system — seule surface que les consommateurs
 * (module Jahia `sofinco-template`, applications marque) sont autorisés à importer.
 *
 * Trois règles :
 * 1. Uniquement des specifiers relatifs ici. Un alias (`@shared/…`, `@b2c/…`) dans ce
 *    fichier casse tout consommateur qui n'a pas encore chargé `aliases.js` — c'est
 *    exactement le premier import résolu au bundling.
 * 2. Un composant consommé en aval doit être exporté ici. Ne jamais laisser un
 *    consommateur atteindre un chemin interne : la réorganisation de `src/` (séparation
 *    des marques b2c / b2b / common) relève du DS et ne doit pas se propager.
 * 3. Exports NOMMÉS uniquement, jamais `export * from`. Un `export *` réexporte tout ce
 *    qu'un barrel interne expose — y compris ce qui n'était pas destiné à sortir — et
 *    rend la surface publique impossible à lire : ajouter un export dans un barrel
 *    interne élargissait silencieusement l'API du paquet. Énumérer coûte une ligne et
 *    rend l'élargissement délibéré.
 *
 */
export { default as Header } from "./b2c/features/Header/Header";
export type { HeaderProps } from "./b2c/features/Header/Header.type";
export { default as Menu } from "./common/Menu/Menu";
export type {
	MenuProps,
	MenuLogo,
	MenuSection,
	MenuSubSection,
	MenuSectionCard,
} from "./common/Menu/Menu.type";

export { default as TopBar } from "./common/Menu/TopBar/TopBar";
export type { TopBarProps, TopBarTab } from "./common/Menu/TopBar/TopBar.type";

export { default as Search } from "./common/Menu/Search/Search";
export type { SearchProps, SearchSuggestion, SearchResult } from "./common/Menu/Search/Search.type";

export { default as SearchBlock } from "./b2c/features/SearchBlock/SearchBlock";
export type {
	SearchBlockProps,
	SearchHit,
	SearchSmartResult,
} from "./b2c/features/SearchBlock/SearchBlock.type";

export { default as ChatBot } from "./b2c/features/ChatBot/ChatBot";
export type {
	ChatBotProps,
	ChatBotData,
	Category as ChatBotCategory,
	CategorySimulator as ChatBotCategorySimulator,
} from "./b2c/features/ChatBot/ChatBot.type";

export { default as ChevronUp } from "./shared/ui/svg/chevron-up";
export { default as FolderCheck } from "./shared/ui/svg/folder-check";

export {
	Hero,
	HeroOfferCard,
	HeroPP,
	HeroSimulator,
	HeroV1,
	HeroV2,
	HeroV3,
	HeroV4,
	SectionHero,
	buildSelectPromotionEvent,
	buildViewPromotionAttr,
} from "./b2c/features/Hero";
export type {
	ArgumentItem,
	HeroOfferCardProps,
	HeroPPProps,
	HeroProps,
	HeroSimulatorProps,
	HeroV1Props,
	HeroV2Props,
	HeroV3Props,
	HeroV4Props,
	PromotionTracking,
	SectionProps,
} from "./b2c/features/Hero";
export type { HeroImgProps } from "./b2c/features/Hero/ui/HeroImg/HeroImg.type";

export {
	Footer,
	FooterCategory,
	FooterLink,
	FooterPartnerLogo,
	FooterSocialLink,
	getSocialIcon,
} from "./common/Footer";
export type {
	FooterCategoryProps,
	FooterLinkProps,
	FooterPartnerLogoProps,
	FooterProps,
	FooterSocialLinkProps,
	SocialNetworkType,
} from "./common/Footer";

export {
	AppMobile,
	MobileDownloadCta,
	pickMobileAppHref,
	useMobileAppHref,
} from "./b2c/features/AppMobile";
export type { AppMobileCard, AppMobileProps, MobileAppHrefUrls } from "./b2c/features/AppMobile";

export { Reassurance } from "./b2c/features/Reassurance";
export type { ReassuranceProps, ReassuranceItem } from "./b2c/features/Reassurance";
export { ReassurancePicto, ReassurancePictos } from "./b2c/features/ReassurancePictos";
export type {
	ReassurancePictosItem,
	ReassurancePictosProps,
} from "./b2c/features/ReassurancePictos";
export { AvisClientsSticker, StarRating } from "./b2c/features/AvisClientsSticker";
export type { AvisClientsStickerProps } from "./b2c/features/AvisClientsSticker";
export { AvisCard, AvisClient } from "./common/AvisClient";
export type {
	AvisCardProps,
	AvisCardTone,
	AvisClientA11y,
	AvisClientProps,
	AvisItem,
} from "./common/AvisClient";

export type { QrProps, QrMobileProps } from "./b2c/features/QrCode/QrCode.type";
export { default as QrCode, hasQrThumbnail } from "./b2c/features/QrCode/QrCode";
export { QrSticker } from "./b2c/features/QrCode/Hero/QrSticker";
export { QrFooter } from "./b2c/features/QrCode/Footer/QrFooter";

export { default as SolutionSlider } from "./b2c/features/SolutionSlider/SolutionSlider";
export { default as SolutionCard } from "./b2c/features/SolutionSlider/ui/SolutionCard/SolutionCard";
export { default as SolutionComplementary } from "./common/SolutionComplementary/SolutionComplementary";
export type {
	SolutionProps,
	SolutionItem,
	SolutionCardProps,
	SolutionA11y,
	SolutionSliderProps,
	SolutionSliderItem,
	SolutionSliderCardProps,
	SolutionSliderA11y,
} from "./b2c/features/SolutionSlider/SolutionSlider.type";
export type {
	SolutionComplementaryProps,
	SolutionComplementaryData,
	SolutionComplementaryCardData,
} from "./common/SolutionComplementary/SolutionComplementary.type";
export { SeoMesh } from "./common/SeoMesh";
export type { BlockProps, SeoMeshSection, SeoMeshProps } from "./common/SeoMesh";
export type { CtaProps, CtaTracking } from "./shared/ui/Cta/Cta.type";
export { default as Cta } from "./shared/ui/Cta/Cta";
export { default as Link } from "./shared/ui/Link/Link";
export type { BadgeProps } from "./shared/ui/Badge/Badge.type";
export { default as Badge } from "./shared/ui/Badge/Badge";

export { Tag } from "./shared/ui/Tag";
export type { TagProps } from "./shared/ui/Tag";

export type { LinkProps, LinkTracking } from "./shared/ui/Link/Link.type";
export { default as ArrowRight } from "./shared/ui/svg/arrow-right";

export { trackEvent, trackEulerian } from "./shared/analytics";
export type { GtmEvent, EulerianPayload } from "./shared/analytics";

export { Faq } from "./common/Faq";
export type { FaqIntegration, FaqItem, FaqProps } from "./common/Faq";
export { default as NewsBlock } from "./common/NewsBlock/NewsBlock";
export type { NewsBlockProps } from "./common/NewsBlock/NewsBlock.type";
export type { CardProps as NewsBlockCardProps } from "./common/NewsBlock/Card/Card.type";
export { CardAdvantages } from "./b2c/features/Card/CardAdvantages";
export { CardArgument } from "./b2c/features/Card/CardArgument";
export type { CardAdvantagesProps } from "./b2c/features/Card/CardAdvantages/cardAdvantages.types";
export type { CardArgumentProps } from "./b2c/features/Card/CardArgument/cardArgument.types";
export { Guide } from "./b2c/features/Guide";
export type { GuideCategory, GuideLink, GuideProps } from "./b2c/features/Guide";
export {
	Offer,
	OfferCarousel,
	OfferSlideColored,
	OfferSlideGlossy,
	OfferSlideRate,
} from "./b2c/features/OfferCarousel";
export type {
	OfferCarouselProps,
	OfferSlide,
	OfferSlideColoredProps,
	OfferSlideGlossyProps,
	OfferSlideRateProps,
} from "./b2c/features/OfferCarousel";
export { MentionLegal } from "./b2c/features/MentionLegal";
export type { MentionLegalItem, MentionLegalProps } from "./b2c/features/MentionLegal";
export {
	EmptyRepresentativeExample,
	RepresentativeExample,
} from "./b2c/features/RepresentativeExample";
export type {
	EmptyRepresentativeExampleProps,
	ProductVariant,
	RepresentativeExampleProps,
	TableRow,
} from "./b2c/features/RepresentativeExample";
export { SeoBlock } from "./b2c/features/SeoBlock";
export type { AvailableColors, SeoBlockProps, TitleLevel } from "./b2c/features/SeoBlock";

export { ProductAdvantages, ProductAdvantageSlide } from "./b2c/features/ProductAdvantages";
export type {
	ProductAdvantagesProps,
	ProductAdvantageCategory,
	ProductAdvantagesA11y,
} from "./b2c/features/ProductAdvantages";

export { ComparativeTable } from "./b2c/features/ComparativeTable";
export type { ComparativeTableProps, ComparativeTableRow } from "./b2c/features/ComparativeTable";

export { WrapperLegacy } from "./b2c/legacy";
export { Breadcrumb } from "./shared/ui/Breadcrumb";
export type {
	BreadcrumbItem,
	BreadcrumbLayoutProps,
	BreadcrumbProps,
	BreadcrumbTheme,
} from "./shared/ui/Breadcrumb";
export { SimulatorBlock } from "./b2c/features/SimulatorBlock";
export type { SimulatorBlockProps } from "./b2c/features/SimulatorBlock";
export { ScrollSteps } from "./common/ScrollSteps";
export type { ScrollStepsItem, ScrollStepsProps } from "./common/ScrollSteps";

export { HowItWorks } from "./b2c/features/HowItWorks";
export type { HowItWorksProps } from "./b2c/features/HowItWorks";
export { VideoBlock } from "./b2c/features/VideoBlock";
export type {
	VideoBlockPreviewImg,
	VideoBlockProps,
	VideoBlockTranscription,
	VideoBlockVideo,
} from "./b2c/features/VideoBlock";
export { SectionCarte } from "./b2c/features/SectionCarte";
export type { SectionCarteItem, SectionCarteProps } from "./b2c/features/SectionCarte";
export { InsuranceFocus } from "./b2c/features/InsuranceFocus";
export type { InsuranceFocusProps } from "./b2c/features/InsuranceFocus";
export { ArrayFocusWrapper } from "./b2c/features/ArrayFocusWrapper";
export type { ArrayFocusWrapperProps } from "./b2c/features/ArrayFocusWrapper";
export { CardComparatorTable, ComparatorCard } from "./b2c/features/CardComparatorTable";
export type {
	CardComparatorTableProps,
	ComparatorCardProps,
	ComparatorFeature,
} from "./b2c/features/CardComparatorTable";
export { Title } from "./shared/ui/Title";
export type { HeadingLevel, TitleTag, TitleProps } from "./shared/ui/Title";
export { Subtitle } from "./shared/ui/Subtitle";
export type { SubtitleProps } from "./shared/ui/Subtitle";

// B2B (Pro)
export { ProFinancingCta } from "./b2b/features/ProFinancingCta";
export type { ProFinancingCtaProps } from "./b2b/features/ProFinancingCta";
export { PartnerLogos } from "./b2b/features/PartnerLogos";
export type { PartnerLogosProps, PartnerLogoItem } from "./b2b/features/PartnerLogos";
export { SocialProof, TestimonialCard } from "./b2b/features/SocialProof";
export type {
	SocialProofProps,
	SocialProofTestimonial,
	SocialProofA11y,
	TestimonialCardProps,
	TestimonialLink,
	TestimonialTone,
} from "./b2b/features/SocialProof";
export { ProductFocus, ProductFocusItem } from "./b2c/features/ProductFocus";
export type {
	ProductFocusItemData,
	ProductFocusItemProps,
	ProductFocusProps,
} from "./b2c/features/ProductFocus";
export * from "./b2b/features/ProFinancingCta";
export { default as FormHero } from "./b2b/features/FormHero/FormHero";
export type { FormHeroProps } from "./b2b/features/FormHero/formHero.types";
export * from "./b2c/features/ProductFocus";

export { OfferComparisonTable } from "./b2c/features/OfferComparisonTable";
export type {
	OfferComparisonTableProps,
	ComparisonOffer,
	ComparisonOfferFeature,
	ComparisonOfferImage,
} from "./b2c/features/OfferComparisonTable";
export { default as Pill } from "./shared/ui/Pill";
export type { PillProps } from "./shared/ui/Pill";
export { default as Image } from "./shared/ui/Image";
export type { ImageProps, ImageSource } from "./shared/ui/Image/Image.type";
export { sanitizeHtml } from "./utils/sanitizeHtml";
export {
	DEFAULT_FOOTNOTE_LABEL,
	FOOTNOTE_LABEL_GLOBAL,
	FootnoteText,
	SUPERSCRIPT_DIGITS,
	footnoteDescribedBy,
	footnoteLabel,
	footnoteNoteIds,
	hasFootnoteReference,
	splitFootnoteText,
} from "./shared/footnotes";
export type { FootnoteSegment } from "./shared/footnotes";

export { default as AlertBand } from "./shared/ui/AlertBand/AlertBand";
export type { AlertBandProps } from "./shared/ui/AlertBand/AlertBand.type";

export { default as TextField } from "./shared/ui/TextField/TextField";
export type { TextFieldProps } from "./shared/ui/TextField/TextField.type";
export { MASKS, applyMask, maskedLength, resolveMask, unmask } from "./shared/utils/mask";
export type { MaskConfig, MaskName } from "./shared/utils/mask";
export { default as Textarea } from "./shared/ui/Textarea/Textarea";
export type { TextareaProps } from "./shared/ui/Textarea/Textarea.type";
export { default as Select } from "./shared/ui/Select/Select";
export type { SelectProps, SelectOption } from "./shared/ui/Select/Select.type";
export { default as Stepper } from "./shared/ui/Stepper/Stepper";
export type {
	StepperProps,
	StepperVariant,
	StepperCounterVariant,
} from "./shared/ui/Stepper/Stepper.type";
export { default as Autocomplete } from "./shared/ui/Autocomplete/Autocomplete";
export type {
	AutocompleteProps,
	AutocompleteOption,
	AutocompleteSearch,
	AutocompleteStatus,
	AutocompleteLabels,
} from "./shared/ui/Autocomplete/Autocomplete.type";
export {
	searchCities,
	searchCityOptions,
	normalizeCityQuery,
	CITIES_ENDPOINT,
} from "./shared/utils/searchCities";
export type { City, SearchCitiesOptions } from "./shared/utils/searchCities";
export * from "./b2b/pages/PartnerConfirmationPage";
export { default as MultiStepForm } from "./b2b/features/MultiStepForm/MultiStepForm";
export type {
	MultiStepFormProps,
	MultiStepFormValues,
	MultiStepFormLabels,
	MultiStepFormStepperConfig,
	MultiStepFormSettings,
	FormStepConfig,
	FormFieldConfig,
	TextFieldConfig,
	TextareaFieldConfig,
	SelectFieldConfig,
	ValidationRules,
	ValidationRuleKey,
	FieldErrorMessages,
	AutocompleteFieldConfig,
} from "./b2b/features/MultiStepForm/MultiStepForm.type";
export { ICONS } from "./shared/ui/svg";
export type { IconKey } from "./shared/ui/svg";
