import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

export function useHeaderHeightVar() {
	useIsomorphicLayoutEffect(() => {
		const header = document.querySelector("header") as HTMLElement | null;
		if (!header) return;

		const updateHeaderHeight = () => {
			document.documentElement.style.setProperty("--header-height", `${header.offsetHeight}px`);
		};

		updateHeaderHeight();

		const observer = new ResizeObserver(updateHeaderHeight);
		observer.observe(header);

		window.addEventListener("resize", updateHeaderHeight);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", updateHeaderHeight);
		};
	}, []);
}
