import { Island } from "@jahia/javascript-modules-library";
import type { CardAdvantagesProps } from "sofinco-react";
import { CardAdvantagesServer } from "./views/CardAdvantagesServer";
import CardAdvantagesClient from "./views/CardAdvantagesClient.client";

export function renderCardAdvantagesClient(props: CardAdvantagesProps) {
	return <Island component={CardAdvantagesClient} props={props} />;
}

export function renderCardAdvantagesServer(props: CardAdvantagesProps) {
	return <CardAdvantagesServer {...props} />;
}
