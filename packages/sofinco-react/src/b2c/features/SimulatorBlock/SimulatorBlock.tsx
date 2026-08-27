import clsx from "clsx";

import Title from "@shared/ui/Title";
import SimulatorForm from "@shared/ui/SimulatorForm";

import type { SimulatorBlockProps } from "./SimulatorBlock.type";
import styles from "./SimulatorBlock.module.css";

const SimulatorBlock = ({
	title,
	amountPlaceholder,
	amountMin,
	amountMax,
	cta,
	errorMessage,
	requiredErrorMessage,
	minErrorMessage,
	maxErrorMessage,
}: SimulatorBlockProps) => {
	const ctaTarget = cta?.target === "_blank" ? "_blank" : undefined;
	const ctaLabel = typeof cta?.label === "string" ? cta.label : "Je simule mon crédit";

	return (
		<div className={styles["simulator-block"]}>
			<section className={styles["simulator-block__bar"]} aria-label="Simulateur de crédit">
				<Title
					{...title}
					variant="white"
					className={clsx(styles["simulator-block__title"], title.className)}
					visualStyle="none"
				/>
				<SimulatorForm
					amountPlaceholder={amountPlaceholder}
					amountMin={amountMin}
					amountMax={amountMax}
					ctaLabel={ctaLabel}
					ctaVariant="accent"
					ctaSection="simulator-block-cta"
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

export default SimulatorBlock;
