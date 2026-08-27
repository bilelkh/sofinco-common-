import clsx from "clsx";

import { FootnoteText } from "@shared/footnotes";

import type { StepperProps } from "./Stepper.type";
import styles from "./Stepper.module.css";
import CheckFilled from "../svg/check-filled";
import ArrowBack from "../svg/arrow-back";

/** Nombre d'étapes figé par la maquette, par variante. */
const DEFAULT_TOTAL_STEPS = { line: 6, number: 4 } as const;

const STEP_STATE_LABEL = {
	done: "terminée",
	current: "en cours",
	upcoming: "à venir",
} as const;

/**
 * Indicateur de progression — composant DS partagé.
 *
 * Deux variantes, qui ne partagent que la boîte extérieure :
 *
 *  - **`line`** — barre de N segments égaux remplis jusqu'à l'étape courante,
 *    compteur « n/N » à droite et gouttière de gauche accueillant un bouton retour
 *    optionnel. Les deux gouttières font 80px *en permanence* : sans cela la barre
 *    se décalerait entre un écran qui affiche le retour et un écran qui ne l'affiche pas.
 *  - **`number`** — pastilles numérotées reliées par un trait. Étape passée = pastille
 *    navy + coche, étape courante = pastille navy + numéro, étape à venir = contour seul.
 *    Le libellé n'est rendu qu'au-dessus de la pastille courante.
 *
 * A11Y — le composant est **non interactif** (aucun clic sur les étapes), seul le
 * bouton retour de la variante `line` l'est. Les deux variantes exposent donc des
 * sémantiques distinctes plutôt qu'une liste d'onglets :
 *
 *  - `line` pose `role="progressbar"` sur la barre — et non sur la racine, qui
 *    contient le bouton retour : un `progressbar` ne doit pas embarquer d'interactif.
 *    Le compteur visible est `aria-hidden`, sa valeur passant par `aria-valuetext`
 *    pour ne pas être annoncée deux fois.
 *  - `number` rend une liste ordonnée, l'étape courante portant `aria-current="step"`.
 *    Les pastilles sont décoratives (`aria-hidden`) : la coche n'a pas de texte et le
 *    numéro seul n'énoncerait pas l'état. Chaque étape porte donc son libellé complet
 *    en `sr-only`.
 */
const Stepper = ({
	variant = "line",
	counterVariant = "plain",
	activeStep = 1,
	totalSteps,
	label,
	hasButton = false,
	onBack,
	backLabel = "Étape précédente",
	ariaLabel = "Progression",
	className,
}: StepperProps) => {
	const total = Math.max(1, Math.trunc(totalSteps ?? DEFAULT_TOTAL_STEPS[variant]));
	const current = Math.min(Math.max(Math.trunc(activeStep), 1), total);

	// `badge` ne repeint pas que le compteur : la maquette B2B change aussi la
	// répartition de la barre et des gouttières (cf. `.stepper--badge`). Le
	// modificateur est donc posé sur la racine, pas seulement sur le compteur.
	const mainClassName = clsx(
		styles.stepper,
		styles[`stepper--${variant}`],
		variant === "line" && counterVariant === "badge" && styles["stepper--badge"],
		className,
	);

	if (variant === "line") {
		return (
			<div className={mainClassName}>
				<div className={styles.stepper__back}>
					{hasButton && (
						<button
							type="button"
							className={styles.stepper__backButton}
							onClick={onBack}
							aria-label={backLabel}
						>
							<ArrowBack />
						</button>
					)}
				</div>

				<div
					className={styles.stepper__bar}
					role="progressbar"
					aria-label={ariaLabel}
					aria-valuemin={1}
					aria-valuemax={total}
					aria-valuenow={current}
					aria-valuetext={`${current}/${total}`}
				>
					{Array.from({ length: total }, (_, index) => (
						<span
							key={index}
							className={clsx(
								styles.stepper__segment,
								index < current && styles["stepper__segment--filled"],
							)}
						/>
					))}
				</div>

				<div className={styles.stepper__counter}>
					<span
						className={clsx(
							styles.stepper__counterValue,
							styles[`stepper__counterValue--${counterVariant}`],
						)}
						aria-hidden="true"
					>
						{`${current}/${total}`}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className={mainClassName}>
			<ol className={styles.stepper__list} aria-label={ariaLabel}>
				{Array.from({ length: total }, (_, index) => {
					const step = index + 1;
					const isDone = step < current;
					const isCurrent = step === current;
					const state = isDone ? "done" : isCurrent ? "current" : "upcoming";
					const stepLabel = isCurrent && label ? ` : ${label}` : "";

					return (
						<li
							key={step}
							className={clsx(
								styles.stepper__step,
								index > 0 && styles["stepper__step--connected"],
							)}
							aria-current={isCurrent ? "step" : undefined}
						>
							{index > 0 && (
								<span className={styles.stepper__connector} aria-hidden="true">
									<span className={styles.stepper__connectorLine} />
								</span>
							)}

							<div className={styles.stepper__stepInner}>
								{isCurrent && label && (
									<span className={styles.stepper__label} aria-hidden="true">
										<FootnoteText>{label}</FootnoteText>
									</span>
								)}
								<span
									className={clsx(styles.stepper__bullet, styles[`stepper__bullet--${state}`])}
									aria-hidden="true"
								>
									{isDone ? <CheckFilled /> : step}
								</span>
								<span className={styles["sr-only"]}>
									{`Étape ${step} sur ${total}${stepLabel}, ${STEP_STATE_LABEL[state]}`}
								</span>
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
};

export default Stepper;
