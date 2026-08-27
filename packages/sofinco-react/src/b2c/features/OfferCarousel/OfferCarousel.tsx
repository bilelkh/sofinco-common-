import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, Navigation, Pagination } from "swiper/modules";
import ArrowLeft from "@shared/ui/svg/arrow-left";
import ArrowRight from "@shared/ui/svg/arrow-right";
import { OfferSlideGlossy } from "./ui/OfferSlides/OfferSlideGlossy/index.js";
import { OfferSlideColored } from "./ui/OfferSlides/OfferSlideColored/index.js";
import { OfferSlideRate } from "./ui/OfferSlides/OfferSlideRate/index.js";
import type { OfferCarouselProps, OfferSlide } from "./offer-carousel.types.js";
import classes from "./OfferCarousel.module.css";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const renderSlide = (slide: OfferSlide) => {
	switch (slide.variant) {
		case "glossy":
			return <OfferSlideGlossy {...slide} />;
		case "colored":
			return <OfferSlideColored {...slide} />;
		case "rate":
			return <OfferSlideRate {...slide} />;
	}

	return null;
};

export function OfferCarousel({ slides }: OfferCarouselProps) {
	const [prevEl, setPrevEl] = useState<HTMLButtonElement | null>(null);
	const [nextEl, setNextEl] = useState<HTMLButtonElement | null>(null);
	const [paginationEl, setPaginationEl] = useState<HTMLDivElement | null>(null);

	const modules = [Mousewheel, Navigation, Pagination];

	return (
		<section className={classes["offer-carousel"]}>
			<div className={classes["offer-carousel__container"]}>
				<div className={classes["offer-carousel__swiper-container"]}>
					<Swiper
						modules={modules}
						spaceBetween={24}
						slidesPerView='auto'
						navigation={{ prevEl, nextEl }}
						pagination={{
							el: paginationEl,
							clickable: true,
						}}
						mousewheel={{ forceToAxis: true }}
						className={classes["offer-carousel__swiper"]}
					>
						{slides.map((slide) => (
							<SwiperSlide
								key={slide.id}
								className={classes["offer-carousel__slide"]}
							>
								{renderSlide(slide)}
							</SwiperSlide>
						))}
					</Swiper>
				</div>

				<div className={classes["offer-carousel__controls"]}>
					<div ref={setPaginationEl} className={classes["offer-carousel__pagination"]} />
					<div className={classes["offer-carousel__arrows"]}>
						<button
							ref={setPrevEl}
							type="button"
							className={classes["offer-carousel__nav-button"]}
							aria-label="Slide précédente"
						>
							<ArrowLeft />
						</button>
						<button
							ref={setNextEl}
							type="button"
							className={classes["offer-carousel__nav-button"]}
							aria-label="Slide suivante"
						>
							<ArrowRight size="large" color="primary" />
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}

export const Offer = OfferCarousel;
