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
/*
 * Primitives Radix importées sous alias : `Title` est aussi le nom d'une primitive maison
 * qui applique `FootnoteText`. Les laisser homonymes rendrait la règle
 * `require-footnote-text` aveugle sur ce fichier.
 */
import {
	Root,
	Overlay,
	Content,
	Title as DialogTitle,
	Description as DialogDescription,
	Trigger,
	Close,
} from "@radix-ui/react-dialog";
import { useRef } from "react";
import { type ModalProps } from "./Modal.type";

import styles from "./Modal.module.css";
import Cta from "@/shared/ui/Cta/Cta";

const Modal = ({ onOpenChange, title, description, children, slotCtaMobile }: ModalProps) => {
	const overlayRef = useRef<HTMLDivElement>(null);

	return (
		<Root onOpenChange={onOpenChange}>
			<Trigger asChild>
				<Cta
					className={styles.menu__modal__trigger}
					iconLeft="menu"
					iconOnly
					label="Ouvrir le menu de navigation"
				/>
			</Trigger>
			<Overlay ref={overlayRef} className={styles.menu__modal__overlay} />
			<Content
				className={styles.menu__modal__content}
				onInteractOutside={(event) => {
					const target = event.target as HTMLElement;

					// Widgets injected at the <body> level (e.g. the Smart Tribune "Aide &
					// Contact" FAQ popup) live outside this dialog, so interacting with — or
					// closing — them would otherwise dismiss the menu. Only an interaction on
					// our own overlay should close the menu; ignore everything else.
					if (target !== overlayRef.current) {
						event.preventDefault();
					}
				}}
			>
				<div className={styles.menu__modal__header}>
					<Close
						className={styles.menu__modal__trigger}
						aria-label="Fermer le menu de navigation"
						asChild
					>
						<Cta iconLeft="x" iconOnly label="Fermer le menu de navigation" />
					</Close>
					<div className={styles.menu__modal__ctaContainer}>{slotCtaMobile && slotCtaMobile}</div>
				</div>
				{/* Title & Description are required by Radix for screen-reader accessibility.
            When the caller doesn't supply them, render visually-hidden fallbacks. */}
				<DialogTitle className={title ? styles.menu__modal__title : styles["sr-only"]}>
					{title ?? "Menu de navigation"}
				</DialogTitle>
				<DialogDescription
					className={description ? styles.menu__modal__description : styles["sr-only"]}
				>
					{description ?? "Menu de navigation principal du site"}
				</DialogDescription>
				{children}
			</Content>
		</Root>
	);
};

export default Modal;
