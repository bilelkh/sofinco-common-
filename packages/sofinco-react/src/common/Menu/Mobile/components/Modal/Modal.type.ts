export type ModalProps = {
	/** Laisser vide garde la modale non contrôlée (Radix gère l'état lui-même). */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	title?: string;
	description?: string;
	children: React.ReactNode;
	slotCtaMobile?: React.ReactNode;
};
