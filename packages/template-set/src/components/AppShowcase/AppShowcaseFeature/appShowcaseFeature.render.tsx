import type { AppShowcaseFeatureProps } from "./appShowcaseFeature.types";
import { AppShowcaseFeature } from "./views/AppShowcaseFeature";

export function renderAppShowcaseFeatureServer(props: AppShowcaseFeatureProps) {
	return <AppShowcaseFeature {...props} />;
}
