import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Keyboard, Mousewheel, Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/a11y";
import "swiper/css/pagination";

import type { SolutionSliderProps } from "@b2c/features/SolutionSlider/SolutionSlider.type";
import styles from "@b2c/features/SolutionSlider/SolutionSlider.module.css";
import SolutionCard from "@b2c/features/SolutionSlider/ui/SolutionCard/SolutionCard";
import SectionHeading from "@shared/ui/SectionHeading";
import ArrowLeft from "@shared/ui/svg/arrow-left";
import ArrowRight from "@shared/ui/svg/arrow-right";

export default function SolutionSlider({
	title = "Une solution pour chacun de vos besoins",
	subtitle,
	items,
	a11y,
	className,
}: SolutionSliderProps) {
	const [prevEl, setPrevEl] = useState<HTMLButtonElement | null>(null);
	const [nextEl, setNextEl] = useState<HTMLButtonElement | null>(null);
	const [paginationEl, setPaginationEl] = useState<HTMLDivElement | null>(null);

	const containerLabel = a11y?.containerLabel ?? title;
	const prevLabel = a11y?.prevSlideLabel ?? "Diapositive précédente";
	const nextLabel = a11y?.nextSlideLabel ?? "Diapositive suivante";

	return (
		<section
			className={`${styles["solution-slider"]} ${className ?? ""}`}
			aria-label={containerLabel}
		>
			<div className={styles["solution-slider__container"]}>
				<SectionHeading
					title={title}
					subtitle={subtitle}
					align="center"
					className={styles["solution-slider__header"]}
				/>

				<div className={styles["solution-slider__carousel-wrapper"]}>
					<Swiper
						modules={[A11y, Keyboard, Mousewheel, Navigation, Pagination]}
						spaceBetween={56}
						slidesPerView="auto"
						grabCursor
						keyboard={{ enabled: true, onlyInViewport: true }}
						navigation={{ prevEl, nextEl }}
						pagination={{ el: paginationEl, clickable: true }}
						a11y={{
							enabled: true,
							containerMessage: containerLabel,
							prevSlideMessage: prevLabel,
							nextSlideMessage: nextLabel,
							firstSlideMessage: a11y?.firstSlideLabel ?? "Première diapositive",
							lastSlideMessage: a11y?.lastSlideLabel ?? "Dernière diapositive",
							slideLabelMessage: a11y?.slideLabel ?? "{{index}} sur {{slidesLength}}",
							slideRole: a11y?.slideRole ?? "group",
						}}
						className={styles["solution-slider__swiper"]}
						direction="horizontal"
						mousewheel={{
							forceToAxis: true,
						}}
					>
						{items.map((item) => (
							<SwiperSlide key={item.id} className={styles["solution-slider__slide"]}>
								<SolutionCard
									image={item.image}
									imageMobile={item.imageMobile}
									title={item.title}
									description={item.description}
									features={item.features}
									cta={{ label: item.ctaLabel, href: item.href, target: item.target }}
								/>
							</SwiperSlide>
						))}
					</Swiper>
				</div>

				<div ref={setPaginationEl} className={styles["solution-slider__pagination"]} />

				<div className={styles["solution-slider__navigation"]}>
					<button
						ref={setPrevEl}
						type="button"
						className={styles["solution-slider__nav-button"]}
						aria-label={prevLabel}
					>
						<ArrowLeft />
					</button>
					<button
						ref={setNextEl}
						type="button"
						className={styles["solution-slider__nav-button"]}
						aria-label={nextLabel}
					>
						<ArrowRight size="large" color="primary" />
					</button>
				</div>
			</div>
		</section>
	);
}
