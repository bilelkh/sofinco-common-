// Inliné en chaîne dans le <head> de Layout.tsx via le plugin Vite `?inline-script`
// (cf. vite.config.mjs). Écrit en TS lisible, minifié au build par esbuild.
//
// PREMIER script du <head>, avant le loader Didomi lui-même — donc avant GTM.
//
// POURQUOI CE FICHIER EXISTE
// --------------------------
// La console Didomi émet DÉJÀ un `gtag('consent','update',…)` : son intégration Google
// Consent Mode est active, et on la voit dans le `dataLayer` de la production. Ce qui
// manque, c'est l'état INITIAL.
//
// Relevé sur sofinco.fr :
//
//   window.dataLayer.filter(x => x[0] === 'consent').map(x => [...x])
//   → [['consent', 'update', { ad_storage: 'denied', … }]]     UN SEUL, et c'est un update
//
// Aucun `consent default`. Or l'`update` de Didomi part depuis `loader.js`, chargé en
// `async` : entre l'exécution de `gtm.js` et son arrivée, GTM n'a AUCUN état de
// consentement — et Google traite un signal non posé comme ACCORDÉ. Des cookies partent
// donc avant tout choix de l'utilisateur. C'est la seule chose que ce script corrige, et
// elle ne peut se corriger qu'ici : il faut un bloc INLINE et SYNCHRONE, en tête de
// document, qu'aucun chargement réseau ne peut doubler.
//
// CE QUE CE SCRIPT NE FAIT PAS, ET POURQUOI
// -----------------------------------------
// Pas de `consent update`, pas d'événement de consentement dans le `dataLayer` : les deux
// intégrations Didomi (Google Consent Mode et GTM) s'en chargent déjà, et le `dataLayer`
// de production le confirme — `didomi-ready`, `didomi-consent`, `didomiVendorsConsent`,
// `didomiPurposesConsent`. Les finalités custom `sWeb` (scoring CACF) et
// `cookie-conv-iadvize` y sont transportées sous forme de liste séparée par virgules,
// exploitable dans GTM avec une condition « contient ».
//
// Doubler ces mécanismes ajouterait un second émetteur de vérité sans rien apporter.

/**
 * Sous-ensemble du SDK Didomi réellement utilisé ici — la garde de consentement des tags
 * que nous émettons nous-mêmes (cf. `__SOFINCO_ON_CONSENT__`).
 *
 * `getUserConsentStatusForVendor` renvoie `true` / `false` — ou `undefined` quand
 * l'identifiant n'existe pas dans la notice. Ce troisième cas est traité explicitement
 * (cf. `resolve`) : un id mal orthographié donnerait sinon un refus définitif et
 * parfaitement silencieux.
 */
interface DidomiConsentSdk {
	getUserConsentStatusForVendor?: (id: string) => boolean | undefined;
	getUserConsentStatusForPurpose?: (id: string) => boolean | undefined;
	/**
	 * `true` tant que l'utilisateur n'a fait AUCUN choix — bannière encore ouverte. Cf.
	 * `pendingChoice` : c'est ce qui distingue « en attente » de « id inconnu », les deux
	 * se présentant sous la même forme (`undefined`) dans les lectures ci-dessus.
	 */
	shouldConsentBeCollected?: () => boolean;
}

/**
 * Fenêtre vue par ce script. Volontairement un alias local plutôt qu'un `declare global` :
 * `consent-bootstrap.ts` et `tracking-bootstrap.ts` augmentent déjà `Window` avec
 * `didomiOnReady` et `dataLayer`, et TypeScript exige des types IDENTIQUES entre
 * déclarations d'une même propriété. Un alias local évite ce couplage — c'est aussi le
 * motif retenu par `sofinco-react/src/shared/analytics`.
 */
type ConsentWindow = Window & {
	dataLayer?: unknown[];
	gtag?: (...args: unknown[]) => void;
	Didomi?: DidomiConsentSdk;
	didomiOnReady?: Array<(didomi: DidomiConsentSdk) => void>;
	didomiEventListeners?: Array<{ event: string; listener: () => void }>;
	/** Cf. `__SOFINCO_ON_CONSENT__` plus bas — utilisé par le loader Eulerian. */
	__SOFINCO_ON_CONSENT__?: (vendorId: string, callback: () => void) => void;
	/** Ids que la notice ne connaît pas. Vide = configuration correcte. Cf. `resolve`. */
	__SOFINCO_CONSENT_UNRESOLVED__?: string[];
};

(function bootstrap() {
	const w = window as unknown as ConsentWindow;

	// ── 1. Défauts Consent Mode, synchrones, avant tout le reste ─────────────────────

	w.dataLayer = w.dataLayer || [];
	const dataLayer = w.dataLayer;

	/*
	 * `push(arguments)` — l'objet `arguments`, PAS un tableau. GTM ne reconnaît une
	 * commande de consentement que sous cette forme ; `push(["consent", …])` est
	 * silencieusement ignoré. C'est la signature exacte du snippet officiel Google, et
	 * c'est la raison d'être du test `n'aplatit pas la commande en tableau`.
	 *
	 * D'où la forme inhabituelle : une expression de fonction SANS paramètre, typée par
	 * `GtagCommand` pour que les appels ci-dessous vérifient. Des paramètres rest
	 * (`...args`) produiraient un vrai tableau — exactement ce que GTM ignore.
	 */
	type GtagCommand = (...args: unknown[]) => void;
	const gtag: GtagCommand = function pushCommand() {
		// eslint-disable-next-line prefer-rest-params -- `arguments` est ici le contrat de GTM, pas une facilité.
		dataLayer.push(arguments);
	};

	/*
	 * Exposé sur `window` seulement s'il n'existe pas déjà : `gtag.js` pose le sien, et
	 * l'écraser romprait ses propres commandes. Sans cette ligne, `gtag` resterait
	 * prisonnier de l'IIFE produite par esbuild (`format: "iife"`, cf. vite.config.mjs) —
	 * invisible pour l'intégration Consent Mode de Didomi, qui émet ses `update` juste
	 * après.
	 */
	if (typeof w.gtag !== "function") {
		w.gtag = gtag;
	}

	/*
	 * Les SEPT signaux, `ad_user_data` et `ad_personalization` compris — ceux de Consent
	 * Mode v2, exigés par Google dans l'EEE depuis mars 2024.
	 *
	 * Ce jeu de clés est EXACTEMENT celui que l'`update` de Didomi porte en production,
	 * vérifié le 17/08/2026 :
	 *
	 *   Object.keys(window.dataLayer.find(x => x[0] === 'consent')[2])
	 *   → ['ad_storage','analytics_storage','functionality_storage',
	 *      'personalization_storage','security_storage','ad_user_data','ad_personalization']
	 *
	 * L'alignement est ce qui rend ces défauts sûrs : chaque clé posée ici est ensuite
	 * relevée par le CMP. Une clé que nous poserions SANS que Didomi la mette à jour
	 * resterait « denied » à vie — et pour les deux signaux v2, cela couperait la mesure
	 * de conversion Google Ads. C'est la seule régression possible de ce bloc ; la
	 * commande ci-dessus est le contrôle, et le correctif serait dans la console Didomi,
	 * jamais ici. Les passer en « granted » par défaut rouvrirait le trou qu'on referme.
	 */
	gtag("consent", "default", {
		ad_storage: "denied",
		ad_user_data: "denied",
		ad_personalization: "denied",
		analytics_storage: "denied",
		functionality_storage: "denied",
		personalization_storage: "denied",
		/*
		 * Seul signal accordé d'office : il correspond à la finalité `technical-cookies`
		 * de la notice, marquée « Requis » et exempte de consentement (sécurité, session,
		 * détection de fraude). C'est aussi la seule valeur que l'`update` de Didomi
		 * accorde déjà en production.
		 */
		security_storage: "granted",
		/*
		 * Délai laissé au CMP pour envoyer son `update` avant que les tags ne partent.
		 * Il couvre un aller-retour CDN tiers + init du SDK + fetch de la config de
		 * notice, sur mobile. Trop court, les tags partent en « denied » et la mesure est
		 * perdue pour des utilisateurs qui avaient pourtant consenti.
		 */
		wait_for_update: 2000,
	});

	/*
	 * Sofinco fait de l'acquisition payante. Sans ces deux réglages, le `gclid` est perdu
	 * dès qu'`ad_storage` est refusé — et les conversions avec.
	 *  - `ads_data_redaction` : caviarde les identifiants de clic publicitaire tant que
	 *    `ad_storage` est refusé (les pings partent, sans cookie ni identifiant).
	 *  - `url_passthrough` : propage `gclid` / `gbraid` d'une page à l'autre par l'URL,
	 *    puisqu'aucun cookie ne peut le porter.
	 */
	gtag("set", "ads_data_redaction", true);
	gtag("set", "url_passthrough", true);

	// ── 2. Garde de consentement des tags que nous émettons nous-mêmes ───────────────
	//
	// Consent Mode ne couvre QUE les tags Google. Eulerian est un <script> que ce module
	// écrit dans le <head> : aucune intégration Didomi ne peut l'intercepter, seul un
	// gardien côté code peut le retenir.

	const unresolved = w.__SOFINCO_CONSENT_UNRESOLVED__ || [];
	w.__SOFINCO_CONSENT_UNRESOLVED__ = unresolved;

	/**
	 * `true` tant qu'aucun choix n'a été fait — bannière encore affichée, ou fermée sans
	 * décider. Le SDK peut ne pas exposer la méthode : on répond alors « pas en attente »,
	 * ce qui restaure le comportement d'origine plutôt que de museler le diagnostic.
	 */
	function pendingChoice(sdk: DidomiConsentSdk | undefined): boolean {
		if (!sdk || typeof sdk.shouldConsentBeCollected !== "function") return false;
		try {
			return sdk.shouldConsentBeCollected() === true;
		} catch {
			return false;
		}
	}

	/**
	 * Normalise un statut Didomi en booléen, en consignant le cas `undefined`.
	 *
	 * `undefined` recouvre DEUX situations que le SDK ne distingue pas — vérifié en local, la
	 * même lecture rendant `undefined` avant le choix de l'utilisateur puis `false` après :
	 *
	 *  1. l'id n'existe pas dans la notice — faute de frappe, vendor renommé côté console ;
	 *  2. l'utilisateur n'a simplement pas encore choisi.
	 *
	 * Les deux retombent sur « refusé », qui est le repli sûr. Mais seul le premier est une
	 * anomalie de configuration, et lui seul mérite d'être consigné : sans `pending`, la trace
	 * se remplissait au tout premier affichage de chaque visiteur, envoyant chercher une
	 * erreur inexistante. Un diagnostic qui crie à chaque page ne diagnostique plus rien.
	 *
	 * ⚠ L'id attendu est l'id BRUT de la notice (`413`, `c:utiq-EN6rjLeE`), pas la forme
	 * préfixée que Didomi publie dans la variable GTM `didomiVendorsConsent` (`iab:413`).
	 * Les deux namespaces ne se confondent pas.
	 */
	function resolve(raw: boolean | undefined, id: string, pending: boolean): boolean {
		if (raw === true) return true;
		if (raw === false) return false;
		if (!pending && unresolved.indexOf(id) === -1) unresolved.push(id);
		return false;
	}

	/**
	 * Identifiant Didomi de la finalité TCF n° 1, « stocker et/ou accéder à des informations
	 * sur un terminal ». C'est la forme littérale employée par la notice — relevée dans
	 * `Didomi.getVendors()`, où les finalités d'Eulerian sortent en
	 * `['cookies', 'select_basic_ads', 'create_ads_profile', …]`.
	 */
	const STORAGE_PURPOSE = "cookies";

	function purposeConsent(sdk: DidomiConsentSdk | undefined, id: string): boolean {
		if (!sdk || typeof sdk.getUserConsentStatusForPurpose !== "function") {
			return resolve(undefined, id, pendingChoice(sdk));
		}
		try {
			return resolve(sdk.getUserConsentStatusForPurpose(id), id, pendingChoice(sdk));
		} catch {
			return resolve(undefined, id, pendingChoice(sdk));
		}
	}

	/**
	 * Accorde le passage seulement si le vendor ET la finalité de stockage sont consentis.
	 *
	 * Le vendor seul ne suffit pas, et c'est un vrai écart, pas une subtilité : sous TCF, un
	 * utilisateur peut accepter un fournisseur tout en refusant qu'on écrive sur son terminal.
	 * Charger le tag dans ce cas déposerait l'identifiant Eulerian contre son choix explicite.
	 * L'intégration historique l'exigeait déjà — elle gardait ses tags sur le vendor `413` ET
	 * les finalités `1-3-4-7-8` — et ne pas le faire nous rendrait plus permissifs que ce que
	 * nous remplaçons.
	 *
	 * `cookies` SEULE, et non les cinq finalités du legacy : c'est celle qui autorise le dépôt
	 * de l'identifiant, donc la seule dont dépend le fait même de charger le script. Exiger les
	 * finalités publicitaires en plus éteindrait la mesure pour tout utilisateur ayant refusé la
	 * personnalisation — une perte que rien n'impose ici, le tag n'étant pas chargé POUR elles.
	 *
	 * Les deux lectures passent par `resolve`, donc une finalité inconnue de la notice se
	 * signale dans `__SOFINCO_CONSENT_UNRESOLVED__` au même titre qu'un id vendor erroné.
	 * L'ordre compte : `vendorConsent` d'abord, sans court-circuit, pour que les DEUX
	 * identifiants inconnus soient consignés et non le premier seulement.
	 */
	function vendorConsent(sdk: DidomiConsentSdk | undefined, id: string): boolean {
		const vendor = rawVendorConsent(sdk, id);
		const storage = purposeConsent(sdk, STORAGE_PURPOSE);
		return vendor && storage;
	}

	function rawVendorConsent(sdk: DidomiConsentSdk | undefined, id: string): boolean {
		if (!sdk || typeof sdk.getUserConsentStatusForVendor !== "function") {
			return resolve(undefined, id, pendingChoice(sdk));
		}
		try {
			return resolve(sdk.getUserConsentStatusForVendor(id), id, pendingChoice(sdk));
		} catch {
			return resolve(undefined, id, pendingChoice(sdk));
		}
	}

	interface Waiter {
		vendorId: string;
		callback: () => void;
		done: boolean;
	}
	const waiters: Waiter[] = [];
	let sdkRef: DidomiConsentSdk | undefined;

	/*
	 * Les callbacks partent dans leur ORDRE D'ENREGISTREMENT. Eulerian en dépend : son
	 * loader et son `EA_push` de page sont émis dans deux <script> distincts, donc
	 * enregistrés séparément — mais le loader définit `EA_push` synchroniquement, il doit
	 * donc s'exécuter en premier.
	 */
	function drainWaiters(sdk: DidomiConsentSdk | undefined) {
		for (let i = 0; i < waiters.length; i++) {
			const waiter = waiters[i];
			if (waiter.done) continue;
			if (!vendorConsent(sdk, waiter.vendorId)) continue;
			// Marqué AVANT l'appel : une callback qui lève ne doit pas être rejouée.
			waiter.done = true;
			waiter.callback();
		}
	}

	/**
	 * Exécute `callback` au plus une fois, dès que Didomi accorde le consentement à
	 * `vendorId` — jamais s'il est refusé.
	 *
	 * Réévaluée à CHAQUE changement de consentement, pas seulement au `didomiOnReady` :
	 * un utilisateur qui refuse, puis accepte via « Gérer mes cookies », doit voir le tag
	 * partir tout de suite et non au rechargement suivant.
	 *
	 * LIMITE, par construction : la réciproque est fausse. Un RETRAIT de consentement ne
	 * décharge pas un tag déjà exécuté — il ne prend effet qu'au chargement de page suivant.
	 * Pour les tags Google, en revanche, l'`update` de Didomi s'applique immédiatement.
	 *
	 * Ce n'est PAS corrigeable ici, et il faut le dire plutôt que de faire semblant : un script
	 * exécuté ne se désexécute pas, l'identifiant est posé et le hit est parti. Neutraliser
	 * `EA_push` après coup casserait les propres mécanismes d'Eulerian sans rien retirer de ce
	 * qui a déjà été envoyé.
	 *
	 * Les deux seuls remèdes réels vivent hors de ce fichier :
	 *  - déclarer les cookies du vendor dans la console Didomi, pour qu'elle les SUPPRIME au
	 *    retrait — c'est ce qui donne un effet immédiat à la révocation ;
	 *  - à défaut, recharger la page sur `consent.changed`, ce qui est un choix produit et non
	 *    technique : on interrompt l'utilisateur au moment où il ferme le panneau.
	 */
	w.__SOFINCO_ON_CONSENT__ = function onConsent(vendorId, callback) {
		if (!vendorId || typeof callback !== "function") return;
		waiters.push({ vendorId, callback, done: false });
		// Le SDK peut déjà être prêt : ne pas attendre le prochain événement pour rien.
		if (sdkRef) drainWaiters(sdkRef);
	};

	/*
	 * Les deux files sont créées si absentes, comme le fait déjà `consent-bootstrap.ts`.
	 * Sans CMP chargé — en contribution, ou si le SDK est bloqué par un adblocker — elles
	 * ne sont jamais drainées : les défauts « denied » restent en place, aucun tag gardé
	 * ne part, et rien ne lève en console. C'est le comportement voulu.
	 */
	/*
	 * Fonction NOMMÉE et typée, pas une lambda inline : `Window.didomiOnReady` est déjà
	 * déclarée par `consent-bootstrap.ts` avec sa propre vue du SDK, et le typage
	 * contextuel d'une lambda hériterait de CETTE déclaration-là. Le paramètre explicite
	 * tranche.
	 */
	function onDidomiReady(sdk: DidomiConsentSdk | undefined) {
		if (sdk) sdkRef = sdk;
		drainWaiters(sdk);
	}

	w.didomiOnReady = w.didomiOnReady || [];
	w.didomiOnReady.push(onDidomiReady);

	w.didomiEventListeners = w.didomiEventListeners || [];
	w.didomiEventListeners.push({
		event: "consent.changed",
		listener: function onConsentChanged() {
			/*
			 * Le SDK ne se passe pas lui-même aux listeners. On lit d'abord la GLOBALE,
			 * qui est le singleton vivant, et seulement à défaut la référence capturée au
			 * `didomiOnReady` — l'inverse s'accrocherait à un objet potentiellement
			 * périmé et rejouerait l'ancien état à chaque changement.
			 */
			drainWaiters(w.Didomi || sdkRef);
		},
	});
})();

export {};
