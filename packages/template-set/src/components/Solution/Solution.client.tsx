import { SolutionComplementary } from "sofinco-react";
import type { SolutionComplementaryCardData, SolutionComplementaryData } from "sofinco-react";

export type SolutionCardData = SolutionComplementaryCardData & {
	imageAlt?: string;
};

export type SolutionData = Omit<SolutionComplementaryData, "cards"> & {
	cards: SolutionCardData[];
};

interface Props {
	data: SolutionData;
}

export default function Solution({ data }: Props) {
	return <SolutionComplementary {...data} />;
}
