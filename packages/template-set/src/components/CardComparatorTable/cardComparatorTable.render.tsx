import { Island } from "@jahia/javascript-modules-library";
import type { CardComparatorTableProps } from "sofinco-react";
import { CardComparatorTableServer } from "./views/CardComparatorTableServer";
import CardComparatorTableClient from "./views/CardComparatorTableClient.client";

export function renderCardComparatorTableClient(props: CardComparatorTableProps) {
	return <Island component={CardComparatorTableClient} props={props} />;
}

export function renderCardComparatorTableServer(props: CardComparatorTableProps) {
	return <CardComparatorTableServer {...props} />;
}
