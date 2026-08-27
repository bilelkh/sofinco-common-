export type ArrowRightSize = "small" | "large";
export type ArrowRightColor = "secondary" | "primary" | "current";

interface ArrowRightProps {
	size?: ArrowRightSize;
	color?: ArrowRightColor;
	className?: string;
}

const SIZE_MAP: Record<ArrowRightSize, { width: number; height: number }> = {
	small: { width: 10, height: 9 },
	large: { width: 14, height: 13 },
};

const COLOR_MAP: Record<ArrowRightColor, string> = {
	secondary: "var(--color-secondary-base)",
	primary: "var(--color-primary-base)",
	current: "currentColor",
};

const ArrowRight = ({ size = "small", color = "current", className }: ArrowRightProps) => {
	const { width, height } = SIZE_MAP[size];
	const stroke = COLOR_MAP[color];

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 14 13"
			fill="none"
			aria-hidden="true"
			className={className}
			style={{ color: stroke }}
		>
			<path
				d="M8.6267 10.371L12.75 6.24769L8.55206 6.25861L12.6877 6.24769L8.6267 10.371Z"
				fill="currentColor"
			/>
			<path
				d="M12.75 6.24769L10.0011 3.49885L8.62673 2.12442L12.7202 6.24769L8.55206 6.25861L12.75 6.24769Z"
				fill="currentColor"
			/>
			<path
				d="M0.749983 6.24769L8.55206 6.25861M12.75 6.24769L10.0011 3.49885L8.62673 2.12442M12.75 6.24769L8.6267 10.371M12.75 6.24769L8.55206 6.25861M7.25231 0.75L8.62673 2.12442M7.25228 11.7454L8.6267 10.371M8.62673 2.12442L12.7202 6.24769L8.55206 6.25861M8.6267 10.371L12.6877 6.24769L8.55206 6.25861"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export default ArrowRight;
