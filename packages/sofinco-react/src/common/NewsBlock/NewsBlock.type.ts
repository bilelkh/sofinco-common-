import type { CardProps } from "./Card/Card.type";

export type NewsBlockProps = {
  header: string;
  title: string;
  subtitle: string;
  cards: CardProps[];
  className?: string;
};
