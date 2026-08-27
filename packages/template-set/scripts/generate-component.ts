import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

/* ==========================================================================
   ⚙️  CONFIGURATION : Style d'import pour les fichiers générés
   ==========================================================================
   - 'A' → import { Hero } from "sofinco-react"            (racine)
   - 'B' → import { Hero } from "sofinco-react/Hero"       (sous-chemin)

   ➡️ Changer cette seule ligne pour basculer toute l'équipe.
   ========================================================================== */

type ImportStyle = "A" | "B";
const IMPORT_STYLE: ImportStyle = "A";

/**
 * Retourne le specifier d'import à injecter dans les fichiers générés,
 * en fonction de IMPORT_STYLE.
 *
 * @param importPath — Ex: "Footer/FooterLogo", "Articles/List/Demo"
 */
function getImportSpecifier(importPath: string): string {
	return IMPORT_STYLE === "A" ? "sofinco-react" : `sofinco-react/${importPath}`;
}

/* ==========================================================================
   Périmètre de marque (séparation b2c / b2b / common dans sofinco-react)
   ==========================================================================
   `sofinco-react/src` est cloisonné par marque : un composant vit dans un seul
   de ces dossiers. Le générateur doit donc savoir où déposer la partie React.
   ========================================================================== */

type Scope = "b2c" | "b2b" | "common";

const SCOPES: Record<Scope, { segments: string[]; relative: string; label: string }> = {
	b2c: { segments: ["b2c", "features"], relative: "./b2c/features/", label: "Grand public" },
	b2b: { segments: ["b2b", "features"], relative: "./b2b/features/", label: "Pro" },
	common: { segments: ["common"], relative: "./common/", label: "Partagé b2c + b2b" },
};

/* ==========================================================================
   Readline
   ========================================================================== */

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

/* ==========================================================================
   Utilitaires de formatage
   ========================================================================== */

const getWords = (str: string): string[] => {
	const spaced = str.replace(/([a-z])([A-Z])/g, "$1 $2");
	return spaced.split(/[\s-_]+/).filter((word) => word.length > 0);
};

const toPascalCase = (str: string): string => {
	return getWords(str)
		.map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
		.join("");
};

const toCamelCase = (str: string): string => {
	const pascal = toPascalCase(str);
	if (!pascal) return "";
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

/* ==========================================================================
   Utilitaire d'écriture sécurisée (Ne jamais écraser)
   ========================================================================== */

function safeWriteFile(filePath: string, content: string): void {
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(filePath, content);
		console.log(`✅ Créé   : ${path.basename(filePath)}`);
	} else {
		console.log(`⏩ Ignoré : ${path.basename(filePath)} (Existe déjà)`);
	}
}

/* ==========================================================================
   Logique Principale
   ========================================================================== */

rl.question("\nNom du composant (ex: EventsListDemo, hero-section) : ", (inputName: string) => {
	if (!inputName.trim()) {
		console.error("❌ Erreur : Le nom ne peut pas être vide.");
		rl.close();
		return;
	}

	const words = getWords(inputName);

	console.log("\n🏷️  Périmètre de marque (dossier sofinco-react) :");
	console.log("   [1] b2c    — Grand public       → src/b2c/features/");
	console.log("   [2] b2b    — Pro                → src/b2b/features/");
	console.log("   [3] common — Partagé b2c + b2b  → src/common/\n");

	rl.question("Votre choix (1, 2 ou 3) : ", (scopeInput: string) => {
		const scope: Scope =
			scopeInput.trim() === "2" ? "b2b" : scopeInput.trim() === "3" ? "common" : "b2c";
		console.log(`\n✔  ${scope} sélectionné — ${SCOPES[scope].label}.`);

		rl.question("Nom Domain Groupe Component (laissez vide si aucun) : ", (domainInput: string) => {
			const domainName = domainInput.trim();

			const askI18n = (split: boolean, useOCP: boolean) => {
				console.log("\n🌐 Utiliser les traductions (useAppTranslation / t) ?");
				console.log("   [y] Oui — t? optionnel dans les mappings");
				console.log("   [n] Non — useAppTranslation et t supprimés de tous les fichiers\n");

				rl.question("Votre choix (y/n) : ", (i18nInput: string) => {
					const useI18n = i18nInput.trim().toLowerCase() !== "n";

					if (useI18n) {
						console.log("\n✔  i18n activé — t? sera optionnel dans les mappings.");
					} else {
						console.log("\n✔  Sans i18n — useAppTranslation et t supprimés.");
					}

					generateSquelette(inputName, words, split, domainName, useOCP, useI18n, scope);
					rl.close();
				});
			};

			const askStrategy = (split: boolean) => {
				console.log("\n📐 Stratégie d'interface serveur :");
				console.log(
					"   [1] OCP  — PropsServer extends Props  (interface dédiée, extensible côté serveur)",
				);
				console.log(
					"   [2] YAGNI — Props partagés Client/Serveur (minimal, pas d'interface serveur)\n",
				);

				rl.question("Votre choix (1 ou 2) : ", (strategyInput: string) => {
					const useOCP = strategyInput.trim() !== "2";

					if (useOCP) {
						console.log("\n✔  OCP sélectionné — PropsServer sera générée.");
					} else {
						console.log(
							"\n✔  YAGNI sélectionné — Props client/serveur partagés, pas de fichier types.",
						);
					}

					askI18n(split, useOCP);
				});
			};

			if (words.length > 1) {
				rl.question(
					`Voulez-vous diviser en sous-dossiers (${words.map((w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase()).join("/")}) ? (y/n) : `,
					(answer: string) => {
						const split = answer.toLowerCase() === "y" || answer.toLowerCase() === "o";
						askStrategy(split);
					},
				);
			} else {
				askStrategy(false);
			}
		});
	});
});

/* ==========================================================================
   Générateur de Fichiers (sofinco-react & sofinco-template)
   ========================================================================== */

function generateSquelette(
	rawName: string,
	words: string[],
	split: boolean,
	domainName: string,
	useOCP: boolean,
	useI18n: boolean,
	scope: Scope,
): void {
	const pascalName = toPascalCase(rawName); // Ex: EventsListDemo
	const camelName = toCamelCase(rawName); // Ex: eventsListDemo
	const filePrefix = camelName; // Ex: eventsListDemo

	// --- Gestion Universelle des Chemins Monorepo ---
	const cwd = process.cwd();
	const projectRoot = cwd.includes("packages") ? cwd.substring(0, cwd.indexOf("packages")) : cwd;

	let reactTargetDir = path.join(
		projectRoot,
		"packages",
		"sofinco-react",
		"src",
		...SCOPES[scope].segments,
	);
	let templateTargetDir = path.join(projectRoot, "packages", "template-set", "src", "components");

	let relativeFeaturePath = SCOPES[scope].relative;
	let importPath = "";
	let domainReactDir = "";

	// 1️⃣ INSERTION DU DOSSIER DOMAINE (Si renseigné)
	if (domainName) {
		const domainPascal = toPascalCase(domainName);
		domainReactDir = path.join(reactTargetDir, domainPascal);

		reactTargetDir = domainReactDir;
		templateTargetDir = path.join(templateTargetDir, domainPascal);
		relativeFeaturePath += `${domainPascal}/`;
		importPath += `${domainPascal}/`;
	}

	// 2️⃣ GESTION DU NOM DU COMPOSANT (Split ou non)
	let componentRelativePath = "";

	if (split) {
		const folderPath = words
			.map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
			.join("/");
		relativeFeaturePath += folderPath;
		importPath += folderPath;
		componentRelativePath += folderPath;

		words.forEach((word: string) => {
			const folderName = word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
			reactTargetDir = path.join(reactTargetDir, folderName);
			templateTargetDir = path.join(templateTargetDir, folderName);
		});
	} else {
		relativeFeaturePath += pascalName;
		importPath += pascalName;
		componentRelativePath += pascalName;
		reactTargetDir = path.join(reactTargetDir, pascalName);
		templateTargetDir = path.join(templateTargetDir, pascalName);
	}

	const importSpec = getImportSpecifier(importPath);

	// ── Helpers i18n ─────────────────────────────────────────────────────────
	const tSignature = useI18n ? `, t?: (key: string) => string` : ``;
	const tCall = useI18n ? `, t` : ``;
	const i18nImportLine = useI18n ? `import { useAppTranslation } from "#lib/i18n";\n` : ``;
	const i18nDeclLine = useI18n ? `\n    const { t } = useAppTranslation();` : ``;

	fs.mkdirSync(reactTargetDir, { recursive: true });
	fs.mkdirSync(templateTargetDir, { recursive: true });
	fs.mkdirSync(path.join(templateTargetDir, "views"), { recursive: true });

	console.log(`\n🚀 Génération de ${pascalName}...`);
	if (domainName) console.log(`   📁 Domaine/Dossier parent : ${toPascalCase(domainName)}`);
	console.log(`   📍 Import généré : ${importSpec}`);
	console.log(`   📐 Stratégie     : ${useOCP ? "OCP (PropsServer)" : "YAGNI (Props partagés)"}`);

	// ==========================================================================
	// 1. FICHIERS 100% REACT (sofinco-react)
	// ==========================================================================
	console.log(`\n📦 Package: sofinco-react`);

	const reactTypesContent = `export interface ${pascalName}Props {

	title: string;
	url: string;

}
`;

	const reactViewContent = `import type { ${pascalName}Props } from "./${filePrefix}.types";
import classes from "./${filePrefix}.module.css";

export function ${pascalName}(props: ${pascalName}Props) {
  return (
    <div className={classes.${camelName}}>
			<h1><a href={props.url}>{props.title}</a></h1>
      <p>Composant ${pascalName} (100% React) prêt à l'emploi !</p>
    </div>
  );
}
`;

	const reactCssContent = `.${camelName} {
  display: block;
}
`;

	const reactFeatureIndexContent = `export { ${pascalName} } from "./${pascalName}";
export type { ${pascalName}Props } from "./${filePrefix}.types";
`;

	safeWriteFile(path.join(reactTargetDir, `${filePrefix}.types.ts`), reactTypesContent);
	safeWriteFile(path.join(reactTargetDir, `${filePrefix}.module.css`), reactCssContent);
	safeWriteFile(path.join(reactTargetDir, `${pascalName}.tsx`), reactViewContent);
	safeWriteFile(path.join(reactTargetDir, "index.ts"), reactFeatureIndexContent);

	// --- AUTO-EXPORT LOGIQUE ---
	const mainIndexFilePath = path.join(projectRoot, "packages", "sofinco-react", "src", "index.ts");

	if (domainName) {
		const domainIndexFilePath = path.join(domainReactDir, "index.ts");
		const domainExportLine = `export * from "./${componentRelativePath}";`;

		let domainIndexContent = "";
		if (fs.existsSync(domainIndexFilePath)) {
			domainIndexContent = fs.readFileSync(domainIndexFilePath, "utf8");
		}

		if (!domainIndexContent.includes(domainExportLine)) {
			const prefix =
				domainIndexContent.length > 0 && !domainIndexContent.endsWith("\n") ? "\n" : "";
			fs.appendFileSync(domainIndexFilePath, `${prefix}${domainExportLine}\n`);
			console.log(
				`✅ Mis à jour : index.ts (Export ajouté au domaine ${toPascalCase(domainName)})`,
			);
		}

		const mainExportLine = `export * from "${SCOPES[scope].relative}${toPascalCase(domainName)}";`;
		let mainIndexContent = "";
		if (fs.existsSync(mainIndexFilePath)) {
			mainIndexContent = fs.readFileSync(mainIndexFilePath, "utf8");
		}

		if (!mainIndexContent.includes(mainExportLine)) {
			const prefix = mainIndexContent.length > 0 && !mainIndexContent.endsWith("\n") ? "\n" : "";
			fs.appendFileSync(mainIndexFilePath, `${prefix}${mainExportLine}\n`);
			console.log(`✅ Mis à jour : src/index.ts (Export racine du domaine ajouté)`);
		} else {
			console.log(`⏩ Ignoré : src/index.ts (Le domaine est déjà exporté)`);
		}
	} else {
		const mainExportLine = `export * from "${relativeFeaturePath}";`;
		let mainIndexContent = "";
		if (fs.existsSync(mainIndexFilePath)) {
			mainIndexContent = fs.readFileSync(mainIndexFilePath, "utf8");
		}

		if (!mainIndexContent.includes(mainExportLine)) {
			const prefix = mainIndexContent.length > 0 && !mainIndexContent.endsWith("\n") ? "\n" : "";
			fs.appendFileSync(mainIndexFilePath, `${prefix}${mainExportLine}\n`);
			console.log(`✅ Mis à jour : src/index.ts (Export racine du composant ajouté)`);
		} else {
			console.log(`⏩ Ignoré : src/index.ts (Export racine déjà présent)`);
		}
	}

	// ==========================================================================
	// 2. FICHIERS SERVEUR JAHIA (sofinco-template)
	// ==========================================================================
	console.log(`\n⚙️  Package: sofinco-template`);

	const templateCndContent = `[sofnt:${camelName}] > jnt:content, mix:title, sofmix:component\n`;

	// --------------------------------------------------------------------------
	// Fichiers variants selon la stratégie OCP / YAGNI
	// --------------------------------------------------------------------------

	if (useOCP) {
		// ── OCP : PropsServer extends Props ──────────────────────────────────────

		const templateTypesContent = `import type { ${pascalName}Props } from "${importSpec}";

export interface ${pascalName}PropsServer extends ${pascalName}Props {

}
`;

		const templateMapperContent = `import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ${pascalName}PropsServer } from "./${filePrefix}.types";
import type { ${pascalName}Props } from "${importSpec}";
import { str, nodeUrl } from "#lib/jcr";

export function map${pascalName}PropsClient(node: JCRNodeWrapper${tSignature}): ${pascalName}Props {
  return {
		title : str(node, "jcr:title"),
		url : nodeUrl(node)
  };
}

export function map${pascalName}PropsServer(node: JCRNodeWrapper${tSignature}): ${pascalName}PropsServer {
  return map${pascalName}PropsClient(node${tCall}) as ${pascalName}PropsServer;
}
`;

		const templateRenderContent = `import { Island } from "@jahia/javascript-modules-library";
import type { ${pascalName}PropsServer } from "./${filePrefix}.types";
import type { ${pascalName}Props } from "${importSpec}";
import { ${pascalName}Server } from "./views/${pascalName}Server";
import ${pascalName}Client from "./views/${pascalName}Client.client";

export function render${pascalName}Client(props: ${pascalName}Props) {
  return <Island component={${pascalName}Client} props={props} />;
}

export function render${pascalName}Server(props: ${pascalName}PropsServer) {
  return <${pascalName}Server {...props} />;
}
`;

		const templateServerViewContent = `import type { ${pascalName}PropsServer } from "../${filePrefix}.types";
import { ${pascalName} } from "${importSpec}";
import classes from "./${filePrefix}.module.css";

export function ${pascalName}Server(props: ${pascalName}PropsServer) {
  return (
    <div className={classes.${camelName}}>
      {/* Le composant Server englobe le composant Client.
        Idéal pour ajouter des AddContentButtons ou RenderChild en mode édition !
      */}
      <${pascalName} {...props} />
    </div>
  );
}
`;

		safeWriteFile(path.join(templateTargetDir, `${filePrefix}.types.ts`), templateTypesContent);
		safeWriteFile(path.join(templateTargetDir, `${filePrefix}.mapping.ts`), templateMapperContent);
		safeWriteFile(path.join(templateTargetDir, `${filePrefix}.render.tsx`), templateRenderContent);
		safeWriteFile(
			path.join(templateTargetDir, "views", `${pascalName}Server.tsx`),
			templateServerViewContent,
		);
	} else {
		// ── YAGNI : Props partagés, une seule fonction de mapping ────────────────

		const templateMapperContent = `import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ${pascalName}Props } from "${importSpec}";
import { str, nodeUrl } from "#lib/jcr";

export function map${pascalName}Props(node: JCRNodeWrapper${tSignature}): ${pascalName}Props {
  return {
		title : str(node, "jcr:title"),
		url : nodeUrl(node)
  };
}
`;

		const templateRenderContent = `import { Island } from "@jahia/javascript-modules-library";
import type { ${pascalName}Props } from "${importSpec}";
import { ${pascalName}Server } from "./views/${pascalName}Server";
import ${pascalName}Client from "./views/${pascalName}Client.client";

export function render${pascalName}Client(props: ${pascalName}Props) {
  return <Island component={${pascalName}Client} props={props} />;
}

export function render${pascalName}Server(props: ${pascalName}Props) {
  return <${pascalName}Server {...props} />;
}
`;

		const templateServerViewContent = `import type { ${pascalName}Props } from "${importSpec}";
import { ${pascalName} } from "${importSpec}";
import classes from "./${filePrefix}.module.css";

export function ${pascalName}Server(props: ${pascalName}Props) {
  return (
    <div className={classes.${camelName}}>
      {/* Le composant Server englobe le composant Client.
        Idéal pour ajouter des AddContentButtons ou RenderChild en mode édition !
      */}
      <${pascalName} {...props} />
    </div>
  );
}
`;

		const templateServerContentYAGNI = `import { jahiaComponent } from "@jahia/javascript-modules-library";
${i18nImportLine}import { isEditMode } from "#lib/renderContext";
import { map${pascalName}Props } from "./${filePrefix}.mapping";
import { render${pascalName}Client, render${pascalName}Server } from "./${filePrefix}.render";

export default jahiaComponent(
  { nodeType: "sofnt:${camelName}", displayName: "${pascalName}", componentType: "view" },
  (_, { currentNode, renderContext }) => {${i18nDeclLine}
    const isEdit = isEditMode(renderContext);
    const props = map${pascalName}Props(currentNode${tCall});

    if (isEdit) {
      return render${pascalName}Server(props);
    }

    return render${pascalName}Client(props);
  }
);
`;

		safeWriteFile(path.join(templateTargetDir, `${filePrefix}.mapping.ts`), templateMapperContent);
		safeWriteFile(path.join(templateTargetDir, `${filePrefix}.render.tsx`), templateRenderContent);
		safeWriteFile(path.join(templateTargetDir, "default.server.tsx"), templateServerContentYAGNI);
		safeWriteFile(
			path.join(templateTargetDir, "views", `${pascalName}Server.tsx`),
			templateServerViewContent,
		);
	}

	// --------------------------------------------------------------------------
	// Fichiers communs aux deux stratégies
	// --------------------------------------------------------------------------

	const templateServerContent = `import { jahiaComponent } from "@jahia/javascript-modules-library";
${i18nImportLine}import { isEditMode } from "#lib/renderContext";
import { map${pascalName}PropsServer, map${pascalName}PropsClient } from "./${filePrefix}.mapping";
import { render${pascalName}Client, render${pascalName}Server } from "./${filePrefix}.render";

export default jahiaComponent(
  { nodeType: "sofnt:${camelName}", displayName: "${pascalName}", componentType: "view" },
  (_, { currentNode, renderContext }) => {${i18nDeclLine}
    const isEdit = isEditMode(renderContext);

    if (isEdit) {
      const props = map${pascalName}PropsServer(currentNode${tCall});
      return render${pascalName}Server(props);
    }

    const props = map${pascalName}PropsClient(currentNode${tCall});
    return render${pascalName}Client(props);
  }
);
`;

	const templateClientViewContent = `import type { ${pascalName}Props } from "${importSpec}";
import { ${pascalName} } from "${importSpec}";

export default function ${pascalName}Client(props: ${pascalName}Props) {
  return (
    <${pascalName} {...props} />
  );
}
`;

	const templateCssContent = `.${camelName} {
  display: block;
}
`;

	safeWriteFile(path.join(templateTargetDir, "definition.cnd"), templateCndContent);
	if (useOCP) {
		safeWriteFile(path.join(templateTargetDir, "default.server.tsx"), templateServerContent);
	}
	safeWriteFile(
		path.join(templateTargetDir, "views", `${pascalName}Client.client.tsx`),
		templateClientViewContent,
	);
	safeWriteFile(
		path.join(templateTargetDir, "views", `${filePrefix}.module.css`),
		templateCssContent,
	);

	console.log(`\n🎉 Architecture Client/Serveur générée avec succès !`);
}
