import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { JsonLdNode, JsonLdRef } from "./types";
import { getAsBoolean, getDate, imgUrl, num, str } from "#lib/jcr";
import { toAbsoluteUrl } from "#lib/pageUrl";
import { normalizeYouTubeUrl } from "#cms/VideoBlock/videoBlock.mapping";
import { secondsToIsoDuration } from "./iso8601";
import { toPlainText } from "./richText";

/**
 * `VideoObject` construit depuis les blocs `sofnt:videoBlock` de la page.
 *
 * Les pages vidéo disposent déjà d'une retranscription textuelle complète
 * (`transcription`) : elle alimente `transcript`, ce qui donne aux moteurs
 * génératifs le contenu de la vidéo sans qu'ils aient à la lire.
 *
 * `uploadDate` est OBLIGATOIRE côté Google — sans elle le rich result vidéo ne
 * sort pas. Un bloc qui ne la porte pas est donc omis du graphe plutôt qu'émis
 * incomplet : un balisage invalide est signalé en Search Console, un balisage
 * absent ne l'est pas.
 */
export interface VideoObjectInput {
	origin: string;
	/** Repli de `description` quand le bloc n'a pas de sous-titre. */
	fallbackDescription: string;
	/** Code langue de la ressource courante (`fr`). */
	inLanguage: string;
	/** Renvoi vers l'`Organization` du graphe, `undefined` quand elle n'est pas émise. */
	publisher: JsonLdRef | undefined;
	/** Fabrique l'`@id` du n-ième bloc vidéo de la page. */
	id: (index: number) => string;
}

/**
 * Vignette YouTube déduite de l'`embedUrl`, repli quand le bloc n'a pas de poster.
 *
 * `hqdefault.jpg` (480×360) et non `maxresdefault.jpg` : cette dernière n'est
 * générée que pour les vidéos publiées en haute définition et rend un 404 pour les
 * autres — on remplacerait un « champ manquant » par une « image inaccessible ».
 * `hqdefault` existe pour toute vidéo et dépasse largement le minimum Google (60×30).
 */
const youTubeThumbnail = (embedUrl: string): string => {
	const videoId = embedUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/)?.[1];
	return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
};

const buildVideoObject = (
	node: JCRNodeWrapper,
	index: number,
	{ origin, fallbackDescription, inLanguage, publisher, id }: VideoObjectInput,
): JsonLdNode | null => {
	if (getAsBoolean(node, "excludeFromStructuredData")) return null;

	// `jcr:title` d'abord : c'est le titre VISIBLE (le H2 du bloc). `videoTitle` est
	// le libellé annoncé par les lecteurs d'écran, que le CND autorise explicitement
	// à différer du titre affiché — le publier comme `name` décrirait la vidéo
	// autrement que ne le fait la page.
	const name = (str(node, "jcr:title") || str(node, "videoTitle")).trim();
	// Même normalisation que le lecteur rendu par `VideoBlock` : le contributeur
	// colle indifféremment une URL `/watch?v=`, `youtu.be/` ou `/embed/`, et seule
	// la dernière forme est un `embedUrl` valide. La fonction rend `""` pour tout
	// hôte non-YouTube, ce que la garde ci-dessous traduit par « pas de balisage » —
	// sinon on décrirait une vidéo que la page ne joue pas.
	const embedUrl = normalizeYouTubeUrl(str(node, "videoUrl"));
	const uploadDate = getDate(node, "uploadDate").iso;
	// `thumbnailUrl` est REQUIS par Google au même titre que `name` et `uploadDate` :
	// un bloc sans poster produisait un « Missing field thumbnailUrl » en Search
	// Console. Le repli est gratuit puisque `normalizeYouTubeUrl` garantit une URL
	// `/embed/<id>` — YouTube expose une vignette dérivée de cet identifiant.
	const thumbnailUrl = toAbsoluteUrl(origin, imgUrl(node, "poster")) || youTubeThumbnail(embedUrl);
	if (!name || !embedUrl || !uploadDate || !thumbnailUrl) return null;

	const duration = secondsToIsoDuration(num(node, "durationSeconds"));
	const description = str(node, "subtitle").trim() || fallbackDescription;
	const transcript = toPlainText(str(node, "transcription"));

	return {
		"@type": "VideoObject",
		"@id": id(index),
		"name": name,
		"description": description || undefined,
		"thumbnailUrl": thumbnailUrl,
		"uploadDate": uploadDate,
		"duration": duration || undefined,
		// Les vidéos sont embarquées depuis un lecteur externe : `embedUrl` est la
		// seule des deux propriétés attendues que l'on puisse renseigner
		// (`contentUrl` supposerait un fichier hébergé en propre). L'URL est déjà
		// absolue — `normalizeYouTubeUrl` ne rend que des URLs YouTube complètes.
		"embedUrl": embedUrl,
		"transcript": transcript || undefined,
		"inLanguage": inLanguage || undefined,
		"publisher": publisher,
	};
};

/**
 * Retourne un `VideoObject` par bloc exploitable, dans l'ordre du document. Les
 * `@id` sont numérotés sur les nœuds RETENUS, pour rester contigus même quand un
 * bloc intermédiaire est écarté.
 */
export const buildVideoObjects = (
	videoNodes: JCRNodeWrapper[],
	input: VideoObjectInput,
): JsonLdNode[] => {
	const nodes: JsonLdNode[] = [];
	for (const node of videoNodes) {
		const video = buildVideoObject(node, nodes.length, input);
		if (video) nodes.push(video);
	}
	return nodes;
};
