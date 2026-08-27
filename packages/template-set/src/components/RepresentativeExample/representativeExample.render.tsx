import type { RepresentativeExampleServerProps } from "./representativeExampleServer.types";
import { RepresentativeExampleServer } from "./views/RepresentativeExampleServer";
import { RepresentativeExample, EmptyRepresentativeExample } from "sofinco-react";
import type { RepresentativeExampleProps, EmptyRepresentativeExampleProps } from "sofinco-react";

export function renderRepresentativeExampleClient(props: RepresentativeExampleProps) {
	return <RepresentativeExample {...props} />;
}

export function renderRepresentativeExampleServer(props: RepresentativeExampleServerProps) {
	return <RepresentativeExampleServer {...props} />;
}

export function renderEmptyRepresentativeExample(props: EmptyRepresentativeExampleProps) {
	return <EmptyRepresentativeExample {...props} />;
}
