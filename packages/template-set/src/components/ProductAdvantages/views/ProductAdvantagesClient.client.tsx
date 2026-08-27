import type { ProductAdvantagesProps } from "sofinco-react";
import { ProductAdvantages } from "sofinco-react";

/**
 * Island bridge — the `export default function` here is what gets `__filename`
 * tagged by the Vite plugin so `<Island>` resolves the correct bundle URL.
 */
export default function ProductAdvantagesClient(props: ProductAdvantagesProps) {
	return <ProductAdvantages {...props} />;
}
