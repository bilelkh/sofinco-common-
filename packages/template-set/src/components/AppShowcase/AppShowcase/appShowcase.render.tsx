import { Island } from "@jahia/javascript-modules-library";
import type { AppShowcaseProps } from "./appShowcase.types";
import type { AppMobileProps } from "sofinco-react";
import { AppShowcaseServer } from "./views/AppShowcaseServer";
import AppShowcaseClient from "./views/AppShowcaseClient.client";

export function renderAppShowcaseClient(props: AppMobileProps) {
	return <Island component={AppShowcaseClient} props={props} />;
}

export function renderAppShowcaseServer(props: AppShowcaseProps) {
	return <AppShowcaseServer {...props} />;
}
