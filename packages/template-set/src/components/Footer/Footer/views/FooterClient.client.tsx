import { Footer } from "sofinco-react";
import type { FooterProps } from "sofinco-react";
import type { ReactNode } from "react";

interface FooterClientProps extends FooterProps {
	children?: ReactNode;
}

export default function FooterClient({ children, ...props }: FooterClientProps) {
	return <Footer {...props} avisClient={children} />;
}
