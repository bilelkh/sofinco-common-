import { useState } from "react";
import clsx from "clsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Mousewheel, Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

import SectionHeading from "@shared/ui/SectionHeading";
import ArrowLeft from "@shared/ui/svg/arrow-left";
import ArrowRight from "@shared/ui/svg/arrow-right";
import { MEDIUM_DOWN_QUERY, useMediaQuery } from "@shared/hooks/useMediaQuery";
import type { CardComparatorTableProps } from "./CardComparatorTable.type";
import ComparatorCard from "./ui/ComparatorCard/ComparatorCard";
import styles from "./CardComparatorTable.module.css";

export default function CardComparatorTable({
	title,
	subtitle,
	items,
	className,
}: CardComparatorTableProps) {
	const isMobile = useMediaQuery(MEDIUM_DOWN_QUERY);
	const [paginationEl, setPaginationEl] = useState<HTMLDivElement | null>(null);
	const [prevEl, setPrevEl] = useState<HTMLButtonElement | null>(null);
	const [nextEl, setNextEl] = useState<HTMLButtonElement | null>(null);

	return (
		<section className={clsx(styles["card-comparator-table"], className)}>
			<div className={styles["card-comparator-table__container"]}>
				<SectionHeading title={title} subtitle={subtitle} align="center" />

				{isMobile ? (
					<>
						<Swiper
							modules={[A11y, Mousewheel, Navigation, Pagination]}
							slidesPerView={1}
							spaceBetween={24}
							a11y={{ enabled: true }}
							navigation={{ prevEl, nextEl }}
							pagination={{ el: paginationEl, clickable: true }}
							mousewheel={{ forceToAxis: true }}
							className={styles["card-comparator-table__swiper"]}
						>
							{items.map((item) => (
								<SwiperSlide key={item.id} className={styles["card-comparator-table__slide"]}>
									<ComparatorCard {...item} />
								</SwiperSlide>
							))}
						</Swiper>
						<div ref={setPaginationEl} className={styles["card-comparator-table__pagination"]} />
						<div className={styles["card-comparator-table__navigation"]}>
							<button
								ref={setPrevEl}
								type="button"
								className={styles["card-comparator-table__nav-button"]}
								aria-label="Diapositive précédente"
							>
								<ArrowLeft />
							</button>
							<button
								ref={setNextEl}
								type="button"
								className={styles["card-comparator-table__nav-button"]}
								aria-label="Diapositive suivante"
							>
								<ArrowRight size="large" color="primary" />
							</button>
						</div>
					</>
				) : (
					<div className={styles["card-comparator-table__grid"]}>
						{items.map((item) => (
							<ComparatorCard key={item.id} {...item} />
						))}
					</div>
				)}
			</div>
		</section>
	);
}
