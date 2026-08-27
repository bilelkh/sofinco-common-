export type ModalProps = {
	onOpenChange?: (open: boolean) => void;
	title?: string;
	description?: string;
	children: React.ReactNode;
	slotCtaMobile?: React.ReactNode;
};
