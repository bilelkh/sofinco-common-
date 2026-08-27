import type { ScrollStepsItem } from "../../scrollSteps.types";

export interface StepItemProps {
	item: ScrollStepsItem;
	isActive: boolean;
	panelId: string;
	onActivate: () => void;
	/** Desktop only: the step is a clickable navigation control. On mobile it's a plain heading. */
	interactive: boolean;
}
