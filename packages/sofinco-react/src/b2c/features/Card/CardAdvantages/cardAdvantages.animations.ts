import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "@b2c/features/Card/CardAdvantages/CardAdvantages.module.css";

gsap.registerPlugin(ScrollTrigger);

/* -------------------------------------------------------------------------- */
/* Animation constants                                                        */
/* -------------------------------------------------------------------------- */

/** Total duration of the desktop pin, expressed as multiples of `window.innerHeight`. */
const PIN_SCROLL_VIEWPORTS = 1.5;

/** Mobile threshold position: the card switches to "active" once N pixels are visible. */
const MOBILE_ACTIVE_START = "75px bottom";

const MOBILE_ACTIVE_CLASS = styles["encart-carte__card-sticky--mobile-active"];
const MOBILE_LOCKED_CLASS = styles["encart-carte__card-sticky--mobile-bottom-locked"];

/* -------------------------------------------------------------------------- */
/* Animation helpers                                                          */
/* -------------------------------------------------------------------------- */

/** Standard fade-in for a title triggered by a ScrollTrigger. */
const animateTitleFadeIn = (target: HTMLElement, trigger: HTMLElement, start: string) =>
	gsap.fromTo(
		target,
		{ y: 24, opacity: 0, filter: "blur(8px)" },
		{
			y: 0,
			opacity: 1,
			filter: "blur(0px)",
			duration: 0.55,
			ease: "power2.out",
			scrollTrigger: { trigger, start, toggleActions: "play none none reverse" },
		},
	);

/** Fade-in for an argument (used on mobile, triggered on the node itself). */
const animateArgumentFadeIn = (node: HTMLElement) =>
	gsap.fromTo(
		node,
		{ y: 32, opacity: 0, filter: "blur(12px)" },
		{
			y: 0,
			opacity: 1,
			filter: "blur(0px)",
			duration: 0.5,
			ease: "power2.out",
			scrollTrigger: { trigger: node, start: "top 85%", toggleActions: "play none none reverse" },
		},
	);

/* -------------------------------------------------------------------------- */
/* Mobile setup: card with 3 states (idle / fixed active / bottom locked)     */
/* -------------------------------------------------------------------------- */

const setMobileState = (
	card: HTMLElement,
	state: "idle" | "active" | "locked",
) => {
	card.classList.remove(MOBILE_ACTIVE_CLASS, MOBILE_LOCKED_CLASS);
	if (state === "active") card.classList.add(MOBILE_ACTIVE_CLASS);
	if (state === "locked") card.classList.add(MOBILE_LOCKED_CLASS);
	if (state !== "active") gsap.set(card, { clearProps: "bottom" });
};

export const setupMobileAnimations = (
	card: HTMLElement | null,
	sectionTwo: HTMLElement | null,
	args: HTMLElement[],
) => {
	if (card && sectionTwo) {
		// 1. Card: switches to "active" once 75px of section 2 are visible,
		//    then to "locked" once we scroll past the bottom of section 2.
		setMobileState(card, "idle");

		ScrollTrigger.create({
			trigger: sectionTwo,
			start: MOBILE_ACTIVE_START,
			end: "bottom bottom",
			onEnter: () => setMobileState(card, "active"),
			onEnterBack: () => setMobileState(card, "active"),
			onLeave: () => setMobileState(card, "locked"),
			onLeaveBack: () => setMobileState(card, "idle"),
		});

		// 2. Mobile: gentle parallax lift on the card as section 2 approaches.
		// NOTE: no snap on mobile — it fights touch momentum scrolling and causes
		// a brutal jump that hides section 1 arguments behind the floating card.
		gsap.fromTo(
			card,
			{ y: 0 },
			{
				y: -30,
				ease: "none",
				scrollTrigger: {
					trigger: sectionTwo,
					start: "top bottom",
					end: "top top",
					scrub: 0.5,
					invalidateOnRefresh: true,
				},
			},
		);
	}

	// 3. Fade-in arguments one by one as they enter the viewport.
	args.forEach(animateArgumentFadeIn);
};

export const cleanupMobileCard = (card: HTMLElement | null) => {
	if (card) setMobileState(card, "idle");
};

/* -------------------------------------------------------------------------- */
/* Desktop setup: pin + arguments timeline + card pin                         */
/* -------------------------------------------------------------------------- */

export const setupDesktopAnimations = (
	root: HTMLElement,
	pinContent: HTMLElement | null,
	card: HTMLElement | null,
	sectionTwo: HTMLElement | null,
	args: HTMLElement[],
) => {
	if (!pinContent) return;

	if (args.length > 0) {
		// Initial state: arguments are offset downward and invisible.
		gsap.set(args, { y: window.innerHeight * 0.18, opacity: 0, filter: "blur(18px)" });

		// Timeline: sequential reveal, discrete snap on 4 stops.
		const timeline = gsap.timeline({
			defaults: { ease: "power2.out" },
			scrollTrigger: {
				trigger: pinContent,
				start: "top top",
				end: () => `+=${window.innerHeight * PIN_SCROLL_VIEWPORTS}`,
				pin: true,
				pinSpacing: true,
				scrub: 0.3,
				anticipatePin: 1,
				invalidateOnRefresh: true,
				snap: {
					snapTo: [0, 1 / 3, 2 / 3, 1],
					duration: { min: 0.3, max: 0.6 },
					delay: 0.1,
					ease: "power2.inOut",
					inertia: false,
				},
			},
		});

		args.forEach((node, index) => {
			timeline.to(node, { y: 0, opacity: 1, filter: "blur(0px)", duration: 1 / 3 }, index / 3);
		});
	}

	if (card && sectionTwo) {
		// Pin the card across the whole track (section 1 + section 2).
		ScrollTrigger.create({
			trigger: root,
			start: "top top",
			endTrigger: sectionTwo,
			end: "bottom bottom",
			pin: card,
			pinSpacing: false,
			invalidateOnRefresh: true,
		});

		// The card lifts slightly during the snap to section 2.
		// IMPORTANT: we animate the CHILDREN (frame + cta) and NOT `card-sticky`,
		// because the latter is pinned by GSAP which already manages its transforms.
		// Animating a pinned element causes artifacts (transform residue after
		// pin release → card off-viewport).
		const animatedTargets = Array.from(
			card.querySelectorAll<HTMLElement>(
				`.${styles["encart-carte__card-frame"]}, .${styles["encart-carte__card-cta-wrapper"]}`,
			),
		);

		if (animatedTargets.length > 0) {
			gsap.fromTo(
				animatedTargets,
				{ y: 0 },
				{
					y: -30,
					ease: "none",
					scrollTrigger: {
						trigger: sectionTwo,
						start: "top bottom",
						end: "top top",
						scrub: 0.5,
						invalidateOnRefresh: true,
					},
				},
			);
		}
	}

	if (sectionTwo) {
		ScrollTrigger.create({
			trigger: sectionTwo,
			start: "top bottom",
			end: "top top",
			snap: {
				snapTo: [0, 1],
				duration: { min: 0.3, max: 0.6 },
				delay: 0.1,
				ease: "power2.inOut",
				inertia: false,
			},
			invalidateOnRefresh: true,
		});
	}
};

/* -------------------------------------------------------------------------- */
/* Titles fade-in (used by both modes)                                        */
/* -------------------------------------------------------------------------- */

export const setupTitlesFadeIn = (
	sectionOneHeader: HTMLElement | null,
	sectionTwoHeader: HTMLElement | null,
	sectionTwo: HTMLElement | null,
	pinContent: HTMLElement | null,
) => {
	if (sectionOneHeader) {
		animateTitleFadeIn(sectionOneHeader, pinContent ?? sectionOneHeader, "top 80%");
	}
	if (sectionTwoHeader && sectionTwo) {
		animateTitleFadeIn(sectionTwoHeader, sectionTwo, "top 75%");
	}
};
