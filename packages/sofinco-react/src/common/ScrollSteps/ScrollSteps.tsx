import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useEffect, useId, useRef, useState } from "react";

import type { ScrollStepsProps } from "./scrollSteps.types";
import classes from "./scrollSteps.module.css";
import { StepItem } from "./ui/StepItem/StepItem";
import { StepImageStack, computeLayerState } from "./ui/StepImageStack/StepImageStack";
import { SMALL_UP_QUERY, useMediaQuery } from "@shared/hooks/useMediaQuery";
import { useRefreshScrollTriggerOnPageResize } from "@shared/hooks/useRefreshScrollTriggerOnPageResize";

export function ScrollSteps({ items, imagePosition = "left" }: ScrollStepsProps) {
	const baseId = useId();
	const scrollStepsRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<ScrollTrigger | null>(null);
	const layerRef = useRef<(HTMLDivElement | null)[]>([]);
	const lastIndexRef = useRef(-1);
	const itemCount = items.length;
	const [activeIndex, setActiveIndex] = useState(0);
	const isDesktop = useMediaQuery(SMALL_UP_QUERY);

	useRefreshScrollTriggerOnPageResize(itemCount > 1);

	useEffect(() => {
		const section = scrollStepsRef.current;
		if (!section || itemCount <= 1) return;

		// registerPlugin accède à window/document : à n'appeler que côté client (SSR-safe).
		gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

		// Épingle la section au centre du viewport le temps que le scroll défile les items.
		const trigger = ScrollTrigger.create({
			trigger: section,
			start: "center center",
			end: () => `+=${window.innerHeight * (itemCount - 1)}`,
			pin: true,
			pinSpacing: true,
			scrub: isDesktop ? 0.25 : 0.35,
			anticipatePin: 1,
			snap: {
				snapTo: 1 / (itemCount - 1),
				duration: 0.5,
				delay: 0.1,
				ease: "power2.out",
			},
			invalidateOnRefresh: true,
			onUpdate(self) {
				// Progression continue (0 → itemCount - 1).
				const progress = self.progress * (itemCount - 1);
				const index = Math.min(Math.floor(progress), itemCount - 1);
				const frac = progress - index;

				// Partie fractionnaire → CSS var (synchrone, aucun re-render).
				section.style.setProperty("--step-progress", String(frac));

				// data-state écrit synchroniquement pour rester en phase avec --step-progress.
				// Si on laissait React gérer data-state via activeIndex, le décalage
				// entre l'écriture GSAP (immédiate) et le commit React (asynchrone)
				// provoque un saccade visible.
				layerRef.current.forEach((el: HTMLDivElement | null, i: number) => {
					if (!el) return;
					const next = computeLayerState(i, index);
					if (el.dataset.state !== next) el.dataset.state = next;
				});

				if (index !== lastIndexRef.current) {
					lastIndexRef.current = index;
					setActiveIndex(index);
				}
			},
		});

		triggerRef.current = trigger;

		return () => {
			trigger.kill();
			triggerRef.current = null;
			section.style.removeProperty("--step-progress");
			lastIndexRef.current = -1;
		};
	}, [itemCount, isDesktop]);

	if (itemCount === 0) return null;

	const safeActiveIndex = Math.min(activeIndex, itemCount - 1);

	function handleActivate(index: number) {
		const st = triggerRef.current;
		if (!st) return;
		const target = st.start + (index / Math.max(1, itemCount - 1)) * (st.end - st.start);
		gsap.to(window, { scrollTo: { y: target }, ease: "power2.out", duration: 0.5 });
	}

	return (
		<div ref={scrollStepsRef} className={classes.scrollSteps}>
			<div className={classes.scrollSteps__inner} data-image-position={imagePosition}>
				<div className={classes.scrollSteps__imageColumn}>
					<StepImageStack items={items} activeIndex={safeActiveIndex} layerRef={layerRef} />
				</div>
				<ul className={classes.scrollSteps__items}>
					{items.map((item, index) => (
						<StepItem
							key={item.id}
							item={item}
							isActive={index === safeActiveIndex}
							panelId={`${baseId}-panel-${index}`}
							onActivate={() => handleActivate(index)}
							interactive={isDesktop && itemCount > 1}
						/>
					))}
				</ul>
			</div>
		</div>
	);
}
