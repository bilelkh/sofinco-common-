export interface SolutionComplementaryCardData {
	title: string;
	subtitle: string;
	features: string[];
	ctaLabel: string;
	ctaUrl: string;
	ctaTarget?: string;
	imageUrl: string;
	imageUrlMobile?: string;
}

export interface SolutionComplementaryData {
	logoUrl?: string;
	heading: string;
	heading2?: string;
	subHeading: string;
	cards: SolutionComplementaryCardData[];
}

export type SolutionComplementaryProps = SolutionComplementaryData & {
	className?: string;
};

export type SolutionCardData = SolutionComplementaryCardData;
export type SolutionData = SolutionComplementaryData;
export type SolutionProps = SolutionComplementaryProps;
