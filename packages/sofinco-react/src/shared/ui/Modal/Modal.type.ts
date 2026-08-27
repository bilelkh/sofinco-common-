export type ModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  slotTrigger?: React.ReactNode;
};
