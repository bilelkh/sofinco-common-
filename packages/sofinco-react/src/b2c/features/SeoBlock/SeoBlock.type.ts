import { type TitleProps } from "@/shared/ui/Title/Title.type";

export type SeoBlockProps = {
	className?: string;
	title: TitleProps;
	sections: Array<{ id: string; content: string; color?: AvailableColors }>;
	isCentered?: boolean;
};

export type AvailableColors = "green" | "red" | "accent" | "primary";

export type TitleLevel = "h2" | "h3";
