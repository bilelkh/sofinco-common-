/**
 * Flèche « retour » pleine (Material `arrow_back`) — géométrie exportée depuis Figma.
 *
 * Distincte de `arrow-left`, qui est une flèche décorative à double trait : celle-ci est
 * le glyphe UI utilisé par le bouton retour du Stepper (variante `line`).
 *
 * Le path natif mesure 12.9792 × 15.163 ; Figma le centre horizontalement dans une boîte
 * de 24 × 24 avec un inset top de 18.44 %. Le `translate` reproduit ce calage.
 */
const ArrowBack = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<g transform="translate(5.5104 4.4256)">
				<path
					d="M2.83333 8.575L6.91667 13.475C7.08333 13.675 7.16319 13.9083 7.15625 14.175C7.14931 14.4417 7.0625 14.675 6.89583 14.875C6.72917 15.0583 6.53472 15.1542 6.3125 15.1625C6.09028 15.1708 5.89583 15.075 5.72917 14.875L0.229167 8.275C0.145833 8.175 0.0868056 8.06667 0.0520833 7.95C0.0173611 7.83333 0 7.70833 0 7.575C0 7.44167 0.0173611 7.31667 0.0520833 7.2C0.0868056 7.08333 0.145833 6.975 0.229167 6.875L5.72917 0.275C5.88194 0.0916667 6.07292 0 6.30208 0C6.53125 0 6.72917 0.0916667 6.89583 0.275C7.0625 0.475 7.14583 0.7125 7.14583 0.9875C7.14583 1.2625 7.0625 1.5 6.89583 1.7L2.83333 6.575H12.1458C12.3819 6.575 12.5799 6.67083 12.7396 6.8625C12.8993 7.05417 12.9792 7.29167 12.9792 7.575C12.9792 7.85833 12.8993 8.09583 12.7396 8.2875C12.5799 8.47917 12.3819 8.575 12.1458 8.575H2.83333Z"
					fill="currentColor"
				/>
			</g>
		</svg>
	);
};

export default ArrowBack;
