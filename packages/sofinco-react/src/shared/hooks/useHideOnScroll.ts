import { useEffect, type RefObject } from "react";

interface UseHideOnScrollOptions {
	/** Selector of the ancestor whose visibility is toggled (default: the sticky header). */
	targetSelector?: string;
	/** Always-visible zone near the top of the page, in px (never hide above this). Set to null to use dynamic element height. */
	offset?: number | null;
	/** Minimum scroll delta (px) before reacting — debounces jitter. */
	tolerance?: number;
	/** Attribute set on the target element while it should be hidden. */
	hiddenAttribute?: string;
}

/**
 * "Headroom" behavior: hide the sticky header when scrolling down, reveal it when
 * scrolling up. The hook lives in the (hydrated) Menu Island; it walks up to the
 * nearest `targetSelector` ancestor and toggles `hiddenAttribute` on it, leaving the
 * actual slide animation to CSS (`transform: translateY`).
 *
 * SSR-safe: all `window` access happens inside `useEffect`. No-ops gracefully when no
 * matching ancestor exists (standalone stories, Jahia edit mode).
 */
export default function useHideOnScroll(
	ref: RefObject<HTMLElement | null>,
	{
		targetSelector = "[data-sof-sticky-header]",
		offset = null,
		tolerance = 6,
		hiddenAttribute = "data-header-hidden",
	}: UseHideOnScrollOptions = {},
) {
	useEffect(() => {
		const el = ref.current?.closest(targetSelector) as HTMLElement | null;
		if (!el) return;

		let lastY = window.scrollY;
		let ticking = false;

		const update = () => {
			ticking = false;
			const y = window.scrollY;
			if (Math.abs(y - lastY) < tolerance) return;

			// Dynamically calculate offset if null → use element height
			const effectiveOffset = offset ?? el.offsetHeight;

			if (y <= effectiveOffset) {
				el.removeAttribute(hiddenAttribute); // near the top → always visible
			} else if (y > lastY) {
				el.setAttribute(hiddenAttribute, ""); // scrolling down → hide
			} else {
				el.removeAttribute(hiddenAttribute); // scrolling up → reveal
			}
			lastY = y;
		};

		const onScroll = () => {
			if (!ticking) {
				requestAnimationFrame(update);
				ticking = true;
			}
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			el.removeAttribute(hiddenAttribute);
		};
	}, [ref, targetSelector, offset, tolerance, hiddenAttribute]);
}
