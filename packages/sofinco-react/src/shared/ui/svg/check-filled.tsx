/**
 * Coche pleine (Material `check`) — géométrie exportée telle quelle depuis Figma.
 *
 * À ne pas confondre avec `check` (Lucide), tracé au `stroke` avec des bouts arrondis :
 * ici le glyphe est une forme *pleine* à angles vifs, seule version utilisée par les
 * états « validés » du Stepper (cercle navy, coche blanche).
 *
 * Le path natif mesure 16.3 × 12.025 ; Figma le pose dans une boîte de 24 × 24 avec
 * les insets left/right 16.04 % et top 24.9 %. Le `translate` reproduit ce calage
 * exact plutôt que de redessiner le tracé.
 */
const CheckFilled = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<g transform="translate(3.85 5.976)">
				<path
					d="M5.7 12.025L0 6.325L1.425 4.9L5.7 9.175L14.875 0L16.3 1.425L5.7 12.025Z"
					fill="currentColor"
				/>
			</g>
		</svg>
	);
};

export default CheckFilled;
