import Cta from "@shared/ui/Cta/Cta";
import type { HeroCampaignCtaProps } from "@b2c/features/Hero/ui/HeroCampaignCta/HeroCampaignCta.type";

/**
 * "Voir la campagne" play pill. Thin wrapper over the shared `Cta` that defaults the
 * label, the `campaign` (glass) variant and the play icon. Every other behaviour
 * (href/onClick, tracking, disabled…) comes from `Cta`.
 */
export default function HeroCampaignCta({
	label = "Voir la campagne",
	variant = "campaign",
	iconLeft = "play",
	ctaSection = "hero-campaign-cta",
	...rest
}: HeroCampaignCtaProps) {
	return (
		<Cta label={label} variant={variant} iconLeft={iconLeft} ctaSection={ctaSection} {...rest} />
	);
}
