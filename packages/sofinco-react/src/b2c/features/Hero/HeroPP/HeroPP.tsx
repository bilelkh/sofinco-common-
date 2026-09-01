import type { HeroPPProps } from "@b2c/features/Hero/HeroPP/HeroPP.type";
import clsx from "clsx";
import Cta from "@shared/ui/Cta/Cta";
import { AvisClientsSticker } from "@b2c/features/AvisClientsSticker/AvisClientsSticker";
import HeroPPOfferCard from "@b2c/features/Hero/HeroPP/HeroPPOfferCard/HeroPPOfferCard";
import { buildViewPromotionAttr } from "@b2c/features/Hero/promotionTracking";
import { useHeaderHeightVar } from "@shared/hooks/useHeaderHeightVar";
// Sous `--medium-down`, l'avis sticker passe sous la carte offre.
import { MEDIUM_DOWN_QUERY, useMediaQuery } from "@shared/hooks/useMediaQuery";

import { sanitizeHtml } from "@utils/sanitizeHtml";
import styles from "@b2c/features/Hero/HeroPP/HeroPP.module.css";
import Title from "@shared/ui/Title";

const HeroPP = ({
	title,
	description,
	cta,
	avis,
	offerCard,
	className,
	tracking,
	eyebrowProps,
}: HeroPPProps) => {
	useHeaderHeightVar();
	const isMobile = useMediaQuery(MEDIUM_DOWN_QUERY);

	return (
		<section
			className={clsx(styles.heropp, className)}
			data-hero-root="true"
			data-tracking-view={buildViewPromotionAttr(tracking)}
		>
			<div className={styles.heropp__container}>
				<div className={styles.heropp__wrapper}>
					<div className={styles.heropp__left}>
						<div className={styles.heropp__content}>
							<div>
								{eyebrowProps && <Title className={styles.heropp__eyebrow} {...eyebrowProps} />}
								{title && <Title {...title} variant="white" />}
							</div>
							{description && (
								<div
									className={styles.heropp__description}
									dangerouslySetInnerHTML={{
										__html: sanitizeHtml(description),
									}}
								/>
							)}
							{cta && <Cta {...cta} className={styles.heropp__cta} />}
							{!isMobile && avis && <AvisClientsSticker {...avis} direction="row" theme="dark" />}
						</div>
					</div>
					<HeroPPOfferCard {...offerCard} />
				</div>
				{isMobile && avis && (
					<AvisClientsSticker {...avis} direction="row" theme="dark" variant="red" />
				)}
			</div>
		</section>
	);
};

export { HeroPP };
export default HeroPP;
