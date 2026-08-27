import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Typewriter from "@b2c/features/ChatBot/Typewriter";
import ArrowRight from "@shared/ui/svg/arrow-right";
import Cta from "@shared/ui/Cta/Cta";
import SimulatorForm from "@shared/ui/SimulatorForm";
import { trackEvent } from "@shared/analytics";
import { buildSimulatorSubmitUrl } from "@shared/utils/simulatorFormSubmit";
import classes from "@b2c/features/ChatBot/ChatBot.module.css";
import type { Category, CategorySimulator, ChatBotProps } from "@b2c/features/ChatBot/ChatBot.type";
import type { CtaProps } from "@shared/ui/Cta/Cta.type";
import Pill from "@shared/ui/Pill";
import Image from "@shared/ui/Image";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";
import { useScrollIntoViewOnChange } from "@shared/hooks/useScrollIntoViewOnChange";
import { formatAmountEuro, parseAmountFromLabel } from "./chatBotAmount";

interface StepState {
	id: number;
	question: string;
	categories: Category[];
	selectedLabel?: string;
}

interface Result {
	conclusion: string;
	features: string[];
	ctaLabel: string;
	ctaUrl: string;
	ctaTarget?: string;
	projet?: string;
	amount?: number;
	/** Présent → variante feuille simulateur (2 CTA + montant injecté). */
	simulator?: CategorySimulator;
}

const ADVANCE_DELAY_MS = 1000;

/* L'avatar n'a pas de regle CSS propre : 40x40 est sa taille intrinseque, et celle de la
   bulle `.chatbot__avatar` qui l'accueille. */
const BotAvatar = ({ avatarUrl }: { avatarUrl: string }) => (
	<div className={classes["chatbot__avatar"]}>
		<Image
			src={avatarUrl}
			decorative
			width={40}
			height={40}
			className={classes["chatbot__avatar-img"]}
		/>
	</div>
);

const UserReply = ({ label }: { label: string }) => (
	<div className={classes["chatbot__user-reply"]}>
		<div className={classes["chatbot__user-bubble"]}>
			<FootnoteText>{label}</FootnoteText>
		</div>
	</div>
);

const CategoryButton = ({
	cat,
	isPressed,
	onClick,
}: {
	cat: Category;
	isPressed: boolean;
	onClick: () => void;
}) => (
	<button
		className={classes["chatbot__category-button"]}
		aria-pressed={isPressed}
		aria-describedby={footnoteDescribedBy(cat.label)}
		onClick={onClick}
	>
		<span className={classes["chatbot__category-text"]}>
			<FootnoteText inert>{cat.label}</FootnoteText>
		</span>
		<ArrowRight size="small" color="secondary" />
	</button>
);

export default function ChatBot({ data }: ChatBotProps) {
	const [steps, setSteps] = useState<StepState[]>([
		{ id: 0, question: data.question, categories: data.categories },
	]);
	const [pendingStepId, setPendingStepId] = useState<number | null>(null);
	const [pendingLabel, setPendingLabel] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const nextStepIdRef = useRef(1);
	const activeQuestionRef = useRef<HTMLDivElement | null>(null);
	const resultRef = useRef<HTMLDivElement | null>(null);

	useScrollIntoViewOnChange(activeQuestionRef, steps[steps.length - 1]?.id ?? null);
	useScrollIntoViewOnChange(resultRef, result);

	function commitSelection(
		stepId: number,
		cat: Category,
		opts?: { replyLabel?: string; amount?: number },
	) {
		setSteps((prev) => {
			const idx = prev.findIndex((s) => s.id === stepId);
			if (idx === -1) return prev;

			const updated = [
				...prev.slice(0, idx),
				{
					...prev[idx],
					selectedLabel: opts?.replyLabel ?? cat.label,
				},
			];

			if (cat.children && cat.question) {
				updated.push({
					id: nextStepIdRef.current++,
					question: cat.question,
					categories: cat.children,
				});
			}

			return updated;
		});

		setResult(
			cat.conclusion
				? {
						conclusion: cat.conclusion,
						features: cat.features ?? [],
						ctaLabel: cat.ctaLabel ?? "",
						ctaUrl: cat.ctaUrl ?? "#",
						ctaTarget: cat.ctaTarget,
						projet: cat.simulator?.project ?? getProjetForStep(stepId),
						amount: opts?.amount ?? parseAmountFromLabel(cat.label),
						simulator: cat.simulator,
					}
				: null,
		);
	}

	function getProjetForStep(stepId: number): string | undefined {
		const stepIdx = steps.findIndex((s) => s.id === stepId);
		const previous = stepIdx > 0 ? steps.slice(0, stepIdx) : [];
		return [...previous].reverse().find((s) => s.selectedLabel)?.selectedLabel;
	}

	function emitTracking(stepId: number, cat: Category) {
		// Leaf (terminal node): carries an amount-bearing label + the cta info.
		// Emit the amount-selection event now. The validation event is fired
		// later, when the user clicks the result CTA (see the <Cta tracking=…/>
		// below).
		if (cat.conclusion) {
			const projet = getProjetForStep(stepId);
			const amount = parseAmountFromLabel(cat.label);
			trackEvent({
				event: "click_conversation_section_amount",
				...(projet !== undefined ? { projet } : {}),
				...(amount !== undefined ? { amount } : {}),
			});
			return;
		}

		// Category (non-terminal): always a project selection.
		trackEvent({
			event: "click_conversation_section_project",
			projet: cat.label,
		});
	}

	function handleSelect(stepId: number, cat: Category) {
		// Retour en arrière sur une étape passée : commit immédiat, sans delay, sans réémettre l'event
		const isHistory = steps.findIndex((s) => s.id === stepId) < steps.length - 1;
		if (isHistory) {
			commitSelection(stepId, cat);
			return;
		}

		emitTracking(stepId, cat);

		setPendingStepId(stepId);
		setPendingLabel(cat.label);

		setTimeout(() => {
			commitSelection(stepId, cat);
			setPendingStepId(null);
			setPendingLabel(null);
		}, ADVANCE_DELAY_MS);
	}

	/**
	 * Validation du montant sur une feuille simulateur : rejoue l'animation
	 * pending → commit du flux feuille, mais échoie le montant saisi (au lieu d'un
	 * label statique) dans la bulle utilisateur, et émet le tracking `amount` avec
	 * le montant réel.
	 */
	function handleAmountSubmit(stepId: number, cat: Category, amount: number) {
		const replyLabel = formatAmountEuro(amount);
		const projet = cat.simulator?.project ?? getProjetForStep(stepId);

		trackEvent({
			event: "click_conversation_section_amount",
			...(projet !== undefined ? { projet } : {}),
			amount,
		});

		setPendingStepId(stepId);
		setPendingLabel(replyLabel);

		setTimeout(() => {
			commitSelection(stepId, cat, { replyLabel, amount });
			setPendingStepId(null);
			setPendingLabel(null);
		}, ADVANCE_DELAY_MS);
	}

	/** URL simulateur finale avec le montant saisi injecté avant le #hash. */
	function simulatorHrefWithAmount(res: Result): string {
		const base = res.simulator?.simulatorCtaUrl ?? "#";
		if (res.amount === undefined) return base;
		return (
			buildSimulatorSubmitUrl(base, new URLSearchParams({ amount: String(res.amount) })) ?? base
		);
	}

	return (
		<div className={classes.chatbot}>
			<div className={classes["chatbot__content"]}>
				{/* Toutes les étapes dans une seule boucle pour éviter le re-mount lors du passage active → historique */}
				{steps.map((step, index) => {
					const isActive = index === steps.length - 1;
					const isPendingStep = pendingStepId === step.id;
					const simulatorCat = step.categories.find((c) => c.simulator) ?? null;

					return (
						<motion.div
							key={step.id}
							className={classes["chatbot__step"]}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut" }}
						>
							<div className={classes["chatbot__message"]}>
								<div className={classes["chatbot__message-body"]}>
									<BotAvatar avatarUrl={data.avatarUrl} />
									{step.id === 0 && (
										<p className={classes["chatbot__greeting"]}>
											<FootnoteText>{data.greeting}</FootnoteText>
										</p>
									)}
									<div ref={isActive ? activeQuestionRef : null}>
										{isActive ? (
											<Typewriter
												as="p"
												className={classes["chatbot__question"]}
												text={step.question}
											/>
										) : (
											<p className={classes["chatbot__question"]}>
												<FootnoteText>{step.question}</FootnoteText>
											</p>
										)}
									</div>
									{simulatorCat ? (
										<SimulatorForm
											formId={`chatbot-simulator-${step.id}`}
											amountPlaceholder={simulatorCat.simulator!.amountPlaceholder}
											amountMin={simulatorCat.simulator!.amountMin}
											amountMax={simulatorCat.simulator!.amountMax}
											ctaLabel={simulatorCat.simulator!.amountCtaLabel ?? "Je valide"}
											ctaVariant="accent"
											ctaSection="chatbot-result-cta"
											requiredErrorMessage={simulatorCat.simulator!.requiredErrorMessage}
											minErrorMessage={simulatorCat.simulator!.minErrorMessage}
											maxErrorMessage={simulatorCat.simulator!.maxErrorMessage}
											onSubmit={(amount) => handleAmountSubmit(step.id, simulatorCat, amount)}
										/>
									) : (
										<div className={classes["chatbot__category-grid"]}>
											{step.categories
												.filter((cat) => cat.label !== "")
												.map((cat) => (
													<CategoryButton
														key={cat.label}
														cat={cat}
														isPressed={
															isPendingStep
																? pendingLabel === cat.label
																: step.selectedLabel === cat.label
														}
														onClick={() => handleSelect(step.id, cat)}
													/>
												))}
										</div>
									)}
								</div>
							</div>
							{(isPendingStep || step.selectedLabel) && (
								<UserReply label={(isPendingStep ? pendingLabel : step.selectedLabel) ?? ""} />
							)}
						</motion.div>
					);
				})}

				{/* Résultat final */}
				<AnimatePresence>
					{result && (
						<motion.div
							key="result"
							ref={resultRef}
							className={classes["chatbot__result"]}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -16 }}
							transition={{ duration: 0.4, ease: "easeOut" }}
						>
							<div className={classes["chatbot__message"]}>
								<div className={classes["chatbot__message-body"]}>
									<BotAvatar avatarUrl={data.avatarUrl} />
									<Typewriter
										as="h2"
										className={classes["chatbot__conclusion"]}
										text={result.conclusion}
									/>
								</div>
							</div>
							<ul className={classes["chatbot__features"]}>
								{result.features.map((feature) => (
									<li key={feature} className={classes["chatbot__feature-chip"]}>
										<Pill className={classes["chatbot__chip-text"]} icon="check" label={feature} />
									</li>
								))}
							</ul>
							{result.simulator ? (
								<div className={classes["chatbot__result-actions"]}>
									<Cta
										label={result.ctaLabel}
										type="button"
										href={result.ctaUrl}
										variant="primary"
										size="medium"
										props={{
											target: result.ctaTarget ?? undefined,
											rel: result.ctaTarget === "_blank" ? "noopener noreferrer" : undefined,
										}}
										ctaSection="chatbot-result-cta"
										tracking={{
											event: "click_conversation_section_validation",
											cta: "product",
											...(result.projet !== undefined ? { projet: result.projet } : {}),
											...(result.amount !== undefined ? { amount: result.amount } : {}),
										}}
									/>
									<Cta
										label={result.simulator.simulatorCtaLabel}
										type="button"
										href={simulatorHrefWithAmount(result)}
										variant="accent"
										size="medium"
										props={{ "data-simulator-cta": "true" } as unknown as CtaProps["props"]}
										ctaSection="chatbot-result-cta"
										tracking={{
											event: "click_conversation_section_validation",
											cta: "simulator",
											...(result.projet !== undefined ? { projet: result.projet } : {}),
											...(result.amount !== undefined ? { amount: result.amount } : {}),
										}}
									/>
								</div>
							) : (
								<Cta
									label={result.ctaLabel}
									type="button"
									href={result.ctaUrl}
									variant="accent"
									size="medium"
									className={classes["chatbot__cta"]}
									props={{
										target: result.ctaTarget ?? undefined,
										rel: result.ctaTarget === "_blank" ? "noopener noreferrer" : undefined,
									}}
									ctaSection="chatbot-result-cta"
									tracking={{
										event: "click_conversation_section_validation",
										...(result.projet !== undefined ? { projet: result.projet } : {}),
										...(result.amount !== undefined ? { amount: result.amount } : {}),
									}}
								/>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
