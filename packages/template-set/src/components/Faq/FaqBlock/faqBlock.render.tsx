import type { FaqProps } from "sofinco-react";
import { Faq } from "sofinco-react";
import type { FaqBlockPropsServer } from "./faqBlock.types";
import { FaqServer } from "./views/FaqServer";

// Live/preview render. The manual FAQ now uses native <details>/<summary> for its
// accordion, so it needs no client state — the DS <Faq> is server-only and is
// rendered directly (no <Island>, no hydration). The external Smart Tribune mode
// was already pure-SSR markup, so both sources share the same render path.
export function renderFaqBlockClient(props: FaqProps) {
	return <Faq {...props} />;
}

export function renderFaqBlockServer(props: FaqBlockPropsServer) {
	return <FaqServer {...props} />;
}
