import clsx from "clsx";
import type { FaqProps } from "./faq.types";
import classes from "./faq.module.css";
import SectionHeading from "@shared/ui/SectionHeading";
import Link from "@shared/ui/Link/Link";
import Image from "@shared/ui/Image";
import { ICONS } from "@shared/ui/svg";
import { sanitizeHtml } from "@utils/sanitizeHtml";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

const Plus = ICONS.plus;
const Minus = ICONS.minus;

function buildSmartTribuneInitScript(integration: NonNullable<FaqProps["integration"]>): string {
	const toList = (csv?: string) =>
		csv
			? csv
					.split(",")
					.map((value) => value.trim())
					.filter(Boolean)
			: [];

	const tags = toList(integration.tagsFilter);
	const thematics = toList(integration.thematicsFilter);

	// Each entry is `key:value`; the value is JSON when possible
	// (e.g. `customResponses:["sofinco-2057"]`), else kept as a raw string.
	const extra: Record<string, unknown> = {};
	for (const entry of integration.extraParams ?? []) {
		const separator = entry.indexOf(":");
		if (separator === -1) continue;
		const key = entry.slice(0, separator).trim();
		if (!key) continue;
		const rawValue = entry.slice(separator + 1).trim();
		try {
			extra[key] = JSON.parse(rawValue);
		} catch {
			extra[key] = rawValue;
		}
	}

	const config = {
		kbId: Number(integration.kbId),
		locale: "fr",
		cookieOptin: Boolean(integration.cookieOptin),
		searchFiltered: Boolean(integration.searchFiltered),
		filters: { thematics, tags, tagsOperator: integration.tagsOr ? "OR" : "AND" },
		...(integration.headerId ? { headerId: integration.headerId } : {}),
		...extra,
	};

	return `window.addEventListener("STFAQLoaded",function(i){i.detail.init(${JSON.stringify(config)})});`;
}

export function Faq(props: FaqProps) {
	const {
		title,
		subtitle,
		imageUrl,
		imageAlt,
		titleAs = "h2",
		titleStyle,
		items,
		link,
		useExternalSource,
		integration,
	} = props;

	if (useExternalSource && integration) {
		return (
			<section className={classes.faq}>
				{imageUrl && (
					<div className={classes["faq__hero"]}>
						{/* 928x300 = the reference desktop visual; `.faq__hero-image` re-crops it per
						    breakpoint (`aspect-ratio` 16/6, then 4/3) so CSS owns the rendered box. */}
						<Image
							src={imageUrl}
							alt={imageAlt ?? ""}
							width={928}
							height={300}
							className={classes["faq__hero-image"]}
						/>
					</div>
				)}
				<div className={classes["faq__external"]}>
					<div id="st-faq" />
					<script dangerouslySetInnerHTML={{ __html: buildSmartTribuneInitScript(integration) }} />
					<script async src={integration.jsUrl} />
				</div>
			</section>
		);
	}

	return (
		<section className={classes.faq}>
			{imageUrl && (
				<div className={classes["faq__hero"]}>
					{/* Same slot as the SmartTribune variant above. */}
					<Image
						src={imageUrl}
						alt={imageAlt ?? ""}
						width={928}
						height={300}
						className={classes["faq__hero-image"]}
					/>
				</div>
			)}
			<div className={classes["faq__content"]}>
				<>
					<SectionHeading
						title={title}
						subtitle={subtitle}
						titleAs={titleAs}
						align="start"
						visualStyle={titleStyle}
						titleClassName={classes["faq__title"]}
					/>
					<div className={classes["faq__items"]}>
						{items.map((item, index) => (
							// Native disclosure — the open/close is browser-native (no JS state),
							// so the whole FAQ renders server-only and works without hydration.
							<details key={item.id} className={classes["faq__item"]}>
								<summary
									className={classes["faq__item-header"]}
									// Conteneur cliquable : renvoi rendu inerte et masqué, note rattachée en description.
									aria-describedby={footnoteDescribedBy(item.question)}
								>
									<span className={classes["faq__item-question"]}>
										<span className={classes["faq__item-number"]}>{index + 1}.</span>{" "}
										<FootnoteText inert>{item.question}</FootnoteText>
									</span>
									<span className={classes["faq__item-toggle"]} aria-hidden="true">
										<span
											className={clsx(
												classes["faq__item-toggle-icon"],
												classes["faq__item-toggle-icon--plus"],
											)}
										>
											<Plus />
										</span>
										<span
											className={clsx(
												classes["faq__item-toggle-icon"],
												classes["faq__item-toggle-icon--minus"],
											)}
										>
											<Minus />
										</span>
									</span>
								</summary>

								<div className={classes["faq__answer"]}>
									<div
										className={classes["faq__answer-text"]}
										dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer) }}
									/>
								</div>
							</details>
						))}
					</div>
					{link && (
						<div className={classes["faq__footer"]}>
							<Link {...link} />
						</div>
					)}
				</>
			</div>
		</section>
	);
}
