/*
 * Les primitives Radix sont importées SOUS UN ALIAS (`DialogTitle`…) et non sous leur nom
 * brut. `Title` est aussi le nom d'une primitive maison qui, elle, applique `FootnoteText`
 * à ses enfants : garder les deux homonymes rendrait la règle `require-footnote-text`
 * incapable de les distinguer (elle raisonne sur le nom de l'élément JSX) et le titre de
 * modale échapperait silencieusement au traitement des renvois.
 */
import {
	Root,
	Trigger,
	Overlay,
	Content,
	Title as DialogTitle,
	Description as DialogDescription,
} from "@radix-ui/react-dialog";

import { FootnoteText } from "@shared/footnotes";
import { type ModalProps } from "./Modal.type";

const Modal = ({ isOpen, onOpenChange, title, description, children, slotTrigger }: ModalProps) => {
	return (
		<Root open={isOpen} onOpenChange={onOpenChange}>
			<Trigger>{slotTrigger}</Trigger>
			<Overlay />
			<Content>
				{title && (
					<DialogTitle>
						<FootnoteText>{title}</FootnoteText>
					</DialogTitle>
				)}
				{description && (
					<DialogDescription>
						<FootnoteText>{description}</FootnoteText>
					</DialogDescription>
				)}
				{children}
			</Content>
		</Root>
	);
};

export default Modal;
