/*
 * Les règles sont écrites en JavaScript (ESLint charge `eslint.config.js` sans passer par
 * TypeScript). Cette déclaration existe pour que le test de la règle
 * (`packages/sofinco-react/.../requireFootnoteText.rule.test.ts`) l'importe en type connu
 * plutôt qu'en `any` implicite, ce que `strict` refuse.
 */
import type { Rule } from "eslint";

declare const rule: Rule.RuleModule;
export default rule;
