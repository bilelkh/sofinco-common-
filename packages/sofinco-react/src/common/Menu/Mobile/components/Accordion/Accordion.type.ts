import type { LinkProps } from "@shared/ui/Link/Link.type";

export type AccordionProps = {
  className?: string;
  content: Array<Item>;
};

type Item = {
  title: string;
  links: Array<LinkProps>;
};
