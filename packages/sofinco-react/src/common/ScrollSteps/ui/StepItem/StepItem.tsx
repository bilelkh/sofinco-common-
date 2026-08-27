import clsx from "clsx";
import type { StepItemProps } from "./stepItem.types";
import classes from "./stepItem.module.css";
import Title from "@shared/ui/Title";
import { ICONS } from "@/shared/ui/svg";
import type { IconKey } from "@/shared/ui/svg";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

export function StepItem({ item, isActive, panelId, onActivate, interactive }: StepItemProps) {
	const BadgeIcon = typeof item.badge === "string" ? ICONS[item.badge as IconKey] : undefined;

	const triggerContent = (
		<>
			{item.badge !== undefined && (
				<span className={classes.stepItem__badge} aria-hidden="true">
					{BadgeIcon ? <BadgeIcon /> : item.badge}
				</span>
			)}
			<span className={classes.stepItem__title}>
				<FootnoteText>{item.title}</FootnoteText>
			</span>
		</>
	);

	return (
		<li className={clsx(classes.stepItem, isActive && classes["stepItem--active"])}>
			<Title as="h3" visualStyle="h3" className={classes.stepItem__heading}>
				{interactive ? (
					<button
						type="button"
						className={classes.stepItem__trigger}
						aria-expanded={isActive}
						aria-controls={panelId}
						onClick={onActivate}
						// Conteneur cliquable : renvoi rendu inerte et masqué, note rattachée en description.
						aria-describedby={footnoteDescribedBy(triggerContent)}
					>
						<FootnoteText inert>{triggerContent}</FootnoteText>
					</button>
				) : (
					// Mobile : un seul item visible, piloté par le scroll → simple titre, pas de bouton.
					<span className={classes.stepItem__trigger}>
						<FootnoteText>{triggerContent}</FootnoteText>
					</span>
				)}
			</Title>

			<div
				id={panelId}
				aria-hidden={!isActive}
				className={clsx(classes.stepItem__panel, isActive && classes["stepItem__panel--open"])}
			>
				<div className={classes.stepItem__panelInner}>
					<p className={classes.stepItem__description}>
						<FootnoteText>{item.description}</FootnoteText>
					</p>
				</div>
			</div>
		</li>
	);
}
