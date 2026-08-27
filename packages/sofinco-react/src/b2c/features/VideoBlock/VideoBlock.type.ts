import type { TitleProps } from "@shared/ui/Title/Title.type";

/**
 * Embedded video information.
 */
export type VideoBlockVideo = {
	/** Video embed URL (YouTube embed, Vimeo embed, etc.). */
	url: string;
	/** Video title, used notably for iframe accessibility. */
	title: string;
};

/**
 * Preview image displayed before loading the video.
 */
export type VideoBlockPreviewImg = {
	/** Preview image URL. */
	url: string;
	/**
	 * Alternative text for the image.
	 * Leave empty if the image is purely decorative.
	 */
	alt?: string;
};

/**
 * Video transcript content.
 */
export type VideoBlockTranscription = {
	/** Transcript section title. */
	title: string;
	/** Transcript HTML content. */
	content: string;
};

/**
 * VideoBlock component props.
 */
export type VideoBlockProps = {
	/** Additional CSS class name. */
	className?: string;

	/** Optional block title. */
	title?: TitleProps;

	/** Optional subtitle. */
	subtitle?: string;

	/** Video information. */
	video: VideoBlockVideo;

	/** Preview image displayed before the video starts playing. */
	previewImg?: VideoBlockPreviewImg;

	/** Transcript associated with the video. */
	transcription: VideoBlockTranscription;
};
