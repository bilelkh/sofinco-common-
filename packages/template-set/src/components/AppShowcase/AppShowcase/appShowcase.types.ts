import type { AppShowcaseFeatureProps } from "../AppShowcaseFeature/appShowcaseFeature.types";
import type { QrProps } from "sofinco-react";

export interface AppShowcaseProps {
	backgroundColor?: string;
	mainIconUrl?: string;
	title: string;
	subtitle: string;
	mobileImageUrl: string;
	features?: AppShowcaseFeatureProps[];
	qrCode?: QrProps;
}
