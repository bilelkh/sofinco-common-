import { useEffect, type RefObject } from "react";

/* -------------------------------------------------------------------------- */
/* Shared constants                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Stacked-layout threshold. The height clause is a last-resort fallback: the
 * desktop zigzag (compact CSS grid) holds down to ~650px of viewport height;
 * below that the 100vh-based layout physically cannot fit (tiny snapped
 * windows). Keep in sync with the stacked-layout media query in
 * CardAdvantages.module.css.
 */
export const MOBILE_BREAKPOINT = "(max-width: 900px), (max-height: 640px)";

/**
 * Exposes the height of `sourceRef` on `hostRef` via the given CSS variable.
 * The `key` (e.g. concat of texts) forces recomputation when the content changes.
 */
export const useExposeHeightAsCssVar = (
	hostRef: RefObject<HTMLElement | null>,
	sourceRef: RefObject<HTMLElement | null>,
	cssVarName: string,
	key: string,
) => {
	useEffect(() => {
		const host = hostRef.current;
		const source = sourceRef.current;
		if (!host || !source) return;

		const update = () => {
			host.style.setProperty(cssVarName, `${source.getBoundingClientRect().height}px`);
		};

		update();
		const observer = new ResizeObserver(update);
		observer.observe(source);

		return () => {
			observer.disconnect();
			host.style.removeProperty(cssVarName);
		};
	}, [hostRef, sourceRef, cssVarName, key]);
};

/**
 * On mobile, measures the actual height of the card+CTA and exposes it via
 * `--encart-mobile-card-slot` to reserve the exact space at the bottom of section 1.
 */
export const useMobileCardSlot = (
	rootRef: RefObject<HTMLElement | null>,
	cardRef: RefObject<HTMLElement | null>,
	key: string,
) => {
	useEffect(() => {
		if (typeof window === "undefined") return;
		const root = rootRef.current;
		const card = cardRef.current;
		if (!root || !card) return;

		const mql = window.matchMedia(MOBILE_BREAKPOINT);
		let frameId = 0;

		const update = () => {
			if (!mql.matches) {
				root.style.removeProperty("--encart-mobile-card-slot");
				return;
			}
			root.style.setProperty("--encart-mobile-card-slot", `${Math.ceil(card.scrollHeight)}px`);
		};

		const schedule = () => {
			window.cancelAnimationFrame(frameId);
			frameId = window.requestAnimationFrame(update);
		};

		schedule();
		const observer = new ResizeObserver(schedule);
		observer.observe(card);
		mql.addEventListener("change", schedule);
		window.addEventListener("resize", schedule);

		return () => {
			window.cancelAnimationFrame(frameId);
			observer.disconnect();
			mql.removeEventListener("change", schedule);
			window.removeEventListener("resize", schedule);
			root.style.removeProperty("--encart-mobile-card-slot");
		};
	}, [rootRef, cardRef, key]);
};
