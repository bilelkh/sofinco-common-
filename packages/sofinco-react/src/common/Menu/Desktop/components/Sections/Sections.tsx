/*
 * NAVIGATION — aucun renvoi de note dans ce fichier.
 *
 * Un renvoi de note se rattache à une allégation commerciale : un taux, une durée, une
 * condition. Les libellés de ce fichier sont des DESTINATIONS, pas des allégations — un
 * marqueur y serait une erreur de contribution, pas un cas d'usage. Enveloppés, ils ne
 * produisaient de toute façon aucun lien : imbriqué dans un <a>, `FootnoteText` ne rend
 * que la marque, en `aria-hidden`.
 *
 * Les surfaces PROMOTIONNELLES du menu, elles, restent enveloppées : voir
 * `Desktop/components/Card/Card.tsx`, qui porte une offre et son CTA.
 */
/* eslint-disable sofinco/require-footnote-text -- libellés de navigation, jamais des allégations */
import { Root, List, Item, Trigger, Content } from "@radix-ui/react-navigation-menu";
import clsx from "clsx";
import Card from "@common/Menu/Desktop/components/Card/Card";

import type { SectionsProps } from "./Sections.type";
import styles from "./Sections.module.css";
import type { MenuSectionCard } from "@common/Menu/Menu.type";
import SubSection from "./SubSection";

import { useRef, useState, type PointerEvent } from "react";

const Sections = ({ className, sections }: SectionsProps) => {
	const mainClassName = clsx(styles.menu__sections, className);
	// Constant initial value (not a lazy reader): the server tree and the first client paint
	// must match, otherwise hydration fails with React error #418.
	const [currentValue, setCurrentValue] = useState("");

	// Radix ferme 150 ms après que la souris a quitté le bouton ou le panneau. Deux zones vides
	// n'appartiennent ni à l'un ni à l'autre — le padding du header, l'espace sous le header — et
	// sont couvertes par les « ponts » (voir le CSS). Sur un pont, on ignore cette fermeture.
	const isOnBridgeRef = useRef(false);

	const handleBridgeEnter = () => {
		isOnBridgeRef.current = true;
	};

	const handleBridgeLeave = (event: PointerEvent<HTMLDivElement>) => {
		isOnBridgeRef.current = false;
		// `offsetParent` = le header. Le viser entier, et pas le seul <nav> : revenir vers un bouton
		// traverse des divs intermédiaires qui fermeraient le menu en route.
		const header = event.currentTarget.offsetParent;
		const staysInHeader =
			event.relatedTarget instanceof Node && header?.contains(event.relatedTarget);
		if (!staysInHeader) setCurrentValue("");
	};

	return (
		// No <Viewport>: with one, Radix routes <Content> through ViewportContentMounter, which
		// registers in a layout effect and renders null — so the panels are absent from the SSR
		// HTML. Rendering Content in place with `forceMount` puts every submenu link in the
		// server markup (SEO) and lets Radix own `data-state` / `id` / `aria-labelledby` itself.
		<Root
			value={currentValue}
			onValueChange={(nextValue) => {
				// Fermeture demandée alors que la souris est sur un pont : on l'ignore.
				if (nextValue === "" && isOnBridgeRef.current) return;
				setCurrentValue(nextValue);
			}}
			className={mainClassName}
		>
			<List className={styles.menu__sections__list}>
				{sections.map((section) => {
					const isOpen = section.id === currentValue;
					return (
						<Item key={section.id} value={section.id} className={styles.menu__sections__item}>
							<Trigger
								asChild
								onClick={(event) => {
									if (isOpen) event.preventDefault();
								}}
							>
								<button
									className={styles.menu__sections__trigger}
									type="button"
									// Renvoi inerte et masqué aux lecteurs d'écran : la note est rattachée ici,
									// en description, pour ne pas polluer le nom accessible du bouton.
								>
									{section.title}
								</button>
							</Trigger>
							<Content
								forceMount
								className={styles.menu__sections__content}
								// `forceMount` keeps EVERY panel mounted, so every panel — open or not —
								// carries its own Radix DismissableLayer. A pointer-down on a link inside the
								// open panel is "outside" for each closed sibling, and their dismiss closes
								// the menu between `pointerdown` and `pointerup`: the anchor loses the
								// pointer, the browser dispatches `click` on the common ancestor instead, and
								// the link never navigates. Only the open panel may dismiss.
								onPointerDownOutside={(event) => {
									if (!isOpen) event.preventDefault();
								}}
								// Same layer-per-panel problem for keyboard users: tabbing between the links
								// of the open panel reads as "focus outside" to every closed sibling.
								onFocusOutside={(event) => {
									if (!isOpen) event.preventDefault();
								}}
							>
								{section.subsections.length > 0 && <SubSection section={section} />}
								{section.card && (
									<Card
										{...(section.card as MenuSectionCard)}
										className={clsx(styles.menu__sections__card, {
											[styles["menu__sections__card--isDisplayed"]]: !(
												section.subsections.length < 4
											),
										})}
									/>
								)}
							</Content>
						</Item>
					);
				})}
			</List>
			{/* Les ponts de survol — voir `isOnBridgeRef` plus haut. */}
			{currentValue !== "" && (
				<>
					<div
						className={styles.menu__sections__gapbridge}
						aria-hidden="true"
						onPointerEnter={handleBridgeEnter}
						onPointerLeave={handleBridgeLeave}
					/>
					<div
						className={styles.menu__sections__headerbridge}
						aria-hidden="true"
						onPointerEnter={handleBridgeEnter}
						onPointerLeave={handleBridgeLeave}
					/>
				</>
			)}
			{/* Backdrop behind the open panel. Radix's DismissableLayer closes the menu on any
			    pointer-down outside the content, so this only needs to paint. */}{" "}
			<div
				className={styles.menu__sections__scrim}
				data-state={currentValue ? "open" : "closed"}
				aria-hidden="true"
				// Le scrim, c'est « en dehors du menu » : y arriver ferme.
				onPointerEnter={() => setCurrentValue("")}
			/>
		</Root>
	);
};

export default Sections;
