import type { HeroArgsProps } from "@/b2c/features/Hero/ui/HeroArgs/HeroArgs.type";
import styles from "@b2c/features/Hero/ui/HeroArgs/HeroArgs.module.css";
import { FootnoteText } from "@shared/footnotes";

export default function HeroArgs({ args }: HeroArgsProps) {
	if (!args || args.length === 0) {
		return null;
	}

	return (
		<ul className={styles.hero__list}>
			{args.map((arg) => (
				<li key={arg.id} className={styles.hero__item}>
					<FootnoteText>{arg.label}</FootnoteText>
				</li>
			))}
		</ul>
	);
}
