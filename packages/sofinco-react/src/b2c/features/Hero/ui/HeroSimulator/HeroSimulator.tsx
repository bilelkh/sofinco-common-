import SimulatorForm from "@shared/ui/SimulatorForm";

import type { HeroSimulatorProps } from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.type";
import styles from "@b2c/features/Hero/ui/HeroSimulator/HeroSimulator.module.css";
import { FootnoteText } from "@shared/footnotes";

const HeroSimulator = ({
	simulatorTitle,
	amountPlaceholder,
	amountMin,
	amountMax,
	cta,
	errorMessage,
	requiredErrorMessage,
	minErrorMessage,
	maxErrorMessage,
}: HeroSimulatorProps) => {
	const ctaTarget = cta?.target === "_blank" ? "_blank" : undefined;
	const ctaLabel = typeof cta?.label === "string" ? cta.label : "Je découvre mes conditions";
	const ctaVariant = cta?.variant ?? "accent";

	return (
		<div className={styles["simulator-bar-container"]}>
			<section className={styles["simulator-bar"]} aria-label="Simulateur de crédit">
				{simulatorTitle && (
					<h1 className={styles["simulator-bar__label"]}>
						<FootnoteText>{simulatorTitle}</FootnoteText>
					</h1>
				)}
				<SimulatorForm
					formId="simulator-credit-form"
					amountPlaceholder={amountPlaceholder}
					amountMin={amountMin}
					amountMax={amountMax}
					ctaLabel={ctaLabel}
					ctaVariant={ctaVariant}
					ctaSection="hero-simulator-cta"
					ctaHref={cta?.href}
					ctaTarget={ctaTarget}
					errorMessage={errorMessage}
					requiredErrorMessage={requiredErrorMessage}
					minErrorMessage={minErrorMessage}
					maxErrorMessage={maxErrorMessage}
				/>
			</section>
		</div>
	);
};

export default HeroSimulator;
