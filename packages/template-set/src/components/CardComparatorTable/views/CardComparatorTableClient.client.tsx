import type { CardComparatorTableProps } from "sofinco-react";
import { CardComparatorTable } from "sofinco-react";

/**
 * Island bridge — the `export default function` here is what gets `__filename`
 * tagged by the Vite plugin so `<Island>` resolves the correct bundle URL.
 */
export default function CardComparatorTableClient(props: CardComparatorTableProps) {
	return <CardComparatorTable {...props} />;
}
