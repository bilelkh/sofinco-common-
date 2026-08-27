import { AvisClient, type AvisClientProps } from "sofinco-react";

export interface AvisClientJahiaProps extends Omit<AvisClientProps, "sticker"> {
	verifiedLogoUrl?: string;
	ratingScore?: number;
	ratingReviewsCount?: number;
}

export default function AvisClientJahia({
	verifiedLogoUrl,
	ratingScore,
	ratingReviewsCount,
	...rest
}: AvisClientJahiaProps) {
	const sticker =
		verifiedLogoUrl || ratingScore || ratingReviewsCount
			? {
					avisLogoUrl: verifiedLogoUrl,
					ratingScore,
					ratingReviewsCount,
				}
			: undefined;

	return <AvisClient {...rest} sticker={sticker} />;
}
