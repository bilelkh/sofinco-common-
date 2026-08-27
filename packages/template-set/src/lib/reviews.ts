import type { JCRNodeWrapper } from "org.jahia.services.content";
import {
	getReviewServiceBridge,
	readNumber,
	readString,
	toArray,
	type JavaRecord,
	type ReviewServiceBridge,
} from "#lib/javaBridge";

/**
 * Porte unique vers le service d'avis (Avis Vérifiés), exposé par le pont OSGi
 * `ReviewServiceBridge` (`sofinco-core`) : la note moyenne du site ET la liste des
 * derniers avis.
 *
 * Module unique et partagé : le sticker du pied de page, le bloc `sofnt:avisClient`
 * et le balisage `AggregateRating` du JSON-LD lisent tous la MÊME donnée. Trois
 * projections locales du bean ont coexisté, avec trois nommages de champs et trois
 * niveaux de garde ; elles convergent ici.
 *
 * Aucun appelant ne doit ré-ouvrir `#lib/javaBridge` pour ce service : tant qu'un
 * appelant reste dehors, la frontière n'en est pas une. Les projections renvoyées
 * sont des données JS simples, sans habillage visuel.
 */

/**
 * Fenêtre de silence entre deux traces identiques.
 *
 * Une trace par FENÊTRE, pas une pour toute la vie du bundle : le sticker est rendu sur
 * toutes les pages du site, une trace par rendu noierait les logs — mais une panne qui
 * revient trois heures plus tard doit produire un nouveau signal.
 *
 * L'horloge est portée par un état de module, admissible ici là où l'état du pont ne
 * l'était pas : au pire on perd une ligne de log, jamais un rendu. Nuance à connaître —
 * le moteur JS de Jahia instancie un contexte GraalVM par thread, donc le compteur est
 * par contexte : on peut voir jusqu'à N traces par fenêtre, pas une seule. C'est borné
 * et sans commune mesure avec une trace par rendu.
 */
export const LOG_WINDOW_MS = 600_000; // 10 min

/** Horodatage de la dernière trace, PAR message : une panne n'en masque pas une autre. */
const lastLoggedAt = new Map<string, number>();

const logThrottled = (message: string, cause?: unknown): void => {
	const now = Date.now();
	if (now - (lastLoggedAt.get(message) ?? 0) < LOG_WINDOW_MS) return;
	lastLoggedAt.set(message, now);
	// `warn`, pas `error` : un pont absent est le mode dégradé NORMAL d'un environnement où
	// `portal-common-sofinco` n'est pas déployé — la page se rend sans le bloc d'avis. Côté Java
	// la même condition sort en WARN. Un ERROR déclencherait une alerte de supervision à tort.
	if (cause === undefined) console.warn(`[reviews] ${message}`);
	else console.warn(`[reviews] ${message}`, cause);
};

/**
 * Résolution du service + garde de nullité + `try`, écrits une seule fois. Les lecteurs
 * n'expriment plus que leur projection.
 *
 * Chaque lecteur garde SA propre enveloppe : si `fetchReviews` échoue, la note moyenne
 * s'affiche quand même. Un lecteur combiné qui ferait les deux appels dans un seul `try`
 * perdrait cette propriété — c'est pourquoi il n'existe pas de `readReviewsWithAverage`.
 *
 * Pas de mémoïsation du pont : `server.osgi.getService` est une consultation de registre
 * en mémoire, négligeable devant l'appel HTTP sortant qu'elle précède. La retenir
 * introduirait un état à durée de vie pour un gain non mesurable.
 *
 * Le `try` englobe AUSSI la résolution du service. Côté Java le contrat est « ne lève
 * jamais » (`ReviewServiceBridgeImpl` attrape `Exception`), mais le comportement de
 * `server.osgi.getService` bundle arrêté n'est garanti par aucun test.
 */
const withBridge = <T>(fallback: T, read: (bridge: ReviewServiceBridge) => T): T => {
	try {
		const bridge = getReviewServiceBridge();
		if (bridge) return read(bridge);
		logThrottled("ReviewServiceBridge introuvable — bundle sofinco-core arrêté ?");
		return fallback;
	} catch (cause) {
		logThrottled("ReviewServiceBridge a levé", cause);
		return fallback;
	}
};

/** Note projetée en données JS simples — jamais le bean Java, qui ne se sérialise pas. */
export interface Rating {
	ratingValue: number;
	reviewCount: number;
}

/**
 * Projette le bean de note moyenne. Fonction pure — testable sans pont.
 *
 * Le bean est projeté immédiatement : le passer tel quel plus loin le ferait entrer
 * dans un `JSON.stringify`, qui sérialise `{}` ou lève sous GraalVM. Les valeurs de la
 * map Java sont des `Double`/`Integer` boxés, d'où le `Number()`.
 */
const projectAverage = (average: { average: number; nbReview: number } | null): Rating | null => {
	if (!average) return null;
	const ratingValue = Number(average.average);
	const reviewCount = Number(average.nbReview);
	if (!Number.isFinite(ratingValue) || !Number.isFinite(reviewCount)) return null;
	return { ratingValue, reviewCount };
};

/**
 * Lit la note moyenne via `ReviewServiceBridge` (OSGi, `sofinco-core`).
 *
 * `configNode` est le nœud `spnt:configVerifedReview` créé par
 * `settings/groovyScripts/avis-verifie.groovy` sous
 * `contents/config/avis-verifies/config` — même source que `sofnt:avisClient`.
 *
 * Gardes et traces : voir `withBridge`.
 */
export const readAverageRating = (configNode: JCRNodeWrapper | null | undefined): Rating | null => {
	if (!configNode) return null;
	return withBridge<Rating | null>(null, (bridge) =>
		projectAverage(bridge.getAverageRate(configNode)),
	);
};

/** Un avis projeté en données JS simples — sans habillage visuel. */
export interface Review {
	id: string;
	rating: number;
	text: string;
	author: string;
	realizedDate: string;
	publishedDate: string;
}

/**
 * Projette la liste d'avis. Fonction pure — testable sans pont.
 *
 * Le retour du pont est une `List` Java, exposée par GraalVM en proxy indexé et non en
 * `Array` : d'où `toArray` avant toute itération.
 *
 * `Review` ne porte aucune propriété d'affichage. La rotation de teintes du carrousel
 * appartient au composant qui rend les cartes, pas au module d'accès au service — un
 * autre consommateur voudra une autre rotation, ou aucune.
 */
const projectReviews = (raw: ArrayLike<JavaRecord> | null): Review[] =>
	toArray<JavaRecord>(raw).map((record, index) => {
		const firstName = readString(record, "firstname");
		const lastName = readString(record, "lastname");
		return {
			id: readString(record, "order_id") || `review-${index}`,
			rating: readNumber(record, "rate"),
			text: readString(record, "review"),
			author: `${firstName} ${lastName ? lastName.charAt(0) + "." : ""}`.trim() || "Client Sofinco",
			realizedDate: readString(record, "order_date"),
			publishedDate: readString(record, "review_date"),
		};
	});

/**
 * Lit les `limit` derniers avis via `ReviewServiceBridge`.
 *
 * Gardes et traces : voir `withBridge`. Enveloppe distincte de celle de
 * `readAverageRating` — si les avis tombent, la note moyenne s'affiche quand même.
 */
export const readReviews = (
	configNode: JCRNodeWrapper | null | undefined,
	{ limit, productId, minNote }: { limit: number; productId: string; minNote: number },
): Review[] => {
	if (!configNode) return [];
	return withBridge<Review[]>([], (bridge) =>
		projectReviews(bridge.fetchReviews(limit, productId, minNote, configNode)),
	);
};
