/**
 * Flèche « suivant » pleine (Material `arrow_forward`) — géométrie exportée depuis Figma
 * (node `3211:17704`, boutons de navigation du carrousel B2B).
 *
 * Pendant de `arrow-back`, et distincte de `arrow-right` qui est la flèche décorative à
 * double trait du design system. Le tracé natif occupe une boîte de 20 × 20 : la maquette
 * l'affiche à cette taille exacte dans la pastille de navigation.
 */
const ArrowForward = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M13.4792 10.8333H4.16667C3.93056 10.8333 3.73264 10.7535 3.57292 10.5937C3.41319 10.434 3.33333 10.2361 3.33333 10C3.33333 9.76389 3.41319 9.56597 3.57292 9.40625C3.73264 9.24653 3.93056 9.16667 4.16667 9.16667H13.4792L9.39583 5.08333C9.22917 4.91667 9.14931 4.72222 9.15625 4.5C9.16319 4.27778 9.25 4.08333 9.41667 3.91667C9.58333 3.76389 9.77778 3.68403 10 3.67708C10.2222 3.67014 10.4167 3.75 10.5833 3.91667L16.0833 9.41667C16.1667 9.5 16.2257 9.59028 16.2604 9.6875C16.2951 9.78472 16.3125 9.88889 16.3125 10C16.3125 10.1111 16.2951 10.2153 16.2604 10.3125C16.2257 10.4097 16.1667 10.5 16.0833 10.5833L10.5833 16.0833C10.4306 16.2361 10.2396 16.3125 10.0104 16.3125C9.78125 16.3125 9.58333 16.2361 9.41667 16.0833C9.25 15.9167 9.16667 15.7187 9.16667 15.4896C9.16667 15.2604 9.25 15.0625 9.41667 14.8958L13.4792 10.8333Z"
				fill="currentColor"
			/>
		</svg>
	);
};

export default ArrowForward;
