"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import clsx from "clsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, Mousewheel, Navigation } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper/types";

import "swiper/css";
import "swiper/css/a11y";
import "swiper/css/autoplay";
import "swiper/css/navigation";

import ArrowLeft from "@shared/ui/svg/arrow-left";
import ArrowRight from "@shared/ui/svg/arrow-right";
import SectionHeading from "@shared/ui/SectionHeading";
import { ProductAdvantageSlide } from "./ui/ProductAdvantageSlide";
import type { ProductAdvantagesProps } from "./ProductAdvantages.type";
import classes from "./ProductAdvantages.module.css";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";
import { REDUCED_MOTION_QUERY, useMediaQuery } from "@shared/hooks/useMediaQuery";

/**
 * "Product advantages" section.
 *
 * Displays a title (H2) and an optional subtitle, then a carousel controlled
 * by category tabs. Each category shows an image (desktop + mobile WebP)
 * overlaid with an HTML-contributed title and text. Navigation arrows allow
 * users to manually control progression.
 */
export function ProductAdvantages({
	sectionHeadingProps,
	categories,
	a11y,
	className,
}: ProductAdvantagesProps) {
	const AUTOPLAY_DELAY_MS = 5000;
	const titleId = useId();
	const [swiper, setSwiper] = useState<SwiperClass | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const [prevEl, setPrevEl] = useState<HTMLButtonElement | null>(null);
	const [nextEl, setNextEl] = useState<HTMLButtonElement | null>(null);
	const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

	const tablistLabel = a11y?.tablistLabel ?? "Catégories d'avantages";
	const prevLabel = a11y?.prevSlideLabel ?? "Avantage précédent";
	const nextLabel = a11y?.nextSlideLabel ?? "Avantage suivant";
	const enableProgress = !prefersReducedMotion;

	// Respect `prefers-reduced-motion`: autoplay only runs when animations
	// are not reduced by user preference.
	useEffect(() => {
		if (!swiper?.autoplay) return;
		if (prefersReducedMotion) {
			swiper.autoplay.stop();
			return;
		}
		swiper.autoplay.start();
	}, [swiper, prefersReducedMotion]);

	// `aria-labelledby` CONDITIONNEL : sans en-tête il n'y a aucun titre à référencer,
	// donc aucun `id` émis — un attribut orphelin annonce une section sans nom.
	return (
		<section
			className={clsx(classes["product-advantages"], className)}
			aria-labelledby={sectionHeadingProps ? titleId : undefined}
		>
			<div className={classes["product-advantages__container"]}>
				{/* CONVENTION D'ORDRE — les props contribuées d'abord, celles que la SECTION
				    possède ensuite. `id` alimente l'`aria-labelledby` du <section> ci-dessus :
				    le laisser écraser par le spread rendrait la section anonyme pour un lecteur
				    d'écran. `align` est une décision de maquette, pas un champ d'édition. */}
				{sectionHeadingProps && (
					<SectionHeading {...sectionHeadingProps} id={titleId} align="center" />
				)}

				<div className={classes["product-advantages__tabs"]} role="group" aria-label={tablistLabel}>
					{categories.map((category, index) => (
						<button
							key={category.id}
							type="button"
							className={clsx(
								classes["product-advantages__tab"],
								index === activeIndex && classes["product-advantages__tab--active"],
								index === activeIndex &&
									enableProgress &&
									classes["product-advantages__tab--progress-running"],
							)}
							style={
								{
									"--product-advantages-tab-progress-duration": `${AUTOPLAY_DELAY_MS}ms`,
								} as CSSProperties
							}
							aria-pressed={index === activeIndex}
							aria-describedby={footnoteDescribedBy(category.label)}
							onClick={() => swiper?.slideToLoop(index)}
						>
							<span className={classes["product-advantages__tab-label"]}>
								<FootnoteText inert>{category.label}</FootnoteText>
							</span>
						</button>
					))}
				</div>

				<div className={classes["product-advantages__carousel"]}>
					<Swiper
						modules={[A11y, Autoplay, Mousewheel, Navigation]}
						onSwiper={setSwiper}
						onSlideChange={(instance) => setActiveIndex(instance.realIndex)}
						slidesPerView="auto"
						centeredSlides
						spaceBetween={24}
						autoplay={
							enableProgress
								? { delay: AUTOPLAY_DELAY_MS, disableOnInteraction: false, pauseOnMouseEnter: true }
								: false
						}
						navigation={{ prevEl, nextEl }}
						a11y={{
							enabled: true,
							containerMessage: tablistLabel,
							prevSlideMessage: prevLabel,
							nextSlideMessage: nextLabel,
						}}
						mousewheel={{ forceToAxis: true }}
						className={classes["product-advantages__swiper"]}
					>
						{categories.map((category) => (
							<SwiperSlide key={category.id} className={classes["product-advantages__slide"]}>
								<ProductAdvantageSlide
									title={category.title}
									titleAs={category.titleAs}
									text={category.text}
									imageDesktop={category.imageDesktop}
									imageMobile={category.imageMobile}
									imageAlt={category.imageAlt}
								/>
							</SwiperSlide>
						))}
					</Swiper>
				</div>

				<div className={classes["product-advantages__arrows"]}>
					<button
						ref={setPrevEl}
						type="button"
						className={classes["product-advantages__nav-button"]}
						aria-label={prevLabel}
					>
						<ArrowLeft />
					</button>
					<button
						ref={setNextEl}
						type="button"
						className={classes["product-advantages__nav-button"]}
						aria-label={nextLabel}
					>
						<ArrowRight size="large" color="primary" />
					</button>
				</div>
			</div>
		</section>
	);
}

export default ProductAdvantages;
