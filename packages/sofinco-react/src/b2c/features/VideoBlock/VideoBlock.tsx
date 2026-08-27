import { useId, useState } from "react";
import clsx from "clsx";

import { ICONS } from "@shared/ui/svg";
import styles from "./VideoBlock.module.css";
import type { VideoBlockProps } from "./VideoBlock.type";
import SectionHeading from "@shared/ui/SectionHeading";
import Image from "@shared/ui/Image";
import { sanitizeHtml } from "@utils/sanitizeHtml";
import { FootnoteText, footnoteDescribedBy } from "@shared/footnotes";

const PlusIcon = ICONS.plus;
const MinusIcon = ICONS.minus;
const PlayIcon = ICONS.play;

export default function VideoBlock({
	className,
	video,
	previewImg,
	transcription,
	title,
	subtitle,
}: VideoBlockProps) {
	const generatedId = useId();

	const triggerId = `video-block-trigger-${generatedId}`;
	const contentId = `video-block-content-${generatedId}`;

	const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
	const [isPreviewDismissed, setIsPreviewDismissed] = useState(false);

	const previewImageUrl = previewImg?.url;

	const shouldShowPreview = Boolean(previewImageUrl) && !isPreviewDismissed;

	// ── Tracking payloads (consommés par #lib/tracking-bootstrap) ────────────────
	// Le bootstrap script global (inlined dans <head> de Layout.tsx côté Jahia)
	// détecte ces attributs et merge automatiquement le base context tracking
	// (env_work, platform_mode, page_title, page_url, page_type) avant de
	// pousser dans window.dataLayer.
	const launchTrackingAttr = JSON.stringify({
		event: "launch_video",
		video_label: video.title,
	});
	const impressionTrackingAttr = JSON.stringify({
		event: "video_impression",
		video_label: video.title,
	});

	return (
		<div className={clsx(styles.videoBlock, className)} data-tracking-view={impressionTrackingAttr}>
			{(title || subtitle) && (
				<SectionHeading
					title={title?.children}
					titleAs={title?.as}
					visualStyle={title?.visualStyle}
					id={title?.id}
					subtitle={subtitle}
					align="center"
					className={styles.videoBlock__header}
					titleClassName={clsx(styles.videoBlock__title, title?.className)}
				/>
			)}

			<div className={styles.videoBlock__media}>
				{shouldShowPreview ? (
					<button
						type="button"
						className={styles.videoBlock__previewButton}
						onClick={() => setIsPreviewDismissed(true)}
						aria-label={`Lire la vidéo : ${video.title}`}
						data-tracking={launchTrackingAttr}
					>
						{/* `.videoBlock__media` box: `aspect-ratio: 16 / 9` at its `min(100%, 800px)`. */}
						<Image
							className={styles.videoBlock__previewImage}
							src={previewImageUrl}
							alt={previewImg?.alt ?? ""}
							width={800}
							height={450}
						/>

						<span className={styles.videoBlock__previewPlay} aria-hidden="true">
							<PlayIcon />
						</span>
					</button>
				) : (
					<iframe
						className={styles.videoBlock__iframe}
						src={
							isPreviewDismissed
								? `${video.url}${video.url.includes("?") ? "&" : "?"}autoplay=1`
								: video.url
						}
						title={video.title}
						allow="autoplay; picture-in-picture"
						allowFullScreen
						loading="lazy"
					/>
				)}
			</div>

			<div
				className={clsx(
					styles.videoBlock__transcription,
					isTranscriptOpen && styles["videoBlock__transcription--open"],
				)}
			>
				<button
					id={triggerId}
					type="button"
					className={styles.videoBlock__transcriptionToggle}
					aria-expanded={isTranscriptOpen}
					aria-controls={contentId}
					aria-describedby={footnoteDescribedBy(transcription.title)}
					onClick={() => setIsTranscriptOpen((open) => !open)}
				>
					<span className={styles.videoBlock__transcriptionIcon} aria-hidden="true">
						{isTranscriptOpen ? <MinusIcon /> : <PlusIcon />}
					</span>

					<span className={styles.videoBlock__transcriptionTitle}>
						<FootnoteText inert>{transcription.title}</FootnoteText>
					</span>
				</button>

				<div
					id={contentId}
					className={styles.videoBlock__transcriptionPanel}
					role="region"
					aria-labelledby={triggerId}
					aria-hidden={!isTranscriptOpen}
				>
					<div
						className={styles.videoBlock__transcriptionText}
						dangerouslySetInnerHTML={{
							__html: sanitizeHtml(transcription.content),
						}}
					/>
				</div>
			</div>
		</div>
	);
}
