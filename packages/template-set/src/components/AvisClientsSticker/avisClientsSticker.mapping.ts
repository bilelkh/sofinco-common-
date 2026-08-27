import { useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { AvisClientsStickerProps } from "sofinco-react";

import { getAsBoolean, getChildNode, getGlobalSettingsNode, imgUrl, str } from "#lib/jcr";
import { readAverageRating } from "#lib/reviews";
import { avisClientPath, verifiedReviewConfigRelPath } from "#lib/siteConfigs";

/**
 * Maps a {@code sofnt:avisClientsSticker} node to design-system props.
 *
 * <p>Logo and title come from the global {@code sofnt:avisClientsSettings}
 * node; the live rating and review count come from {@code readAverageRating}
 * ({@code #lib/reviews}), the shared projection of the Java
 * {@code ReviewServiceBridge} OSGi service — same source as the footer sticker,
 * the {@code sofnt:avisClient} block and the JSON-LD {@code AggregateRating}.</p>
 *
 * <p>Returns an empty object when the sticker is globally disabled or locally
 * deactivated — the design-system component renders nothing in that case.</p>
 */
export function mapAvisClientsStickerPropsClient(
	node: JCRNodeWrapper,
	t: (key: string) => string,
): AvisClientsStickerProps {
	const settings = getGlobalSettingsNode(avisClientPath);
	if (!settings) return {};

	const isGlobalActive = getAsBoolean(settings, "isGlobalActive");
	const isLocalActive = getAsBoolean(node, "isActive");
	if (!isGlobalActive || !isLocalActive) return {};

	const props: AvisClientsStickerProps = {
		avisLogoUrl: imgUrl(settings, "verifiedLogo"),
		avisTitle: str(settings, "avisTitle") || t("footer.avisTitle"),
	};

	const { renderContext } = useServerContext();
	const configNode = getChildNode(renderContext.getSite(), verifiedReviewConfigRelPath);
	const average = readAverageRating(configNode);
	if (average) {
		props.ratingScore = average.ratingValue;
		props.ratingReviewsCount = average.reviewCount;
	}

	return props;
}
