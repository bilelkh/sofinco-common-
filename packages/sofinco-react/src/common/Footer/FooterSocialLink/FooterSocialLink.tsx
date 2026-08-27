import type { JSX } from "react";
import type { FooterSocialLinkProps, SocialNetworkType } from "./footerSocialLink.types";
import classes from "./footerSocialLink.module.css";

// Fonction utilitaire pour retourner la bonne icône selon le réseau
export function getSocialIcon(network: SocialNetworkType): JSX.Element {
	switch (network) {
		case "facebook":
			return (
				<span className={classes.iconPlaceholder}>
					<svg
						width="32"
						height="32"
						viewBox="0 0 32 32"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<g clip-path="url(#clip0_4434_8814)">
							<path
								d="M15.8333 0C7.0889 0 0 7.0889 0 15.8333C0 23.2585 5.11227 29.4893 12.0086 31.2005V20.672H8.7438V15.8333H12.0086V13.7484C12.0086 8.35937 14.4476 5.8615 19.7385 5.8615C20.7417 5.8615 22.4726 6.05847 23.1806 6.2548V10.6406C22.807 10.6014 22.1578 10.5817 21.3516 10.5817C18.7555 10.5817 17.7523 11.5653 17.7523 14.1221V15.8333H22.9241L22.0356 20.672H17.7523V31.5508C25.5924 30.6039 31.6673 23.9286 31.6673 15.8333C31.6667 7.0889 24.5778 0 15.8333 0Z"
								fill="#0AE6DC"
							/>
						</g>
						<defs>
							<clipPath id="clip0_4434_8814">
								<rect width="31.6667" height="31.6667" fill="white" />
							</clipPath>
						</defs>
					</svg>
				</span>
			);
		case "linkedin":
			return (
				<span className={classes.iconPlaceholder}>
					<svg
						width="32"
						height="32"
						viewBox="0 0 32 32"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M15.8694 0H15.7973C7.0727 0 0 7.07268 0 15.7973V15.8694C0 24.594 7.0727 31.6667 15.7973 31.6667H15.8694C24.594 31.6667 31.6667 24.594 31.6667 15.8694V15.7973C31.6667 7.07268 24.594 0 15.8694 0Z"
							fill="#0AE6DC"
						/>
						<path
							d="M7.55233 10.5252C7.13519 10.138 6.92773 9.65872 6.92773 9.08847C6.92773 8.51822 7.1363 8.01786 7.55233 7.62956C7.96948 7.24237 8.50645 7.04822 9.16435 7.04822C9.82225 7.04822 10.3381 7.24237 10.7542 7.62956C11.1713 8.01675 11.3788 8.5038 11.3788 9.08847C11.3788 9.67315 11.1702 10.138 10.7542 10.5252C10.337 10.9124 9.80782 11.1065 9.16435 11.1065C8.52088 11.1065 7.96948 10.9124 7.55233 10.5252ZM11.0282 12.7463V24.6173H7.2772V12.7463H11.0282Z"
							fill="#001520"
						/>
						<path
							d="M23.5137 13.919C24.3313 14.8065 24.7396 16.0247 24.7396 17.5757V24.4076H21.1772V18.0572C21.1772 17.275 20.9742 16.667 20.5692 16.2344C20.1643 15.8017 19.6184 15.5842 18.935 15.5842C18.2516 15.5842 17.7057 15.8006 17.3008 16.2344C16.8959 16.667 16.6928 17.275 16.6928 18.0572V24.4076H13.1094V12.713H16.6928V14.264C17.0556 13.747 17.5449 13.3387 18.1595 13.0381C18.7742 12.7374 19.4653 12.5876 20.2342 12.5876C21.6032 12.5876 22.6971 13.0314 23.5137 13.9179V13.919Z"
							fill="#001520"
						/>
					</svg>
				</span>
			);
		case "youtube":
			return (
				<span className={classes.iconPlaceholder}>
					<svg
						width="32"
						height="32"
						viewBox="0 0 32 32"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M31.6667 15.8333C31.6667 7.08884 24.5779 0 15.8333 0C7.08883 0 0 7.08884 0 15.8333C0 24.5779 7.08883 31.6667 15.8333 31.6667C24.5779 31.6667 31.6667 24.5779 31.6667 15.8333Z"
							fill="#0AE6DC"
						/>
						<path
							d="M25.8033 12.5534C25.6787 11.3507 25.4106 10.0211 24.4237 9.32242C23.6594 8.78058 22.6547 8.76055 21.7168 8.76166C19.7341 8.76166 17.7504 8.76501 15.7677 8.76612C13.8607 8.76834 11.9537 8.76946 10.0468 8.77169C9.25014 8.77169 8.47577 8.71049 7.73589 9.05539C7.1006 9.35134 6.60327 9.91431 6.30399 10.5407C5.88899 11.4119 5.80221 12.3987 5.75214 13.3623C5.6598 15.1168 5.66981 16.8758 5.77996 18.6293C5.86118 19.9088 6.067 21.3229 7.0561 22.1384C7.93282 22.8605 9.17003 22.8961 10.3071 22.8972C13.9164 22.9005 17.5267 22.9039 21.1371 22.9061C21.5999 22.9072 22.0828 22.8983 22.5545 22.8471C23.4825 22.747 24.367 22.4811 24.9633 21.7935C25.5652 21.1003 25.7199 20.1357 25.8111 19.2223C26.0336 17.006 26.0314 14.7686 25.8033 12.5534ZM13.6805 18.9408V12.727L19.061 15.8333L13.6805 18.9408Z"
							fill="#001520"
						/>
					</svg>
				</span>
			);
		case "x":
			return <span className={classes.iconPlaceholder}>X</span>;
		case "instagram":
			return <span className={classes.iconPlaceholder}>IG</span>;
		case "tiktok":
			return <span className={classes.iconPlaceholder}>TK</span>;
		default:
			return <span className={classes.iconPlaceholder}>?</span>;
	}
}

export function FooterSocialLink({ network, url }: FooterSocialLinkProps) {
	return (
		<a
			href={url}
			className={classes.socialLink}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`Suivez-nous sur ${network}`}
		>
			{getSocialIcon(network)}
		</a>
	);
}
