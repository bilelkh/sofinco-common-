import { Island } from "@jahia/javascript-modules-library";
import type { OfferComparisonTableProps } from "sofinco-react";
import type { OfferComparisonTableServerProps } from "./offerComparisonTable.types";
import { OfferComparisonTableServer } from "./views/OfferComparisonTableServer";
import OfferComparisonTableClient from "./views/OfferComparisonTableClient.client";

export function renderOfferComparisonTableClient(props: OfferComparisonTableProps) {
	return <Island component={OfferComparisonTableClient} props={props} />;
}

export function renderOfferComparisonTableServer(props: OfferComparisonTableServerProps) {
	return <OfferComparisonTableServer {...props} />;
}
