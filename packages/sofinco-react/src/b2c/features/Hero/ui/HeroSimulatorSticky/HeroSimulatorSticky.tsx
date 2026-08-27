import { useEffect } from "react";

import Cta from "@shared/ui/Cta/Cta";
import type { HeroSimulatorStickyProps } from "@b2c/features/Hero/ui/HeroSimulatorSticky/HeroSimulatorSticky.type";
import styles from "@b2c/features/Hero/ui/HeroSimulatorSticky/HeroSimulatorSticky.module.css";

const HeroSimulatorSticky = ({
	buttonLabel,
	href,
	target,
	variant = "accent",
}: HeroSimulatorStickyProps) => {
	useEffect(() => {
		const target = document.querySelector('[data-hero-root="true"]');
		if (!target) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry) {
					return;
				}

				document.documentElement.toggleAttribute("data-hero-out", !entry.isIntersecting);
			},
			{ threshold: 0 },
		);

		observer.observe(target);

		return () => {
			observer.disconnect();
			document.documentElement.removeAttribute("data-hero-out");
		};
	}, []);

	return (
		<div className={styles["simulator-bar__sticky-cta"]} data-sticky-cta>
			<Cta
				type="button"
				variant={variant}
				className={styles["simulator-bar__sticky-cta-button"]}
				label={buttonLabel}
				href={href}
				props={target ? { target } : undefined}
				ctaSection="hero-simulator-sticky-cta"
			/>
		</div>
	);
};

export default HeroSimulatorSticky;
