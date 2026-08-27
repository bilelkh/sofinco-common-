import { useState, useEffect } from "react";
import type { QrProps } from "../QrCode.type";
import classes from "./qr.module.css";
import { clsx } from "clsx";
import QrCode from "../QrCode";

const STICKY_CTA_SELECTOR = "[data-sticky-cta]";

export function QrSticker(props: QrProps) {
	const [isHidden, setIsHidden] = useState(false);

	useEffect(() => {
		const footerElement = document.getElementById("footer");
		if (!footerElement) return;

		const cta = document.querySelector<HTMLElement>(STICKY_CTA_SELECTOR);

		const getCtaHeight = (): number => {
			if (!cta) return 0;
			const style = window.getComputedStyle(cta);
			const visible =
				style.visibility !== "hidden" && style.display !== "none" && parseFloat(style.opacity) > 0;
			return visible ? cta.getBoundingClientRect().height : 0;
		};

		let observer: IntersectionObserver | null = null;
		let lastOffset = -1;

		const updateObserver = () => {
			const offset = getCtaHeight();
			if (offset === lastOffset) return;
			lastOffset = offset;

			observer?.disconnect();
			observer = new IntersectionObserver(
				(entries) => {
					setIsHidden(entries[0].isIntersecting);
				},
				{
					root: null,
					rootMargin: `0px 0px -${offset}px 0px`,
					threshold: 0,
				},
			);
			observer.observe(footerElement);
		};

		updateObserver();

		const resizeObserver = cta ? new ResizeObserver(updateObserver) : null;
		if (cta && resizeObserver) resizeObserver.observe(cta);

		window.addEventListener("scroll", updateObserver, { passive: true });
		window.addEventListener("resize", updateObserver);

		return () => {
			observer?.disconnect();
			resizeObserver?.disconnect();
			window.removeEventListener("scroll", updateObserver);
			window.removeEventListener("resize", updateObserver);
		};
	}, []);

	if (!props.src) return null;

	const stickerClasses = clsx(
		classes["qr-sticker"],
		isHidden ? classes["qr-sticker--hidden"] : classes["qr-sticker--visible"],
	);

	return (
		<div className={stickerClasses}>
			<QrCode {...props} className={classes["qr-sticker__code"]} />
		</div>
	);
}
