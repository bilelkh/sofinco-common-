import { Cta, sanitizeHtml } from "sofinco-react";
import classes from "./representativeExample.module.css";
import previewClasses from "./simulatorPreview.module.css";
import type { RepresentativeExampleServerProps } from "../representativeExampleServer.types";

export function RepresentativeExampleServer(props: RepresentativeExampleServerProps) {
	const { title, cta, subtitle, simulator, mention } = props;

	return (
		<section className={classes.container}>
			{title && <h2 className={classes.title}>{title}</h2>}

			{subtitle && <div className={classes.subtitle}>{subtitle}</div>}

			{simulator && (
				<div className={previewClasses.preview} data-simulation-state={simulator.state}>
					<p className={previewClasses.previewLabel}>
						{simulator.heading}
						{simulator.origin && (
							<span className={previewClasses.previewOrigin}> — {simulator.origin}</span>
						)}
					</p>

					{simulator.notice ? (
						<p className={previewClasses.previewNotice}>{simulator.notice}</p>
					) : (
						<ul className={previewClasses.fields}>
							{simulator.items.map((item) => (
								<li key={item.label} className={previewClasses.field}>
									<p className={previewClasses.fieldLabel}>{item.label}</p>
									<p className={previewClasses.fieldValue}>{item.value}</p>
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			{mention && (
				<div
					className={previewClasses.mentionBody}
					// eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
					dangerouslySetInnerHTML={{ __html: sanitizeHtml(mention) }}
				/>
			)}

			{cta && (
				<Cta
					label={cta.label}
					href={cta.href}
					ctaSection={cta.ctaSection}
					variant="accent"
					size="large"
					className={classes.ctaButton}
					props={{
						target: cta.target,
						rel: cta.target === "_blank" ? "noopener noreferrer" : undefined,
					}}
				/>
			)}
		</section>
	);
}
