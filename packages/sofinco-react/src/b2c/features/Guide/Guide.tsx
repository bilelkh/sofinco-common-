import type { GuideProps } from "./guide.types";
import classes from "./guide.module.css";
import Cta from "@shared/ui/Cta/Cta";
import Link from "@shared/ui/Link/Link";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

export function Guide({ title, titleSize = "h2", ctaLabel, ctaUrl, categories = [] }: GuideProps) {
	const TitleTag = titleSize;
	const titleModifier = classes[`guide__title--${titleSize}`];

	return (
		<section className={classes.guide}>
			<div className={classes.guide__grid}>
				<div className={classes.guide__intro}>
					<TitleTag className={`${classes.guide__title} ${titleModifier}`}>
						<FootnoteText>{title}</FootnoteText>
					</TitleTag>

					{ctaLabel && ctaUrl && (
						<div className={classes.guide__cta}>
							<Cta
								variant="accent"
								size="medium"
								label={ctaLabel}
								href={ctaUrl}
								iconRight="arrow-right"
								ctaSection="guide"
								tracking={{
									event: "click_cta_guide",
									cta_label: ctaLabel,
									cta_section: "guide",
									cta_url: ctaUrl,
								}}
							/>
						</div>
					)}
				</div>

				<div className={classes.guide__categories}>
					{categories.map((category) => (
						<article key={category.id} className={classes.guide__category}>
							{category.imageUrl && (
								<div className={classes["guide__image-wrapper"]}>
									<Image
										src={category.imageUrl}
										alt={category.imageAlt ?? ""}
										width={140}
										height={140}
										className={classes.guide__image}
										pictureClassName={classes.guide__picture}
										sources={
											category.imageUrlMobile
												? [
														{
															media: "(max-width: 899.98px)",
															srcSet: category.imageUrlMobile,
															width: 279,
															height: 80,
														},
													]
												: undefined
										}
									/>
								</div>
							)}

							<div className={classes.guide__content}>
								<span className={classes.guide__eyebrow}>
									<FootnoteText>{category.title}</FootnoteText>
								</span>
								<ul className={classes["guide__link-list"]}>
									{category.links.map((link) => (
										<li key={link.id} className={classes["guide__link-item"]}>
											<Link
												href={link.url}
												label={link.label}
												iconLeft="arrow-right"
												iconVariant="accent"
												theme="dark"
												className={classes.guide__link}
											/>
										</li>
									))}
								</ul>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
