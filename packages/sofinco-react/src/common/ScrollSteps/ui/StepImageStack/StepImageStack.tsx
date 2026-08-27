import type { RefObject } from "react";
import type { ScrollStepsItem } from "../../scrollSteps.types";
import Image from "@shared/ui/Image";
import classes from "./stepImageStack.module.css";

interface StepImageStackProps {
	items: ScrollStepsItem[];
	activeIndex: number;
	layerRef: RefObject<(HTMLDivElement | null)[]>;
}

export type LayerState = "hidden" | "left" | "current" | "entering";

export function computeLayerState(i: number, activeIndex: number): LayerState {
	if (i === activeIndex) return "current";
	if (i === activeIndex + 1) return "entering";
	if (i < activeIndex) return "left";
	return "hidden";
}

export function StepImageStack({ items, activeIndex, layerRef }: StepImageStackProps) {
	if (items.length === 0) return null;

	return (
		<div className={classes.stepImageStack} aria-hidden="true">
			<div className={classes.stepImageStack__clip}>
				{items.map((item, index) => (
					<div
						key={item.id}
						ref={(el) => {
							layerRef.current[index] = el;
						}}
						className={classes.stepImageStack__layer}
						data-state={computeLayerState(index, activeIndex)}
					>
						<Image
							src={item.imageUrl}
							decorative
							width={600}
							height={600}
							loading={index === 0 ? "eager" : "lazy"}
							fetchPriority={index === 0 ? "high" : undefined}
							className={classes.stepImageStack__image}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
