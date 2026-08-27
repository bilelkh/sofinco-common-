import type { FaqItemServer as FaqItemServerProps } from "./faqItem.types";
import { FaqItemServer } from "./views/FaqItemServer";

export function renderFaqItemServer(props: FaqItemServerProps) {
	return <FaqItemServer {...props} />;
}
