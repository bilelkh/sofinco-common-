/**
 * require-footnote-text — le garde-fou du dispositif de renvois de notes.
 *
 * POURQUOI CETTE RÈGLE EXISTE
 * ---------------------------
 * Un renvoi de note (`⁽¹⁾`) est produit côté serveur par `str()` sous forme de TEXTE, puis
 * transformé en lien par `<FootnoteText>` au rendu React. Le texte s'affiche donc toujours,
 * même sans enveloppe — mais le lien, lui, disparaît en silence.
 *
 * C'est exactement le défaut qui a été remonté cinq fois en recette, toujours sous la même
 * forme : « ça marche en mode édition, pas en preview ». Rien n'échoue, rien ne s'affiche
 * en console ; seul le saut vers la mention légale est perdu. Les ~100 points d'enveloppe
 * du DS ont été trouvés par balayages successifs, chacun déclenché par un bug utilisateur.
 *
 * La règle transforme cette convention en garantie : tout texte contributeur rendu comme
 * enfant JSX doit passer par `<FootnoteText>`. Un composant ajouté demain échoue au lint,
 * pas en recette.
 *
 * CE QU'ELLE COUVRE — la position enfant : `<p>{card.title}</p>`, y compris les chaînes de
 * membres de profondeur quelconque (`slot.feature.text`) et les composants `motion.*`.
 *
 * CE QU'ELLE NE COUVRE PAS, sciemment :
 *   - la forme attribut (`<Card title={x} />`) : c'est le composant destinataire qui
 *     enveloppe, et il est listé dans `wrappingComponents` ;
 *   - une valeur calculée avant le JSX (`const t = …; <p>{t}</p>`) : indécidable sans
 *     analyse de flot. `t` est signalé s'il porte un nom textuel, ce qui couvre le cas
 *     courant.
 */

/**
 * Noms de propriétés qui portent du texte rédigé par un contributeur. Cherché dans le
 * DERNIER segment de la chaîne, sans ancrage, pour attraper `labelComplement`,
 * `titleBadge`, `shortDescription`…
 */
const TEXTUAL =
	/(title|subtitle|label|text|description|heading|eyebrow|answer|intro|caption|legend|message|content|name|greeting|question|baseline|mention|complement|wording|blurb|summary|note|quote|hook|tagline|slogan)/i;

/** Composants qui appliquent `FootnoteText` eux-mêmes à leurs enfants. */
const DEFAULT_WRAPPING = ["FootnoteText"];

/** `motion.p` → "motion.p", `Foo` → "Foo". */
function jsxName(node) {
	if (!node) return "";
	if (node.type === "JSXIdentifier") return node.name;
	if (node.type === "JSXMemberExpression") {
		return `${jsxName(node.object)}.${jsxName(node.property)}`;
	}
	if (node.type === "JSXNamespacedName") return `${node.namespace.name}:${node.name.name}`;
	return "";
}

/**
 * Nom significatif de l'expression rendue, ou null si la forme n'est pas une simple
 * lecture de propriété (appel, littéral, ternaire… — hors périmètre).
 */
function readName(expression) {
	if (!expression) return null;
	switch (expression.type) {
		case "Identifier":
			return expression.name;
		case "MemberExpression":
			// `a[b]` est indécidable ; seule la forme pointée est analysée.
			if (expression.computed || expression.property.type !== "Identifier") return null;
			return expression.property.name;
		// `a?.b`, `a!` — enveloppes syntaxiques sans incidence.
		case "ChainExpression":
			return readName(expression.expression);
		case "TSNonNullExpression":
			return readName(expression.expression);
		/*
		 * On suit la valeur RÉELLEMENT rendue, qui dépend de l'opérateur :
		 *   `title ?? "Menu"`, `title || ""` → c'est `title`, le membre de droite n'est qu'un
		 *      repli constant. Forme courante, invisible sans ce cas.
		 *   `title && <p>…</p>`             → c'est le membre de DROITE ; la gauche n'est
		 *      qu'un garde de présence. L'analyser reviendrait à signaler tous les rendus
		 *      conditionnels, y compris ceux déjà correctement enveloppés à l'intérieur.
		 */
		case "LogicalExpression":
			return readName(expression.operator === "&&" ? expression.right : expression.left);
		default:
			return null;
	}
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
	meta: {
		type: "problem",
		docs: {
			description:
				"Impose <FootnoteText> autour d'un texte contributeur rendu en enfant JSX, " +
				"pour que les renvois de notes de bas de page restent cliquables.",
		},
		schema: [
			{
				type: "object",
				properties: {
					/** Composants qui enveloppent déjà leurs enfants (en plus de FootnoteText). */
					wrappingComponents: { type: "array", items: { type: "string" } },
					/** Noms de propriétés à ignorer, quand le nom trompe (ex. `className`). */
					ignoreNames: { type: "array", items: { type: "string" } },
				},
				additionalProperties: false,
			},
		],
		messages: {
			missing:
				"`{{name}}` est un texte contributeur : il peut porter un renvoi de note `⁽¹⁾`. " +
				"Enveloppez-le — <FootnoteText>{{{name}}}</FootnoteText> — sinon le renvoi reste " +
				"visible mais le lien vers la mention légale est perdu (invisible en édition, " +
				"cassé en preview et en live). Dans un <a> ou un <button>, utilisez " +
				"<FootnoteText inert> et posez aria-describedby={footnoteDescribedBy({{name}})} " +
				"sur l'élément interactif. Si ce texte ne vient pas d'un contributeur, renommez-le " +
				"ou ajoutez-le à `ignoreNames`.",
		},
	},

	create(context) {
		const options = context.options[0] ?? {};
		const wrapping = new Set([...DEFAULT_WRAPPING, ...(options.wrappingComponents ?? [])]);
		const ignore = new Set(options.ignoreNames ?? []);

		return {
			JSXExpressionContainer(node) {
				// Position ENFANT uniquement : en position attribut, le parent est un JSXAttribute.
				const parent = node.parent;
				if (!parent || parent.type !== "JSXElement") return;

				const elementName = jsxName(parent.openingElement.name);
				if (wrapping.has(elementName)) return;

				const name = readName(node.expression);
				if (!name || ignore.has(name)) return;

				// Le mot-clé est cherché dans le dernier segment, déjà extrait par `readName`.
				if (!TEXTUAL.test(name)) return;

				context.report({
					node: node.expression,
					messageId: "missing",
					data: { name: context.sourceCode.getText(node.expression) },
				});
			},
		};
	},
};
