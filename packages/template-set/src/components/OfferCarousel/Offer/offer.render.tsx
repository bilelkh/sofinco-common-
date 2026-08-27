import { Island } from "@jahia/javascript-modules-library";
import type { OfferPropsServer } from "./offer.types";
import type { OfferCarouselProps } from "sofinco-react";
import { OfferServer } from "./views/OfferServer";
import OfferClient from "./views/OfferClient.client";

export function renderOfferClient(props: OfferCarouselProps) {
  return <Island component={OfferClient} props={props} />;
}

export function renderOfferServer(props: OfferPropsServer) {
  return <OfferServer {...props} />;
}
