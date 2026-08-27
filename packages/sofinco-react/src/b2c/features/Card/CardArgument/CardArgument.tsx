import type { CardArgumentProps } from "./cardArgument.types";
import { FootnoteText } from "@shared/footnotes";

export function CardArgument({ id, title, description, className }: CardArgumentProps) {
	return (
		<article id={id} className={className}>
			<p>
				<FootnoteText>{title}</FootnoteText>
			</p>
			{description ? (
				<p>
					<FootnoteText>{description}</FootnoteText>
				</p>
			) : null}
		</article>
	);
}
