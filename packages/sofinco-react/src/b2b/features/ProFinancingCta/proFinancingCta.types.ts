import type { CtaProps } from "@shared/ui/Cta/Cta.type";

export type ProFinancingCtaProps = {
	/** Surtitre court (ex. « Financement professionnel »). */
	eyebrow?: string;
	/** Titre principal du bloc. */
	title: string;
	/** Accroche descriptive sous le titre. */
	subtitle?: string;
	/** CTA principal — réutilise le Cta partagé. */
	cta: Pick<CtaProps, "label" | "href" | "onClick" | "tracking">;
	className?: string;
};
