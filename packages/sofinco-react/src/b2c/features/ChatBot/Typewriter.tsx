import { useEffect, useState } from "react";
import { FootnoteText } from "@shared/footnotes";

interface Props {
	text: string;
	speed?: number;
	startDelay?: number;
	onDone?: () => void;
	className?: string;
	as?: "h3" | "h2" | "p" | "span" | "div";
}

export default function Typewriter({
	text,
	speed = 30,
	startDelay = 0,
	onDone,
	className,
	as: Tag = "span",
}: Props) {
	const [displayed, setDisplayed] = useState("");
	// Réinitialisation à chaque changement de `text`, via un STATE et non un ref : une
	// mutation de ref pendant le rendu survit à un rendu abandonné (StrictMode, rendu
	// concurrent), et la remise à zéro serait alors perdue. C'est le motif « ajuster l'état
	// quand une prop change » de la documentation React.
	const [previousText, setPreviousText] = useState(text);

	if (previousText !== text) {
		setPreviousText(text);
		setDisplayed("");
	}

	useEffect(() => {
		let index = 0;
		let interval: ReturnType<typeof setInterval> | null = null;

		const start = setTimeout(() => {
			interval = setInterval(() => {
				index += 1;
				setDisplayed(text.slice(0, index));
				if (index >= text.length) {
					if (interval) clearInterval(interval);
					onDone?.();
				}
			}, speed);
		}, startDelay);

		return () => {
			clearTimeout(start);
			if (interval) clearInterval(interval);
		};
	}, [text, speed, startDelay, onDone]);

	return (
		<Tag className={className}>
			{/*
			 * Le texte s'écrit lettre à lettre : tant que le marqueur `⁽¹⁾` est incomplet il
			 * ne correspond à rien et reste affiché tel quel, puis il devient un lien dès
			 * que sa dernière parenthèse est tapée. Aucun traitement particulier à prévoir,
			 * et les trois caractères tiennent chacun sur une unité de code — la découpe par
			 * `slice` ne peut donc pas les briser.
			 */}
			<FootnoteText>{displayed}</FootnoteText>
		</Tag>
	);
}
