import type { FaqProps } from "sofinco-react";
import type { FaqItemServer } from "../FaqItem/faqItem.types";

export interface FaqBlockPropsServer extends Omit<FaqProps, "items"> {
	items: FaqItemServer[];
}
