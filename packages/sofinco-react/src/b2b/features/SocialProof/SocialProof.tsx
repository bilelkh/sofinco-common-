"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Mousewheel, Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/a11y";
import "swiper/css/navigation";

import SectionHeading from "@shared/ui/SectionHeading";
import ArrowForward from "@shared/ui/svg/arrow-forward";
import TestimonialCard from "@b2b/features/SocialProof/ui/TestimonialCard/TestimonialCard";
import type { SocialProofProps, TestimonialTone } from "@b2b/features/SocialProof/SocialProof.type";
import styles from "@b2b/features/SocialProof/SocialProof.module.css";

/**
 * Bloc « preuve sociale » du site vitrine B2B : un titre, une accroche, puis un
 * carrousel de témoignages partenaires.
 *
 * Deux règles portées par la maquette :
 *
 *  - **une carte sur deux est navy et décalée vers le bas** (l'autre est blanche et
 *    remontée). L'alternance est calculée sur l'index du témoignage, jamais en
 *    `:nth-child` : Swiper réordonne les slides (propriété `order`), et le rythme
 *    visuel décrocherait de l'ordre des témoignages ;
 *  - **le bloc n'existe pas en mobile.** Il est masqué en CSS (`display: none` sous
 *    768 px) plutôt que par un test de largeur en JS : le rendu SSR d'une Island Jahia
 *    ne connaît pas le viewport, et une bascule après hydratation ferait sauter la page.
 *
 * Le carrousel ne boucle PAS, contrairement à ce que laisse penser la maquette (elle
 * montre un état à mi-défilement, cartes rognées des deux côtés). Depuis Swiper 9, `loop`
 * réordonne les slides réelles au lieu de les cloner : en `slidesPerView: "auto"`, une
 * rangée plus large que le viewport n'a jamais assez de cartes pour habiller les deux
 * côtés, et Swiper s'arrête sur la dernière en laissant un vide à droite. Le nombre de
 * témoignages étant contribué, aucun seuil statique ne met à l'abri : mieux vaut un
 * carrousel fini, dont les flèches se désactivent aux extrémités.
 *
 * Sans témoignage, la section n'est pas rendue : un bloc de preuve sociale vide n'a
 * rien à prouver, et le titre seul laisserait un fond de section orphelin.
 */
export function SocialProof({ title, subtitle, testimonials, a11y, className }: SocialProofProps) {
	const titleId = useId();
	const [prevEl, setPrevEl] = useState<HTMLButtonElement | null>(null);
	const [nextEl, setNextEl] = useState<HTMLButtonElement | null>(null);

	const containerLabel = a11y?.containerLabel ?? title;
	const prevLabel = a11y?.prevSlideLabel ?? "Témoignage précédent";
	const nextLabel = a11y?.nextSlideLabel ?? "Témoignage suivant";

	if (!testimonials.length) return null;

	return (
		<section className={clsx(styles["social-proof"], className)} aria-labelledby={titleId}>
			<div className={styles["social-proof__container"]}>
				<SectionHeading
					titleAs="h2"
					id={titleId}
					title={title}
					subtitle={subtitle}
					align="center"
					className={styles["social-proof__header"]}
				/>

				<div className={styles["social-proof__carousel"]}>
					<Swiper
						modules={[A11y, Mousewheel, Navigation]}
						slidesPerView="auto"
						spaceBetween={40}
						/* Recentre la rangée quand les cartes tiennent en entier, sinon elle
						   part du bord gauche du conteneur et déborde à droite. */
						centerInsufficientSlides
						grabCursor
						mousewheel={{ forceToAxis: true }}
						navigation={{ prevEl, nextEl }}
						a11y={{
							enabled: true,
							containerMessage: containerLabel,
							prevSlideMessage: prevLabel,
							nextSlideMessage: nextLabel,
							firstSlideMessage: a11y?.firstSlideLabel ?? "Premier témoignage",
							lastSlideMessage: a11y?.lastSlideLabel ?? "Dernier témoignage",
							slideLabelMessage: a11y?.slideLabel ?? "{{index}} sur {{slidesLength}}",
							slideRole: "group",
						}}
						className={styles["social-proof__swiper"]}
					>
						{testimonials.map((testimonial, index) => {
							const isOdd = index % 2 === 1;
							const tone: TestimonialTone = testimonial.tone ?? (isOdd ? "dark" : "light");

							return (
								<SwiperSlide
									key={testimonial.id}
									className={clsx(
										styles["social-proof__slide"],
										isOdd ? styles["social-proof__slide--lowered"] : styles["social-proof__slide--raised"],
									)}
								>
									<TestimonialCard
										quote={testimonial.quote}
										authorName={testimonial.authorName}
										authorRole={testimonial.authorRole}
										avatarSrc={testimonial.avatarSrc}
										avatarAlt={testimonial.avatarAlt}
										link={testimonial.link}
										tone={tone}
									/>
								</SwiperSlide>
							);
						})}
					</Swiper>
				</div>

				<div className={styles["social-proof__navigation"]}>
					<button
						ref={setPrevEl}
						type="button"
						className={styles["social-proof__nav-button"]}
						aria-label={prevLabel}
					>
						<span className={styles["social-proof__nav-icon--prev"]}>
							<ArrowForward />
						</span>
					</button>
					<button
						ref={setNextEl}
						type="button"
						className={styles["social-proof__nav-button"]}
						aria-label={nextLabel}
					>
						<ArrowForward />
					</button>
				</div>
			</div>
		</section>
	);
}

export default SocialProof;
