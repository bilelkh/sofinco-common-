import SectionHeading from "@shared/ui/SectionHeading";
import Title from "@shared/ui/Title";
import Cta from "@shared/ui/Cta";
import Pill from "@shared/ui/Pill";
import Image from "@shared/ui/Image";

import type { SectionCarteProps } from "./SectionCarte.type";
import classes from "./SectionCarte.module.css";
import { FootnoteText } from "@shared/footnotes";

export default function SectionCarte({
	title,
	subtitle,
	eyebrow,
	titleAs = "h2",
	visualStyle,
	align = "center",
	imageUrl,
	imageAlt = "",
	contentTitle,
	contentText,
	items,
	ctaLabel,
	ctaUrl,
	ctaTracking,
}: SectionCarteProps) {
	return (
		<section className={classes["section-carte"]}>
			<div className={classes["section-carte__container"]}>
				<SectionHeading
					title={title}
					subtitle={subtitle}
					eyebrow={eyebrow}
					titleAs={titleAs}
					visualStyle={visualStyle}
					align={align}
					className={classes["section-carte__heading"]}
				/>

				<div className={classes["section-carte__grid"]}>
					{imageUrl ? (
						<div className={classes["section-carte__media"]}>
							<Image
								src={imageUrl}
								alt={imageAlt}
								width={600}
								height={600}
								className={classes["section-carte__image"]}
							/>
						</div>
					) : null}

					<div className={classes["section-carte__content"]}>
						<Title as="h3" visualStyle="h4" className={classes["section-carte__content-title"]}>
							{contentTitle}
						</Title>
						<p className={classes["section-carte__content-text"]}>
							<FootnoteText>{contentText}</FootnoteText>
						</p>

						{items.length > 0 && (
							<ul className={classes["section-carte__list"]}>
								{items.map((item) => (
									<li key={item.id}>
										<Pill icon={item.icon ?? "check"} label={item.label} />
									</li>
								))}
							</ul>
						)}

						<div className={classes["section-carte__cta"]}>
							<Cta
								variant="accent"
								size="large"
								className={classes["section-carte__cta-button"]}
								label={ctaLabel}
								href={ctaUrl}
								ctaSection="section-carte"
								tracking={ctaTracking}
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
