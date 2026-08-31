/*
 * Tests DOM du délégué iovox « rappel immédiat ».
 *
 * Le script est chargé COMME EN PRODUCTION (cf. `#test/inlineScript`) : on teste l'artefact
 * livré, pas une réécriture. Ce qu'il pilote ne nous appartient qu'à moitié — le bouton
 * déclencheur vient du back-office Smart Tribune, le formulaire vient d'iovox — donc les
 * cas qui comptent sont ceux où l'un des deux change ou ne répond pas.
 */
import { afterEach, describe, expect, it } from "vitest";
import { bootPage, loadInlineScript, type ScriptHarness } from "#test/inlineScript";

const BOOTSTRAP = loadInlineScript("lib/smartPush/iovox-webcallback-bootstrap.ts");

const WANNASPEAK_ORIGIN = "https://saas.wannaspeak.com";

/** Identifiant réel relevé sur le porteur de données Smart Tribune. */
const CARRIER = "voxreflexbutton_33368_e5d02c31c44cf47073d6dcba60d5e75e";

let current: ScriptHarness | null = null;

afterEach(() => {
	current?.close();
	current = null;
});

/**
 * Balisage complet : le bouton tel que Smart Tribune l'injecte (attributs Bootstrap hérités
 * de l'ancien sofinco.fr compris), suivi de la modale telle que `IovoxWebCallback` la rend.
 */
function markup(carrierId: string | null = CARRIER) {
	const carrier = carrierId === null ? "" : `<img id="${carrierId}" />`;
	return (
		`<button type="button" data-bs-toggle="modal" data-bs-target="#iovoxWebCallback"` +
		` class="contact-button-callback">${carrier}Faites-vous rappeler immédiatement</button>` +
		`<dialog id="iovoxWebCallback">` +
		`<div><h2 id="iovoxWebCallbackTitle">Être rappelé</h2>` +
		`<button type="button" data-iovox-close>×</button></div>` +
		`<div id="iovoxWebCallbackBody"><iframe id="iovoxIframe"></iframe></div>` +
		`</dialog>`
	);
}

function boot(html = markup()) {
	current = bootPage([BOOTSTRAP], html);
	return current;
}

const dialogOf = (page: ScriptHarness) =>
	page.$("#iovoxWebCallback") as unknown as HTMLDialogElement;
const iframeOf = (page: ScriptHarness) => page.$("#iovoxIframe") as HTMLIFrameElement;
const bodyOf = (page: ScriptHarness) => page.$("#iovoxWebCallbackBody") as HTMLElement;

/** Émet un `postMessage` en maîtrisant l'origine — le script s'en sert comme filtre. */
function postMessage(page: ScriptHarness, data: string, origin = WANNASPEAK_ORIGIN) {
	const window = page.window as unknown as Window & typeof globalThis;
	const event = new window.MessageEvent("message", { data });
	Object.defineProperty(event, "origin", { value: origin });
	window.dispatchEvent(event);
}

describe("ouverture", () => {
	it("ouvre la modale au clic sur le bouton Smart Tribune", () => {
		const page = boot();

		page.click("button");

		expect(dialogOf(page).open).toBe(true);
	});

	it("bâtit le src de l'iframe depuis le porteur de données", () => {
		const page = boot();

		page.click("button");

		expect(iframeOf(page).getAttribute("src")).toBe(
			`${WANNASPEAK_ORIGIN}/popup/popup.php` +
				`?id=33368&key=e5d02c31c44cf47073d6dcba60d5e75e&popup=1`,
		);
	});

	it("ne charge RIEN avant le premier clic", () => {
		const page = boot();

		expect(iframeOf(page).getAttribute("src")).toBeNull();
	});

	it("reste inerte, et trace, quand le porteur a disparu", () => {
		const page = boot(markup(null));

		page.click("button");

		// Ni coquille vide ni requête tierce : le bouton ne fait rien, mais la console le dit.
		expect(dialogOf(page).open).toBe(false);
		expect(iframeOf(page).getAttribute("src")).toBeNull();
	});

	it("refuse un format de porteur inconnu plutôt que d'inventer une URL", () => {
		const page = boot(markup("voxreflexbutton_33368"));

		page.click("button");

		expect(dialogOf(page).open).toBe(false);
	});

	it("garde la clé ENTIÈRE même si elle contient un souligné", () => {
		const page = boot(markup("voxreflexbutton_33368_abc_def"));

		page.click("button");

		// `parts[2]` seul tronquerait à `abc` et partirait avec une clé fausse.
		expect(iframeOf(page).getAttribute("src")).toContain("&key=abc_def&");
	});

	it("laisse le bouton Smart Tribune suivre son cours — rien à empêcher", () => {
		const page = boot();

		// `<button type="button">` : un `preventDefault` en bloc n'annulerait rien ici, mais
		// masquerait le cas d'à côté.
		expect(page.click("button")).toBe(false);
	});

	it("annule la navigation quand le repli par classe est rendu en lien", () => {
		/*
		 * `.contact-button-callback` est le repli prévu pour le jour où `data-bs-target`
		 * sauterait de la config Smart Tribune — et rien ne garantit que son balisage de
		 * remplacement soit encore un bouton. En `<a href>` sans ce garde, la page part à
		 * l'instant même où la modale s'ouvre.
		 */
		const page = boot(
			`<a href="/contact" class="contact-button-callback"><img id="${CARRIER}" />Rappel</a>` +
				`<dialog id="iovoxWebCallback">` +
				`<div id="iovoxWebCallbackBody"><iframe id="iovoxIframe"></iframe></div>` +
				`</dialog>`,
		);

		expect(page.click("a")).toBe(true);
		expect(dialogOf(page).open).toBe(true);
	});

	it("ne pose le src qu'une fois, même après plusieurs clics", () => {
		const page = boot();

		page.click("button");
		const first = iframeOf(page).getAttribute("src");
		page.click("button");

		expect(iframeOf(page).getAttribute("src")).toBe(first);
	});
});

describe("fermeture", () => {
	it("se ferme au clic sur le voile", () => {
		const page = boot();
		page.click("button");

		// `<dialog>` natif : un clic sur `::backdrop` est rapporté sur l'élément lui-même.
		page.click(dialogOf(page) as unknown as Element);

		expect(dialogOf(page).open).toBe(false);
	});

	it("reste ouverte au clic DANS le panneau", () => {
		const page = boot();
		page.click("button");

		page.click("#iovoxWebCallbackBody");

		expect(dialogOf(page).open).toBe(true);
	});

	it("se ferme au clic sur le bouton de repli mobile", () => {
		const page = boot();
		page.click("button");

		page.click("[data-iovox-close]");

		expect(dialogOf(page).open).toBe(false);
	});

	it("se ferme sur le message `iovox_wcb_close` du formulaire", () => {
		const page = boot();
		page.click("button");

		postMessage(page, "iovox_wcb_close");

		expect(dialogOf(page).open).toBe(false);
	});

	it("relâche le src pour que la réouverture reparte d'un formulaire NEUF", () => {
		const page = boot();
		page.click("button");

		postMessage(page, "iovox_wcb_close");

		// Sans cela l'iframe n'est jamais rechargée : la 2e demande rouvre sur l'écran de
		// confirmation de la 1re.
		expect(iframeOf(page).getAttribute("src")).toBeNull();
	});

	it("efface la hauteur inline, qui figerait le corps au format précédent", () => {
		const page = boot();
		page.click("button");
		bodyOf(page).style.paddingTop = "32px";
		bodyOf(page).style.paddingBottom = "32px";
		postMessage(page, "iovox_wcb_resize-900");

		postMessage(page, "iovox_wcb_close");

		expect(bodyOf(page).style.height).toBe("");
	});

	it("nettoie aussi quand la modale est fermée par Échap, hors de notre `close()`", () => {
		const page = boot();
		page.click("button");

		// Échap ferme nativement : le nettoyage doit être branché sur l'événement `close`.
		dialogOf(page).close();

		expect(iframeOf(page).getAttribute("src")).toBeNull();
	});
});

describe("redimensionnement", () => {
	it("ajoute le padding vertical relu dans le style calculé", () => {
		const page = boot();
		page.click("button");
		bodyOf(page).style.paddingTop = "32px";
		bodyOf(page).style.paddingBottom = "32px";

		postMessage(page, "iovox_wcb_resize-900");

		expect(bodyOf(page).style.height).toBe("964px");
	});

	it("retombe sur 0 quand le padding calculé n'est pas exploitable", () => {
		const page = boot();
		page.click("button");

		postMessage(page, "iovox_wcb_resize-900");

		// Sans repli on écrirait `NaNpx`, que le navigateur jette : échec MUET.
		expect(bodyOf(page).style.height).toBe("900px");
	});

	it("garde le côté lisible quand un seul des deux paddings l'est", () => {
		const page = boot();
		page.click("button");
		bodyOf(page).style.paddingTop = "32px";

		postMessage(page, "iovox_wcb_resize-900");

		// Un repli posé sur la SOMME retomberait à 900px et perdrait ce côté-ci.
		expect(bodyOf(page).style.height).toBe("932px");
	});

	it("ignore une hauteur illisible plutôt que d'écrire une valeur invalide", () => {
		const page = boot();
		page.click("button");

		postMessage(page, "iovox_wcb_resize-beaucoup");

		expect(bodyOf(page).style.height).toBe("");
	});
});

describe("sortie de secours", () => {
	/**
	 * Horloge contrôlée POSÉE DANS la fenêtre happy-dom : le script s'exécute dedans, donc
	 * il appelle `window.setTimeout` — que les faux minuteurs de Vitest, qui remplacent
	 * ceux de `globalThis`, n'intercepteraient pas. On boote sans script pour pouvoir
	 * substituer l'horloge avant l'évaluation.
	 */
	function bootWithClock(html = markup()) {
		const page = bootPage([], html);
		current = page;

		const timers = new Map<number, () => void>();
		let lastId = 0;
		const window = page.window as unknown as Record<string, unknown>;
		window.setTimeout = (fn: () => void) => {
			timers.set((lastId += 1), fn);
			return lastId;
		};
		window.clearTimeout = (id: number) => void timers.delete(id);

		page.window.eval(BOOTSTRAP);

		return {
			page,
			/** Fait sonner tout ce qui est encore programmé. */
			tick() {
				const due = [...timers.values()];
				timers.clear();
				for (const fn of due) fn();
			},
		};
	}

	const isStalled = (page: ScriptHarness) => dialogOf(page).hasAttribute("data-iovox-stalled");

	/** `load` de l'iframe, tel que le navigateur l'émet quand le formulaire arrive. */
	function fireIframeLoad(page: ScriptHarness) {
		iframeOf(page).dispatchEvent(new page.window.Event("load") as never);
	}

	it("révèle la barre quand le formulaire n'arrive jamais", () => {
		const { page, tick } = bootWithClock();
		page.click("button");

		tick();

		// Bloqueur, réseau, CSP : la croix d'iovox n'existe pas non plus, et sous 48rem il
		// n'y a ni touche Échap ni voile visable. Sans ce filet, plus aucune sortie.
		expect(isStalled(page)).toBe(true);
	});

	it("ne la révèle PAS quand le formulaire arrive à temps", () => {
		const { page, tick } = bootWithClock();
		page.click("button");

		fireIframeLoad(page);
		tick();

		// Cas normal : iovox rend son propre en-tête. Deux croix et deux titres sinon.
		expect(isStalled(page)).toBe(false);
	});

	it("la replie si le formulaire finit par arriver, en retard", () => {
		const { page, tick } = bootWithClock();
		page.click("button");
		tick();

		fireIframeLoad(page);

		expect(isStalled(page)).toBe(false);
	});

	it("ne la laisse pas traîner d'une ouverture à la suivante", () => {
		const { page, tick } = bootWithClock();
		page.click("button");
		tick();

		postMessage(page, "iovox_wcb_close");

		expect(isStalled(page)).toBe(false);
	});
});

describe("cloisonnement", () => {
	it("ignore un message venu d'une autre origine", () => {
		const page = boot();
		page.click("button");

		postMessage(page, "iovox_wcb_resize-900", "https://exemple.invalid");

		expect(bodyOf(page).style.height).toBe("");
	});

	it("ignore une fermeture venue d'une autre origine", () => {
		const page = boot();
		page.click("button");

		postMessage(page, "iovox_wcb_close", "https://exemple.invalid");

		expect(dialogOf(page).open).toBe(true);
	});

	it("n'installe ses écouteurs qu'une fois", () => {
		const page = boot();
		let opened = 0;
		const dialog = dialogOf(page);
		const native = dialog.showModal.bind(dialog);
		dialog.showModal = () => {
			opened += 1;
			native();
		};

		page.window.eval(BOOTSTRAP);
		page.click("button");

		expect(opened).toBe(1);
	});
});
