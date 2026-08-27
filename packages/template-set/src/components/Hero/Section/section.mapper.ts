import type { SectionProps } from "sofinco-react";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { getChildNode } from "#lib/jcr";

import { mapHeroProps } from "../Hero/hero.mapper";
import { mapQrStickerProps } from "#cms/QrSticker/qr.mapper";
import { mapSimulatorProps } from "#cms/SimulatorCredit/simulator.mapper";

export function mapSectionProps(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
	t: (key: string) => string,
): SectionProps {
	const heroNode = getChildNode(node, "hero");
	const similatorNode = getChildNode(node, "simulator");
	const heroQrNode = getChildNode(node, "heroQr");

	const props: SectionProps = {};

	if (heroNode) {
		props.hero = mapHeroProps(heroNode);
	}

	if (heroQrNode) {
		props.qrApp = mapQrStickerProps(heroQrNode, t);
	}

	if (similatorNode) {
		props.simulator = mapSimulatorProps(similatorNode, renderContext, t);
	}

	return props;
}
