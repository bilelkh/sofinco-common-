import { Island } from "@jahia/javascript-modules-library";
import type { VideoBlockProps } from "sofinco-react";
import VideoBlockClient from "./views/VideoBlockClient.client";
import { VideoBlock } from "sofinco-react";

/**
 * En live : on hydrate côté client via une <Island>.
 * Le composant DS porte la state du toggle retranscription et du dismiss
 * du preview image — c'est de la logique 100 % client.
 */
export function renderVideoBlockClient(props: VideoBlockProps) {
	return <Island component={VideoBlockClient} props={props} />;
}

/**
 * En édition : on rend un aperçu serveur statique (pas le <VideoBlock> live,
 * dont l'iframe YouTube et les toggles ne seraient pas hydratés dans l'éditeur).
 */
export function renderVideoBlockServer(props: VideoBlockProps) {
	return <VideoBlock {...props} />;
}
