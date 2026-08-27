import type { CardArgumentProps } from "sofinco-react";
import { CardArgumentServer } from "./views/CardArgumentServer";

export function renderCardArgument(props: CardArgumentProps) {
	return <CardArgumentServer {...props} />;
}
