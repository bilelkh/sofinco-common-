import type { ReactNode } from "react";

import type { FooterLinkProps } from "../FooterLink/footerLink.types";

export interface FooterCategoryProps {
	id: string;
  title: string;
  children?: ReactNode;
	links?: FooterLinkProps[];
}
