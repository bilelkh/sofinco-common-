import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Debounce delay before a page-level resize triggers a ScrollTrigger refresh. */
const SCROLL_TRIGGER_REFRESH_DEBOUNCE_MS = 200;

/**
 * Keeps GSAP ScrollTrigger's cached trigger positions in sync with the whole
 * page, not just this component's own subtree. ScrollTrigger measures pixel
 * offsets against the document at setup time; if another section (e.g. a
 * `content-visibility: auto` section committing to its real height, or a
 * chatbot widget rendered above this component) later grows or shrinks,
 * everything below it shifts but ScrollTrigger never finds out unless
 * something calls `ScrollTrigger.refresh()` again.
 */
export const useRefreshScrollTriggerOnPageResize = (enabled: boolean) => {
	useEffect(() => {
		if (!enabled || typeof window === "undefined") return;

		let timeoutId = 0;

		const schedule = () => {
			window.clearTimeout(timeoutId);
			timeoutId = window.setTimeout(
				() => ScrollTrigger.refresh(),
				SCROLL_TRIGGER_REFRESH_DEBOUNCE_MS,
			);
		};

		const observer = new ResizeObserver(schedule);
		observer.observe(document.body);

		return () => {
			window.clearTimeout(timeoutId);
			observer.disconnect();
		};
	}, [enabled]);
};
