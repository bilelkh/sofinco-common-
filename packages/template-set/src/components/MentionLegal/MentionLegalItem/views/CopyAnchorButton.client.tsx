import { useState } from "react";
import classes from "./mentionLegalItem.module.css";

interface Props {
	/** Value placed in the clipboard — the anchor fragment, e.g. "#mention-1". */
	value: string;
}

function CopyIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
			<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

export default function CopyAnchorButton({ value }: Props) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(value);
			} else {
				// Fallback for non-secure contexts (Jahia edit iframe served over HTTP),
				// where navigator.clipboard is undefined.
				const textarea = document.createElement("textarea");
				textarea.value = value;
				textarea.style.position = "fixed";
				textarea.style.opacity = "0";
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
			}
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			/* clipboard unavailable — silently ignore */
		}
	}

	return (
		<button
			type="button"
			className={
				copied
					? `${classes.mentionLegalItem__copy} ${classes["mentionLegalItem__copy--done"]}`
					: classes.mentionLegalItem__copy
			}
			onClick={handleCopy}
			aria-label={copied ? "Ancre copiée" : "Copier l'ancre"}
			title={value}
		>
			{copied ? <CheckIcon /> : <CopyIcon />}
		</button>
	);
}
