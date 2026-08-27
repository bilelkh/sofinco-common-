import { useEffect, type RefObject } from "react";

/**
 * Toggles a `data-stuck` attribute on the element while its sticky constraint
 * is engaged (pinned at its resolved `top`); style the stuck state from CSS.
 */
export default function useStuckAttribute(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const update = () => {
			const top = parseFloat(getComputedStyle(element).top) || 0;
			// getBoundingClientRect() includes transforms, so the observed element
			// must never carry one — put visual shifts on a child instead.
			const isStuck = element.getBoundingClientRect().top <= top + 1;

			element.toggleAttribute("data-stuck", isStuck);
		};

		update();

		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);

		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
			element.removeAttribute("data-stuck");
		};
	}, [ref]);
} 