interface SingleProps {
	className?: string;
}

const Single = ({ className }: SingleProps) => {
	return (
		<svg
			width="30"
			height="30"
			viewBox="0 0 30 30"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={className}
		>
			<g clipPath="url(#clip0_3546_26943)">
				<path
					d="M0 15C0 18.9782 1.58035 22.7936 4.3934 25.6066C7.20644 28.4196 11.0218 30 15 30C18.9782 30 22.7936 28.4196 25.6066 25.6066C28.4196 22.7936 30 18.9782 30 15C30 11.0218 28.4196 7.20644 25.6066 4.3934C22.7936 1.58035 18.9782 0 15 0C11.0218 0 7.20644 1.58035 4.3934 4.3934C1.58035 7.20644 0 11.0218 0 15Z"
					fill="url(#paint0_linear_3546_26943)"
				/>
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M14.9998 16.0714C17.9584 16.0714 20.3569 13.6729 20.3569 10.7143C20.3569 7.7556 17.9584 5.35712 14.9998 5.35712C12.0411 5.35712 9.64264 7.7556 9.64264 10.7143C9.64264 13.6729 12.0411 16.0714 14.9998 16.0714ZM14.9997 19.2857C10.4204 19.2857 6.45109 21.8974 4.5 25.7123C7.20559 28.3645 10.9117 30 14.9997 30C19.0877 30 22.7938 28.3645 25.4994 25.7123C23.5483 21.8974 19.579 19.2857 14.9997 19.2857Z"
					fill="white"
				/>
			</g>
			<rect x="0.5" y="0.5" width="29" height="29" rx="14.5" stroke="#03334D" />
			<defs>
				<linearGradient
					id="paint0_linear_3546_26943"
					x1="15"
					y1="0"
					x2="15"
					y2="30"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#03334C" />
					<stop offset="1" stopColor="#044262" />
				</linearGradient>
				<clipPath id="clip0_3546_26943">
					<rect width="30" height="30" rx="15" fill="white" />
				</clipPath>
			</defs>
		</svg>
	);
};

export default Single;
