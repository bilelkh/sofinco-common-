import type { ReactNode } from "react";

export interface PartnerConfirmationPageProps {
	navbar?: ReactNode;
	title?: string;
	subtitle?: string;
	confirmationTitle?: string;
	confirmationMessage?: ReactNode;
}
