/*
 * Tests DOM des défauts Google Consent Mode et de la garde de consentement.
 *
 * Le script est chargé COMME EN PRODUCTION (cf. `#test/inlineScript`) : on teste
 * l'artefact livré, pas une réécriture.
 *
 * Ce qui est vérifié ici est exactement ce que la console Didomi NE fait PAS. Ses deux
 * intégrations (Consent Mode et GTM) émettent déjà l'`update` et les événements
 * `didomi-consent` — mais aucun `consent default`, et rien qui puisse retenir un <script>
 * que ce module écrit lui-même dans le <head>. C'est ce trou-là que ces tests verrouillent.
 */
import { afterEach, describe, expect, it } from "vitest";
import { bootPage, loadInlineScript, type ScriptHarness } from "#test/inlineScript";

const BOOTSTRAP = loadInlineScript("lib/consent-mode-bootstrap.ts");

let current: ScriptHarness | null = null;

afterEach(() => {
	current?.close();
	current = null;
});

function boot() {
	current = bootPage([BOOTSTRAP], "");
	return current;
}

const win = (page: ScriptHarness) => page.window as unknown as Record<string, unknown>;

const dataLayer = (page: ScriptHarness): unknown[] => (win(page).dataLayer ?? []) as unknown[];

/** File du SDK Didomi, telle que le script la crée. */
const readyQueue = (page: ScriptHarness): Array<(sdk: unknown) => void> =>
	(win(page).didomiOnReady ?? []) as Array<(sdk: unknown) => void>;

const eventListeners = (page: ScriptHarness): Array<{ event: string; listener: () => void }> =>
	(win(page).didomiEventListeners ?? []) as Array<{ event: string; listener: () => void }>;

/** Commandes `gtag(...)` poussées, ramenées à un tableau lisible. */
const commands = (page: ScriptHarness): unknown[][] =>
	dataLayer(page)
		.filter((entry) => entry && typeof entry === "object" && "0" in (entry as object))
		.map((entry) => Array.prototype.slice.call(entry as ArrayLike<unknown>));

const consentCommands = (page: ScriptHarness, kind: "default" | "update") =>
	commands(page)
		.filter((args) => args[0] === "consent" && args[1] === kind)
		.map((args) => args[2] as Record<string, string | number>);

/**
 * Faux SDK Didomi. Une clé absente vaut `undefined` — le cas d'un id qui n'existe pas dans
 * la notice, celui qui transforme une faute de frappe en extinction silencieuse du tag.
 *
 * Les finalités accordées par défaut : la garde exige `cookies` en plus du vendor, et la
 * quasi-totalité des cas de test portent sur le vendor. Les surcharger explicitement partout
 * noierait ce que chaque test vérifie réellement.
 */
const fakeSdk = (
	vendors: Record<string, boolean | undefined>,
	purposes: Record<string, boolean | undefined> = { cookies: true },
) => ({
	getUserConsentStatusForVendor: (id: string) => vendors[id],
	getUserConsentStatusForPurpose: (id: string) => purposes[id],
});

const ALL_GRANTED = fakeSdk({ "c:eulerian": true });
const ALL_DENIED = fakeSdk({ "c:eulerian": false });

/** Draine la file `didomiOnReady`, comme le fait le SDK dès qu'il est prêt. */
function ready(page: ScriptHarness, sdk: unknown) {
	readyQueue(page).forEach((callback) => callback(sdk));
}

describe("défauts Consent Mode", () => {
	it("pose les défauts dès l'exécution, sans aucun CMP présent", () => {
		const page = boot();

		const defaults = consentCommands(page, "default");
		expect(defaults).toHaveLength(1);
		expect(defaults[0]).toMatchObject({
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
			analytics_storage: "denied",
			functionality_storage: "denied",
			personalization_storage: "denied",
		});
	});

	/*
	 * `security_storage` couvre la finalité `technical-cookies` de la notice, marquée
	 * « Requis » : session, sécurité, détection de fraude. La refuser casserait le site
	 * sans rien protéger.
	 */
	it("accorde d'office le seul stockage exempté de consentement", () => {
		expect(consentCommands(boot(), "default")[0].security_storage).toBe("granted");
	});

	it("laisse au CMP le temps de répondre avant que les tags ne partent", () => {
		const wait = Number(consentCommands(boot(), "default")[0].wait_for_update);

		// Trop court, les tags partent en « denied » et la mesure est perdue pour des
		// utilisateurs qui avaient pourtant consenti — un aller-retour CDN tiers + init
		// du SDK + fetch de la config de notice ne tient pas dans 500 ms sur mobile.
		expect(wait).toBeGreaterThanOrEqual(1000);
	});

	/*
	 * LE piège de Consent Mode : GTM ne reconnaît une commande que sous la forme de
	 * l'objet `arguments`. `dataLayer.push(["consent", …])` est silencieusement ignoré —
	 * la page a l'air correcte, et rien n'atteint jamais le container.
	 *
	 * Vérifier `dataLayer[0][0] === "consent"` ne prouve RIEN : un tableau le satisfait
	 * aussi. C'est bien la nature de l'objet qu'on teste ici.
	 */
	it("n'aplatit pas la commande en tableau", () => {
		const first = dataLayer(boot())[0];

		expect(Array.isArray(first)).toBe(false);
		expect(Object.prototype.toString.call(first)).toBe("[object Arguments]");
	});

	it("préserve la mesure des campagnes payantes en cas de refus", () => {
		const sets = commands(boot()).filter((args) => args[0] === "set");

		// Sans eux, le gclid est perdu dès qu'`ad_storage` est refusé — conversions
		// comprises. Sofinco fait de l'acquisition payante.
		expect(sets).toContainEqual(["set", "ads_data_redaction", true]);
		expect(sets).toContainEqual(["set", "url_passthrough", true]);
	});

	/*
	 * esbuild encapsule ce script dans une IIFE (`format: "iife"`, cf. vite.config.mjs) :
	 * sans exposition explicite, `gtag` y resterait prisonnier et serait invisible pour
	 * toute intégration tierce qui l'attend — dont celle de la console Didomi.
	 */
	it("expose gtag sur window malgré l'encapsulation du build", () => {
		expect(typeof win(boot()).gtag).toBe("function");
	});
});

describe("garde de consentement des tags non-Google", () => {
	const onConsent = (page: ScriptHarness) =>
		win(page).__SOFINCO_ON_CONSENT__ as (vendorId: string, callback: () => void) => void;

	it("exécute la callback quand le vendor est accordé", () => {
		const page = boot();
		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);

		expect(fired).toBe(0);
		ready(page, ALL_GRANTED);
		expect(fired).toBe(1);
	});

	it("n'exécute jamais la callback quand le vendor est refusé", () => {
		const page = boot();
		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);

		ready(page, ALL_DENIED);
		expect(fired).toBe(0);
	});

	/*
	 * Un utilisateur qui refuse, puis accepte via « Gérer mes cookies », doit voir le tag
	 * partir TOUT DE SUITE. Sans réévaluation sur `consent.changed`, il faudrait attendre
	 * le rechargement de page — et l'acceptation resterait sans effet visible.
	 */
	it("rattrape une acceptation postérieure au refus", () => {
		const page = boot();
		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);
		ready(page, ALL_DENIED);
		expect(fired).toBe(0);

		win(page).Didomi = ALL_GRANTED;
		eventListeners(page)
			.filter((l) => l.event === "consent.changed")
			.forEach((l) => l.listener());

		expect(fired).toBe(1);
	});

	it("n'exécute la callback qu'une seule fois", () => {
		const page = boot();
		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);

		ready(page, ALL_GRANTED);
		eventListeners(page)
			.filter((l) => l.event === "consent.changed")
			.forEach((l) => l.listener());

		expect(fired).toBe(1);
	});

	/*
	 * Même exigence que `consent-bootstrap.test.ts` : l'enregistrement précède le
	 * chargement du SDK, il ne doit pas être perdu. Ici le SDK est DÉJÀ prêt au moment de
	 * l'enregistrement — le cas symétrique, tout aussi réel sur une page rechargée.
	 */
	it("part immédiatement quand le SDK est déjà prêt", () => {
		const page = boot();
		ready(page, ALL_GRANTED);

		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);
		expect(fired).toBe(1);
	});

	it("respecte l'ordre d'enregistrement", () => {
		const page = boot();
		const order: string[] = [];
		onConsent(page)("c:eulerian", () => order.push("loader"));
		onConsent(page)("c:eulerian", () => order.push("EA_push"));

		ready(page, ALL_GRANTED);

		// Le loader Eulerian définit `EA_push` synchroniquement : inverser les deux
		// lèverait une ReferenceError.
		expect(order).toEqual(["loader", "EA_push"]);
	});

	/*
	 * Sous TCF, accepter un fournisseur et refuser qu'il écrive sur son terminal sont deux
	 * choix distincts. Charger le tag sur le seul consentement au vendor déposerait
	 * l'identifiant Eulerian contre un refus explicite — et nous rendrait plus permissifs que
	 * l'intégration historique, qui exigeait déjà le vendor ET ses finalités.
	 */
	it("retient le tag quand le vendor est accordé mais le stockage refusé", () => {
		const page = boot();
		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);
		ready(page, fakeSdk({ "c:eulerian": true }, { cookies: false }));

		expect(fired).toBe(0);
	});

	it("exige les DEUX : ni le vendor seul ni le stockage seul ne suffisent", () => {
		const page = boot();
		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);
		ready(page, fakeSdk({ "c:eulerian": false }, { cookies: true }));

		expect(fired).toBe(0);
	});

	/*
	 * Le stockage peut être accordé APRÈS coup, panneau de préférences rouvert. La garde
	 * réévalue les deux conditions à chaque changement, pas seulement celle du vendor.
	 */
	it("part dès que le stockage manquant est accordé", () => {
		const page = boot();
		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);

		ready(page, fakeSdk({ "c:eulerian": true }, { cookies: false }));
		expect(fired).toBe(0);

		win(page).Didomi = fakeSdk({ "c:eulerian": true }, { cookies: true });
		eventListeners(page)
			.filter((l) => l.event === "consent.changed")
			.forEach((l) => l.listener());

		expect(fired).toBe(1);
	});

	it("ignore un enregistrement sans vendor ou sans callback", () => {
		const page = boot();
		expect(() => onConsent(page)("", () => {})).not.toThrow();
		expect(() => onConsent(page)("c:eulerian", undefined as unknown as () => void)).not.toThrow();
		ready(page, ALL_GRANTED);
	});
});

describe("robustesse de la garde", () => {
	const onConsent = (page: ScriptHarness) =>
		win(page).__SOFINCO_ON_CONSENT__ as (vendorId: string, callback: () => void) => void;

	/*
	 * `getUserConsentStatusForVendor` renvoie `undefined` — pas `false` — quand l'id
	 * n'existe pas dans la notice. Un id mal orthographié éteindrait donc le tag pour
	 * toujours, sans le moindre signe. On retombe sur le repli sûr, mais on laisse une
	 * trace inspectable en console.
	 */
	it("consigne un id que la notice ne connaît pas", () => {
		const page = boot();
		onConsent(page)("c:inexistant", () => {});
		ready(page, fakeSdk({ "c:eulerian": true }));

		expect(win(page).__SOFINCO_CONSENT_UNRESOLVED__).toContain("c:inexistant");
	});

	it("ne consigne pas deux fois le même id", () => {
		const page = boot();
		onConsent(page)("c:inexistant", () => {});
		ready(page, fakeSdk({}));
		ready(page, fakeSdk({}));

		const unresolved = win(page).__SOFINCO_CONSENT_UNRESOLVED__ as string[];
		expect(new Set(unresolved).size).toBe(unresolved.length);
	});

	/*
	 * Une finalité absente de la notice éteindrait le tag aussi définitivement qu'un id vendor
	 * erroné, et tout aussi silencieusement. Elle est donc consignée par le même canal.
	 */
	it("consigne une finalité que la notice ne connaît pas", () => {
		const page = boot();
		onConsent(page)("c:eulerian", () => {});
		ready(page, fakeSdk({ "c:eulerian": true }, {}));

		expect(win(page).__SOFINCO_CONSENT_UNRESOLVED__).toContain("cookies");
	});

	/*
	 * Les deux lectures sont faites sans court-circuit : un diagnostic qui ne montrerait que
	 * la première erreur enverrait corriger l'id vendor, puis rejouer le tout pour découvrir
	 * la finalité. Les deux d'un coup.
	 */
	it("consigne les deux identifiants quand aucun n'est connu", () => {
		const page = boot();
		onConsent(page)("c:inexistant", () => {});
		ready(page, fakeSdk({}, {}));

		expect(win(page).__SOFINCO_CONSENT_UNRESOLVED__).toEqual(
			expect.arrayContaining(["c:inexistant", "cookies"]),
		);
	});

	/*
	 * Le cas relevé en local : AVANT tout choix, les deux lectures rendent `undefined` — le SDK
	 * ne distingue pas « en attente » de « inconnu ». Sans cette garde, la trace se remplirait
	 * de `["413", "cookies"]` au premier affichage de CHAQUE visiteur, et enverrait chercher
	 * une erreur de configuration inexistante.
	 */
	it("ne consigne rien tant que l'utilisateur n'a pas choisi", () => {
		const page = boot();
		onConsent(page)("413", () => {});
		ready(page, {
			getUserConsentStatusForVendor: () => undefined,
			getUserConsentStatusForPurpose: () => undefined,
			shouldConsentBeCollected: () => true,
		});

		expect(win(page).__SOFINCO_CONSENT_UNRESOLVED__).toEqual([]);
	});

	/*
	 * Et la réciproque : une fois le choix fait, un `undefined` persistant EST une anomalie de
	 * configuration. C'est là, et seulement là, que la trace doit parler.
	 */
	it("consigne l'id une fois le choix fait, si la lecture reste indéterminée", () => {
		const page = boot();
		onConsent(page)("c:inexistant", () => {});
		ready(page, {
			getUserConsentStatusForVendor: () => undefined,
			getUserConsentStatusForPurpose: () => true,
			shouldConsentBeCollected: () => false,
		});

		expect(win(page).__SOFINCO_CONSENT_UNRESOLVED__).toContain("c:inexistant");
	});

	/*
	 * Un SDK qui n'expose pas la méthode ne doit pas museler le diagnostic : on retombe sur le
	 * comportement d'origine plutôt que de tout taire par prudence.
	 */
	it("consigne toujours quand le SDK n'expose pas shouldConsentBeCollected", () => {
		const page = boot();
		onConsent(page)("c:inexistant", () => {});
		ready(page, fakeSdk({}));

		expect(win(page).__SOFINCO_CONSENT_UNRESOLVED__).toContain("c:inexistant");
	});

	it("laisse la trace vide quand l'id est connu", () => {
		const page = boot();
		onConsent(page)("c:eulerian", () => {});
		ready(page, fakeSdk({ "c:eulerian": false }));

		// Refusé n'est PAS inconnu : la trace ne sert que si elle reste lisible.
		expect(win(page).__SOFINCO_CONSENT_UNRESOLVED__).toEqual([]);
	});

	it("ne lève pas sur un SDK absent, partiel ou hostile", () => {
		const page = boot();
		let fired = 0;
		onConsent(page)("c:eulerian", () => fired++);

		expect(() => ready(page, undefined)).not.toThrow();
		expect(() => ready(page, {})).not.toThrow();
		expect(() =>
			ready(page, {
				getUserConsentStatusForVendor: () => {
					throw new Error("SDK indisponible");
				},
			}),
		).not.toThrow();

		// Et dans les trois cas le tag reste retenu : au moindre doute, on ne charge pas.
		expect(fired).toBe(0);
	});

	/*
	 * Les défauts sont posés sans le SDK ; c'est la garde qui en dépend. Si le script
	 * cessait de s'inscrire dans ces files, Eulerian ne partirait plus jamais — sans
	 * aucune erreur pour le signaler.
	 */
	it("s'inscrit dans les deux files du SDK", () => {
		const page = boot();
		expect(readyQueue(page)).toHaveLength(1);
		expect(eventListeners(page).filter((l) => l.event === "consent.changed")).toHaveLength(1);
	});
});
