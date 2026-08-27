import { Island } from "@jahia/javascript-modules-library";
import type { ProductAdvantagesProps } from "sofinco-react";
import type { ProductAdvantagesServerProps } from "./productAdvantages.types";
import { ProductAdvantagesServer } from "./views/ProductAdvantagesServer";
import ProductAdvantagesClient from "./views/ProductAdvantagesClient.client";

export function renderProductAdvantagesClient(props: ProductAdvantagesProps) {
	return <Island component={ProductAdvantagesClient} props={props} />;
}

export function renderProductAdvantagesServer(props: ProductAdvantagesServerProps) {
	return <ProductAdvantagesServer {...props} />;
}
