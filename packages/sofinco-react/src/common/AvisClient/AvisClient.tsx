import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Mousewheel, Navigation, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/a11y";
import "swiper/css/autoplay";

import type { AvisCardTone, AvisClientProps } from "@common/AvisClient/AvisClient.type";
import styles from "@common/AvisClient/AvisClient.module.css";
import AvisCard from "@common/AvisClient/ui/AvisCard/AvisCard";
import { AvisClientsSticker } from "@b2c/features/AvisClientsSticker/AvisClientsSticker";
import Link from "@shared/ui/Link/Link";
import SectionHeading from "@shared/ui/SectionHeading";
import ArrowLeft from "@shared/ui/svg/arrow-left";
import ArrowRight from "@shared/ui/svg/arrow-right";

const TONES: AvisCardTone[] = ["lilac", "peach", "pink", "yellow"];

export default function AvisClient({
	title = "Rejoignez plus de 6 000 000 de clients Sofinco",
	subtitle,
	linkLabel,
	linkHref,
	items,
	sticker,
	a11y,
	className,
}: AvisClientProps) {
	const [prevEl, setPrevEl] = useState<HTMLButtonElement | null>(null);
	const [nextEl, setNextEl] = useState<HTMLButtonElement | null>(null);

	const stickerCount = sticker?.ratingReviewsCount ?? 5646;
	const stickerRating = sticker?.ratingScore ?? 4.4;
	const stickerLogo = sticker?.avisLogoUrl;

	const containerLabel = a11y?.containerLabel ?? title;
	const prevLabel = a11y?.prevSlideLabel ?? "Diapositive précédente";
	const nextLabel = a11y?.nextSlideLabel ?? "Diapositive suivante";

	return (
		<section className={`${styles["avis-client"]} ${className ?? ""}`} aria-label={containerLabel}>
			<div className={styles["avis-client__container"]}>
				{/* TODO: replace this hard-coded sticker with the dedicated "Avis Vérifiés" component when available. */}
				<SectionHeading
					titleAs="h2"
					title={title}
					subtitle={subtitle}
					align="center"
					visualStyle="h2"
					className={styles["avis-client__header"]}
					eyebrow={
						<AvisClientsSticker
							theme="light"
							ratingReviewsCount={stickerCount}
							ratingScore={stickerRating}
							avisLogoUrl={stickerLogo}
						/>
					}
				>
					{linkLabel && linkHref && (
						<div className={styles["avis-client__link-wrapper"]}>
							<Link href={linkHref} label={linkLabel} />
						</div>
					)}
				</SectionHeading>

				<div className={styles["avis-client__carousel-wrapper"]}>
					<Swiper
						modules={[A11y, Mousewheel, Navigation, Autoplay]}
						spaceBetween={16}
						slidesPerView="auto"
						centeredSlides
						speed={1500}
						loop={true}
						autoplay={{
							delay: 500,

							disableOnInteraction: true,
							pauseOnMouseEnter: true,
						}}
						grabCursor
						mousewheel={{ forceToAxis: true }}
						navigation={{ prevEl, nextEl }}
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
						className={styles["avis-client__swiper"]}
					>
						{items.map((item, index) => (
							<SwiperSlide key={item.id} className={styles["avis-client__slide"]}>
								<AvisCard
									rating={item.rating}
									text={item.text}
									author={item.author}
									realizedDate={item.realizedDate}
									publishedDate={item.publishedDate}
									tone={item.tone ?? TONES[index % TONES.length]}
								/>
							</SwiperSlide>
						))}
					</Swiper>
				</div>

				<div className={styles["avis-client__navigation"]}>
					<button
						ref={setPrevEl}
						type="button"
						className={styles["avis-client__nav-button"]}
						aria-label={prevLabel}
					>
						<ArrowLeft />
					</button>
					<button
						ref={setNextEl}
						type="button"
						className={styles["avis-client__nav-button"]}
						aria-label={nextLabel}
					>
						<ArrowRight size="large" color="primary" />
					</button>
				</div>
			</div>
		</section>
	);
}
