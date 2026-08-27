import type { OfferComparisonTableProps } from "sofinco-react";
import { OfferComparisonTable } from "sofinco-react";

/**
 * Island bridge — the `export default function` here is what gets `__filename`
 * tagged by the Vite plugin so `<Island>` resolves the correct bundle URL.
 */
export default function OfferComparisonTableClient(props: OfferComparisonTableProps) {
	return <OfferComparisonTable {...props} />;
}
