import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Cta from "@shared/ui/Cta/Cta";
import type { CardAdvantagesProps } from "@b2c/features/Card/CardAdvantages/cardAdvantages.types";
import styles from "@b2c/features/Card/CardAdvantages/CardAdvantages.module.css";
import {
	MOBILE_BREAKPOINT,
	useExposeHeightAsCssVar,
	useMobileCardSlot,
} from "@b2c/features/Card/CardAdvantages/cardAdvantages.hooks";
import { REDUCED_MOTION_QUERY, useMediaQuery } from "@shared/hooks/useMediaQuery";
import { useRefreshScrollTriggerOnPageResize } from "@shared/hooks/useRefreshScrollTriggerOnPageResize";
import {
	cleanupMobileCard,
	setupDesktopAnimations,
	setupMobileAnimations,
	setupTitlesFadeIn,
} from "@b2c/features/Card/CardAdvantages/cardAdvantages.animations";
import SectionHeading from "@/shared/ui/SectionHeading";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const FIXED_ARGUMENT_COUNT = 3;

/* -------------------------------------------------------------------------- */
/* Sub-component: argument card                                               */
/* -------------------------------------------------------------------------- */

type ArgumentCardProps = {
	title: string;
	description?: string;
	innerRef?: (node: HTMLDivElement | null) => void;
};

/**
 * The `<li>` is a positioning-only slot owned by CSS (desktop zigzag grid
 * placement via nth-child in the module). GSAP only ever animates the inner
 * `<div>` (y/opacity/filter reveal). Keeping the two roles on separate
 * elements means a GSAP `ctx.revert()` during a desktop/mobile layout switch
 * can never disturb the slot's layout styles.
 */
const ArgumentCard = ({ title, description, innerRef }: ArgumentCardProps): ReactNode => (
	<li className={styles["encart-carte__argument"]}>
		<div ref={innerRef} className={styles["encart-carte__argument-inner"]}>
			<p className={styles["encart-carte__argument-title"]}>
				<FootnoteText>{title}</FootnoteText>
			</p>
			{description ? (
				<p className={styles["encart-carte__argument-subtitle"]}>
					<FootnoteText>{description}</FootnoteText>
				</p>
			) : null}
		</div>
	</li>
);

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

const CardAdvantages = ({
	title,
	subtitle,
	momentsTitle,
	momentsSubtitle,
	arguments: argumentsList = [],
	cardImage,
	cta,
	imageDesktop,
	imageMobile,
	className,
}: CardAdvantagesProps) => {
	// --- Refs --------------------------------------------------------------
	const rootRef = useRef<HTMLDivElement | null>(null);
	const pinContentRef = useRef<HTMLDivElement | null>(null);
	const stickyContentRef = useRef<HTMLDivElement | null>(null);
	const sectionTwoRef = useRef<HTMLDivElement | null>(null);
	const sectionOneHeaderRef = useRef<HTMLDivElement | null>(null);
	const sectionTwoHeaderRef = useRef<HTMLDivElement | null>(null);
	const cardStickyRef = useRef<HTMLDivElement | null>(null);
	const argumentNodesRef = useRef<Array<HTMLDivElement | null>>([]);

	// --- Accessibility IDs -------------------------------------------------
	const sectionOneTitleId = useId();

	// --- Responsive / a11y context -----------------------------------------
	const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	/** Desktop visual layout (zigzag absolute positioning). Independent of GSAP. */
	const isDesktopLayout = !isMobile;

	// --- Derived data ------------------------------------------------------
	const argumentsToRender = argumentsList.slice(0, FIXED_ARGUMENT_COUNT);

	const sectionTwoBackground = isMobile && imageMobile ? imageMobile : imageDesktop;
	const sectionTwoStyle: CSSProperties | undefined = sectionTwoBackground
		? { backgroundImage: `url(${sectionTwoBackground})` }
		: undefined;

	const ctaAnchorProps = cta?.target
		? {
				target: cta.target,
				...(cta.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
			}
		: undefined;

	// --- CSS variables effects ---------------------------------------------
	// Hosted on the root (not pin-content) so the card layer — a sibling of
	// section 1 — can also derive its vertical anchor from the header height.
	useExposeHeightAsCssVar(
		rootRef,
		stickyContentRef,
		"--encart-sticky-content-height",
		`${title}|${subtitle}`,
	);
	useMobileCardSlot(rootRef, cardStickyRef, `${cardImage}|${cta?.label ?? ""}`);
	useRefreshScrollTriggerOnPageResize(!prefersReducedMotion);

	// --- GSAP animations ---------------------------------------------------
	useEffect(() => {
		if (prefersReducedMotion || typeof window === "undefined") return;
		const root = rootRef.current;
		if (!root) return;

		const card = cardStickyRef.current;
		const sectionTwo = sectionTwoRef.current;
		const args = argumentNodesRef.current.filter((node): node is HTMLDivElement => node !== null);

		const ctx = gsap.context(() => {
			setupTitlesFadeIn(
				sectionOneHeaderRef.current,
				sectionTwoHeaderRef.current,
				sectionTwo,
				pinContentRef.current,
			);

			if (isMobile) {
				setupMobileAnimations(card, sectionTwo, args);
			} else {
				setupDesktopAnimations(root, pinContentRef.current, card, sectionTwo, args);
			}
		}, root);

		const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 50);

		return () => {
			if (isMobile) cleanupMobileCard(card);
			window.clearTimeout(refreshId);
			ctx.revert();
		};
	}, [isMobile, prefersReducedMotion, argumentsToRender.length]);

	/* ---------------------------------------------------------------------- */
	/* Render                                                                 */
	/* ---------------------------------------------------------------------- */

	return (
		<section
			ref={rootRef}
			className={clsx(styles["encart-carte"], className)}
			aria-labelledby={sectionOneTitleId}
		>
			{/* `card-track` wraps section-1 AND section-2: the card stays visible
			    at the same position throughout the entire track thanks to the GSAP pin. */}
			<div className={styles["encart-carte__card-track"]}>
				{/* ----------------- Card (pinned) ----------------- */}
				<div ref={cardStickyRef} className={styles["encart-carte__card-sticky"]}>
					<div className={styles["encart-carte__card-frame"]}>
						<Image
							src={cardImage}
							decorative
							width={198}
							height={300}
							className={styles["encart-carte__card-image"]}
						/>
					</div>

					{cta?.label ? (
						<div className={styles["encart-carte__card-cta-wrapper"]}>
							<Cta
								type="button"
								variant="accent"
								size="small"
								label={cta.label}
								href={cta.href}
								props={ctaAnchorProps}
								className={styles["encart-carte__card-cta"]}
								ctaSection={cta.ctaSection ?? "card-advantages-card-cta"}
							/>
						</div>
					) : null}
				</div>

				{/* ----------------- Section 1 ----------------- */}
				<div className={styles["encart-carte__section-one"]}>
					<div ref={pinContentRef} className={styles["encart-carte__pin-content"]}>
						<div ref={stickyContentRef} className={styles["encart-carte__sticky-content"]}>
							<SectionHeading
								ref={sectionOneHeaderRef}
								titleAs="h2"
								id={sectionOneTitleId}
								title={title}
								subtitle={subtitle}
								align="center"
								className={styles["encart-carte__sticky-header"]}
								titleClassName={styles["encart-carte__title"]}
							/>
						</div>

						<ul
							className={
								isDesktopLayout
									? styles["encart-carte__arguments"]
									: styles["encart-carte__arguments--static"]
							}
							aria-label="Product arguments"
						>
							{argumentsToRender.map((argument, index) => (
								<ArgumentCard
									key={argument.id}
									title={argument.title}
									description={argument.description}
									innerRef={
										prefersReducedMotion
											? undefined
											: (node) => {
													argumentNodesRef.current[index] = node;
												}
									}
								/>
							))}
						</ul>
					</div>
				</div>

				{/* ----------------- Section 2 ----------------- */}
				<div
					ref={sectionTwoRef}
					className={styles["encart-carte__section-two"]}
					style={sectionTwoStyle}
				>
					<div className={styles["encart-carte__video-overlay"]} aria-hidden="true" />

					<SectionHeading
						ref={sectionTwoHeaderRef}
						titleAs="h2"
						title={momentsTitle}
						subtitle={momentsSubtitle}
						variant="white"
						align="center"
						className={styles["encart-carte__section-two-heading"]}
					/>
				</div>
			</div>
		</section>
	);
};

export default CardAdvantages;
