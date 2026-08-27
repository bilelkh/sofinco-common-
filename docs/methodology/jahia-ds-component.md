# Methodology — Consume a sofinco-react (Storybook) component inside Jahia

A clean, repeatable recipe for reusing a design-system component from `packages/sofinco-react` inside a `packages/template-set` Jahia module. Follow these steps for any new DS component (`Hero`, `Card`, `ProductTile`, …).

---

## 0. Prerequisites (done once per new DS component)

1. **Expose the component + its types** from `packages/sofinco-react/src/index.ts`, using a
   **relative** specifier (that file must stay alias-free — it is the first module a consumer's
   bundler resolves). The path starts with the component's brand scope: `b2c/features/`,
   `b2b/features/`, `common/` or `shared/ui/`.
   ```ts
   export { default as Hero } from "./b2c/features/Hero/Hero";
   export type { HeroProps /* , sub-types */ } from "./b2c/features/Hero/Hero.type";
   ```
   This root export is the **only** surface `template-set` may import. Never reach into
   `../sofinco-react/src/...` from the Jahia module, and never add a `@shared/…` / `@b2c/…`
   import there — those aliases exist solely so the bundler can compile the DS's own internals.
2. **No alias wiring to do.** `sofinco-react` publishes its own alias map: `template-set`
   pulls it via `import { sofincoReactAliases } from "sofinco-react/aliases"` in
   `vite.config.mjs` / `vitest.config.ts`, and via `"extends": "sofinco-react/tsconfig.paths.json"`
   in `tsconfig.json`. A new alias or a folder move inside the DS needs **zero** change here —
   update `packages/sofinco-react/aliases.js` + `tsconfig.paths.json` instead. Corollary: do
   **not** add a `paths` block to `template-set/tsconfig.json`; TypeScript replaces an
   inherited `paths` wholesale rather than merging, which would silently drop the DS aliases.
3. **Add any runtime deps** the DS component pulls in (Radix packages, `react-dom`, etc.) to `packages/template-set/package.json` and run `yarn install` at the repo root.

---

## 1. Define / verify the JCR content type

In `packages/template-set/src/components/<Feature>/<Component>/definition.cnd`, declare the `sofnt:*` node type and the properties / child nodes that will feed the DS props. Mentally map **each field of the DS `Props`** to a JCR property or child node before coding. If something has no home in the CND, extend the CND first.

---

## 2. `default.server.tsx` — data wrapper (SSR-only)

This is the **only** place that touches JCR. Responsibilities:

1. Extract typed props from `currentNode` using helpers from `src/lib/jcr.ts`:
   - `str(node, "prop", fallback)` — string
   - `num`, `getAsBoolean`, `strList`, `strLimit`
   - `getPropertyAsNode(node, "weakRefProp")` → `buildNodeUrl(...)` for images / internal links
   - `getChildNodesByType(node, "sofnt:child")` → iterate typed children
   - `getCtaProps(node)` — prebuilt CTA mapper for `ctaType/ctaInternalNode/ctaExternalUrl/ctaLabel/ctaTarget`
2. Build a single, fully-typed `const data: <Component>Props` object that mirrors the DS `*Props` shape exactly.
3. Render differently for authoring vs live:
   - **Edit mode / authoring page** (`renderContext.isEditMode()` or a flag like `isMainResourceNode(renderContext, "menu")`) → expose `<RenderChild />` / `<RenderChildren />` so authors can add / edit sub-components.
   - **Live / preview mode** → mount an `<Island>` with the client wrapper (step 3).

Skeleton:

```tsx
import {
  buildNodeUrl,
  Island,
  jahiaComponent,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { HeroProps } from "sofinco-react";
import HeroJahia from "./HeroJahia.client";
import { str, getPropertyAsNode, getChildNodesByType } from "../../../lib/jcr";

interface Props {
  image: JCRNodeWrapper;
}

jahiaComponent(
  { componentType: "view", nodeType: "sofnt:hero" },
  ({ image }: Props, { renderContext, currentNode }) => {
    const data: HeroProps = {
      title: str(currentNode, "title"),
      image: image ? buildNodeUrl(image) : "",
      // …map every HeroProps field here
    };

    if (renderContext.isEditMode()) {
      return <div>{/* edit-mode preview or RenderChildren */}</div>;
    }
    return <Island component={HeroJahia} props={data} />;
  },
);
```

---

## 3. `<Component>Jahia.client.tsx` — the Island bridge (mandatory)

**The step that everyone gets wrong the first time.** Island needs a local default-exported function to attach `__filename` to; that `__filename` is how the Jahia vite plugin maps the component back to its generated client bundle URL at SSR time.

**Rules:**

- File name **must** end in `.client.tsx` and live under `packages/template-set/src/**` (so it matches `client.inputGlob` in `@jahia/vite-plugin`).
- **Do NOT** write a pure re-export — `export { X as default } from "sofinco-react"` is tree-shaken into the raw DS export, the plugin can't tag it with `__filename`, and Island emits `data-src="/modules/sofinco-template/undefined.js"` → **404**.
- **Do** declare a real local function as the default export. A one-liner wrapper is fine:

```tsx
import { Hero, type HeroProps } from "sofinco-react";

export default function HeroJahia(props: HeroProps) {
  return <Hero {...props} />;
}
```

Why not simply name the DS file itself `.client.tsx`? The DS package is outside `template-set/src` — outside the plugin's glob. The wrapper gives the plugin a local entry to tag; the wrapper's bundle pulls in the DS code via the normal import graph.

Use this wrapper as the value of `<Island component={...} />` — **never** the raw DS import.

---

## 4. Props passed to `<Island>`

```tsx
<Island component={HeroJahia} props={data} />
```

- `component` → the local `*.client.tsx` wrapper (not the DS import).
- `props` → **plain-JSON-serializable** object. `data` is serialized into the HTML and re-parsed client-side to hydrate, so it **must not contain** `JCRNodeWrapper`, functions, `Date`, `Map`, etc. — only strings, numbers, booleans, arrays, nested plain objects.
- `clientOnly={true}` when the DS component uses browser-only APIs (`window`, `useWindowResize`, animation libs, etc.). Skip it when the DS component is SSR-safe.

---

## 5. Styling & assets

- DS CSS modules and global styles are bundled automatically through the import chain.
- Fonts in `sofinco-react/src/assets/fonts` are bundled by Vite thanks to the alias.
- If a new DS CSS module starts with `@import "@styles/base.css"`, the `@styles` alias in `vite.config.mjs` handles it — no extra work needed.

---

## 6. Verification checklist

Run from `packages/template-set/`:

1. `yarn tsc --noEmit` → zero errors.
2. `yarn lint` on the edited files.
3. `yarn build && yarn deploy` — or `yarn dev` for watch-and-deploy.
4. **Grep the server bundle for the `__filename` tag** — the canonical proof that Island will resolve correctly:

   ```bash
   grep -A2 "const HeroJahia =" dist/server/index.js
   # expected:
   #   Object.defineProperty(v, "__filename", {
   #     value: "dist/client/components/.../HeroJahia.client.tsx", ...
   ```

5. In the browser on a page containing the content type:
   - Network tab: `<jsm-island>` fetches `/modules/sofinco-template/client/components/.../HeroJahia.client.tsx.js` → **200**.
   - DevTools console: no `Failed to fetch dynamically imported module`.
   - Authoring UI still lets editors add / configure the component in edit mode.

---

## 7. Troubleshooting quick table

| Symptom                                                                | Cause                                                                                                                         | Fix                                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `.../undefined.js` 404                                                 | Client file is a pure re-export, or not under `src/**/*.client.tsx`                                                           | Use a real `export default function` wrapper in a local `*.client.tsx`                        |
| `Cannot find module '@radix-ui/...'` at runtime                        | DS subtree imports a package not in `template-set` deps                                                                       | Add to `template-set/package.json`, `yarn install`                                            |
| TS `Cannot find module '@shared/...'` / `'@b2c/...'` when consuming DS | Alias missing from the DS's own map, **or** a local `paths` block in `template-set/tsconfig.json` shadowing the inherited one | Add the alias to `sofinco-react/aliases.js` + `tsconfig.paths.json`; delete any local `paths` |
| Vite `Failed to resolve import "@…/…"` from a DS file                  | Same — the two DS files above are out of sync with the folder that moved                                                      | Fix them once in `sofinco-react`; no consumer edit                                            |
| `Module '"sofinco-react"' has no exported member 'X'`                  | Component used from `template-set` but never added to the DS root entry                                                       | Export it from `packages/sofinco-react/src/index.ts` (relative specifier)                     |
| Island renders nothing but no 404                                      | `clientOnly` missing for a DS component that uses browser APIs                                                                | Add `clientOnly={true}`                                                                       |
| Props show `[object Object]` in HTML / hydration fails                 | Non-serializable value passed to `props` (e.g. a `JCRNodeWrapper`)                                                            | Convert to plain JSON types in `default.server.tsx` before passing                            |
| `Unsatisfied version ... from @jahia/jcontent` in console              | Jahia's own authoring shell complaining about its federated modules — **unrelated to template-set**                           | Ignore                                                                                        |

---

## 8. Reference — end-to-end example

`Menu` is the canonical example that exercises every step above:

- DS source: `packages/sofinco-react/src/common/Menu/Menu.tsx` (+ `Menu.type.ts`)
- Root export: `packages/sofinco-react/src/index.ts`
- CND: `packages/template-set/src/components/Menu/NavMenu/definition.cnd`
- Data wrapper: `packages/template-set/src/components/Menu/NavMenu/default.server.tsx`
- Island bridge: `packages/template-set/src/components/Menu/NavMenu/MenuJahia.client.tsx`
- Config touch-ups: none — alias resolution is inherited from `sofinco-react/aliases` and `sofinco-react/tsconfig.paths.json`
