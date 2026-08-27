export type HeadingLevel = "h1" | "h2" | "h3" | "h4";

export type TitleProps = {
	children: React.ReactNode | string;
	as?: HeadingLevel;
	visualStyle?: HeadingLevel | "none";
	variant?: "dark" | "white";
	className?: string;
	id?: string;
};
