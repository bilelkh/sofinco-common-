import type { FooterCategoryPropsServer } from "./footerCategory.types";
import { FooterCategory } from "sofinco-react";
import type { FooterCategoryProps } from "sofinco-react";
import { FooterCategoryServer } from "./views/FooterCategoryServer";

export function renderFooterCategoryClient(props: FooterCategoryProps) {
	return <FooterCategory {...props}></FooterCategory>;
}

export function renderFooterCategoryServer(props: FooterCategoryPropsServer) {
	return <FooterCategoryServer {...props} />;
}
