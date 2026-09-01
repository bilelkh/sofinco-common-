import { type FocusEvent, useId, useState } from "react";
import { useMediaQuery } from "@shared/hooks/useMediaQuery";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import ArrowRight from "@shared/ui/svg/arrow-right";
import Cta from "@shared/ui/Cta/Cta";
import SectionHeading from "@shared/ui/SectionHeading";

import Pill from "@shared/ui/Pill";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

import type { SolutionComplementaryProps } from "@common/SolutionComplementary/SolutionComplementary.type";
import styles from "@common/SolutionComplementary/SolutionComplementary.module.css";

const EASE = [0.22, 0.61, 0.36, 1] as const;

/* Seuil propre à ce composant (les cartes passent en accordéon), distinct des breakpoints
   globaux — d'où une constante locale plutôt qu'un `*_QUERY` de `useMediaQuery`. */
const MOBILE_QUERY = "(max-width: 900px)";

const SolutionComplementary = ({
	logoUrl,
	heading,
	heading2,
	subHeading,
	cards,
	className,
}: SolutionComplementaryProps) => {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const isMobile = useMediaQuery(MOBILE_QUERY);
	const solutionId = useId();
	const visibleCards = cards.slice(0, 2);
	const activeIndex = hoveredIndex ?? expandedIndex;

	const handleCardBlur = (event: FocusEvent<HTMLElement>, index: number) => {
		const nextFocusedElement = event.relatedTarget;

		if (nextFocusedElement instanceof Node && event.currentTarget.contains(nextFocusedElement)) {
			return;
		}

		setHoveredIndex((current) => (current === index ? null : current));
	};

	const handleCardEnter = (index: number) => {
		setHoveredIndex(index);
		setExpandedIndex((current) => (current !== null && current !== index ? null : current));
	};

	return (
		<section className={clsx(styles["solution-complementary"], className)}>
			<div className={styles["solution-complementary__content"]}>
				<SectionHeading
					align="center"
					className={styles["solution-complementary__header"]}
					titleClassName={styles["solution-complementary__heading"]}
					eyebrow={
						logoUrl && (
							<Image
								src={logoUrl}
								decorative
								width={56}
								height={30}
								className={styles["solution-complementary__logo"]}
							/>
						)
					}
					title={
						/*
						 * Enveloppe posée sur CHAQUE chaîne, pas sur le fragment : `Title` applique
						 * bien `FootnoteText`, mais celui-ci est un passe-plat dès que l'enfant
						 * n'est pas une chaîne — et ici c'en est un, à cause du <br /> qui sépare
						 * les deux titres. Sans ça, les renvois de `heading` et `heading2` ne
						 * seraient jamais convertis.
						 */
						<>
							<FootnoteText>{heading}</FootnoteText>
							{heading2 ? (
								<>
									<br />
									<FootnoteText>{heading2}</FootnoteText>
								</>
							) : null}
						</>
					}
					subtitle={subHeading}
				/>

				<div className={styles["solution-complementary__grid"]}>
					{visibleCards.map((card, index) => {
						const isExpanded = isMobile || activeIndex === index;
						const isOtherExpanded = !isMobile && activeIndex !== null && !isExpanded;
						const titleId = `${solutionId}-title-${index}`;
						const contentId = `${solutionId}-content-${index}`;

						return (
							<motion.article
								key={`${card.title}-${card.ctaUrl}`}
								layout={!isMobile}
								transition={{ duration: 0.32, ease: EASE }}
								onMouseEnter={() => !isMobile && handleCardEnter(index)}
								onMouseLeave={() =>
									!isMobile && setHoveredIndex((current) => (current === index ? null : current))
								}
								onFocusCapture={() => !isMobile && handleCardEnter(index)}
								onBlurCapture={(event) => !isMobile && handleCardBlur(event, index)}
								aria-labelledby={titleId}
								className={clsx(
									styles["solution-complementary__card"],
									isExpanded && styles["solution-complementary__card--expanded"],
									isOtherExpanded && styles["solution-complementary__card--collapsed"],
								)}
							>
								<Image
									src={card.imageUrl}
									decorative
									width={820}
									height={480}
									className={styles["solution-complementary__card-bg"]}
									sources={[
										{
											media: "(max-width: 600px)",
											srcSet: card.imageUrlMobile ?? card.imageUrl,
											width: 400,
											height: 640,
										},
									]}
								/>
								<div className={styles["solution-complementary__overlay"]} aria-hidden="true" />

								<div className={styles["solution-complementary__panel"]}>
									<div className={styles["solution-complementary__panel-top"]}>
										<div className={styles["solution-complementary__titles"]}>
											<motion.p
												id={titleId}
												layout={isMobile ? false : "position"}
												className={styles["solution-complementary__card-title"]}
											>
												<FootnoteText>{card.title}</FootnoteText>
											</motion.p>
											<motion.p
												layout={isMobile ? false : "position"}
												className={styles["solution-complementary__card-subtitle"]}
											>
												<FootnoteText>{card.subtitle}</FootnoteText>
											</motion.p>
										</div>

										{!isMobile && !isExpanded ? (
											<motion.div
												animate={{ opacity: 1, scale: 1 }}
												transition={{ duration: 0.2, ease: EASE }}
												className={styles["solution-complementary__expand-button"]}
												aria-hidden="true"
											>
												<ArrowRight size="large" color="secondary" />
											</motion.div>
										) : null}
									</div>

									{isMobile ? (
										isExpanded ? (
											<div
												id={contentId}
												role="region"
												aria-labelledby={titleId}
												className={styles["solution-complementary__expanded-content"]}
											>
												<ul className={styles["solution-complementary__chips"]}>
													{card.features.map((feature) => (
														<li key={`${card.title}-${feature}`}>
															<Pill
																icon="check"
																className={styles["solution-complementary__check-icon"]}
																label={feature}
															/>
														</li>
													))}
												</ul>

												<div>
													<Cta
														type="button"
														variant="accent"
														size="medium"
														label={card.ctaLabel}
														href={card.ctaUrl}
														props={{
															target: card.ctaTarget || undefined,
															rel: card.ctaTarget === "_blank" ? "noopener noreferrer" : undefined,
														}}
														ctaSection="solution-complementary-card-cta"
													/>
												</div>
											</div>
										) : null
									) : (
										<AnimatePresence initial={false}>
											{isExpanded && (
												<motion.div
													key="expanded"
													id={contentId}
													role="region"
													aria-labelledby={titleId}
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: "auto" }}
													exit={{ opacity: 0, height: 0 }}
													transition={{ duration: 0.28, ease: EASE }}
													className={styles["solution-complementary__expanded-content"]}
												>
													<motion.ul className={styles["solution-complementary__chips"]}>
														{card.features.map((feature, featureIndex) => (
															<motion.li
																key={`${card.title}-${feature}`}
																initial={{ opacity: 0, y: 8 }}
																animate={{ opacity: 1, y: 0 }}
																transition={{
																	duration: 0.25,
																	ease: EASE,
																	delay: 0.1 + featureIndex * 0.06,
																}}
															>
																<Pill
																	icon="check"
																	className={styles["solution-complementary__check-icon"]}
																	label={feature}
																/>
															</motion.li>
														))}
													</motion.ul>

													<motion.div
														initial={{ opacity: 0, y: 8 }}
														animate={{ opacity: 1, y: 0 }}
														transition={{
															duration: 0.25,
															ease: EASE,
															delay: 0.1 + card.features.length * 0.06,
														}}
													>
														<Cta
															type="button"
															variant="accent"
															size="medium"
															label={card.ctaLabel}
															href={card.ctaUrl}
															props={{
																target: card.ctaTarget || undefined,
																rel:
																	card.ctaTarget === "_blank" ? "noopener noreferrer" : undefined,
															}}
															ctaSection="solution-complementary-card-cta"
														/>
													</motion.div>
												</motion.div>
											)}
										</AnimatePresence>
									)}
								</div>
							</motion.article>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default SolutionComplementary;
