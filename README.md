# sofinco-common

**sofinco-common** is the front-end monorepo for **Sofinco** (Crédit Agricole consumer credit), built on the **Jahia CMS** platform (version 8.2+).

This repository is a [monorepo](https://monorepo.tools/#what-is-a-monorepo) that contains three packages, each with its own purpose:

- [`packages/sofinco-react`](./packages/sofinco-react/): a collection of reusable React components used by the template set. This is a design system conceived to work in any React project — **it is not Jahia-specific.**

- [`packages/sofinco-core`](./packages/sofinco-core/): a Jahia OSGi bundle that defines JCR node types (`.cnd`) and registers extensions in the Jahia administration UI.

- [`packages/template-set`](./packages/template-set/): the Jahia JavaScript module that, when pushed to a Jahia instance, enables all Sofinco components and content types.

  It is a [JavaScript Module](https://academy.jahia.com/documentation/jahia-cms/jahia-8.2/developer/javascript-module-development/introduction-to-jahia-javascript-modules), built with React and CSS Modules.

## Working Locally

### Requirements

- Node.js >= 22.0.0
- yarn 4
- Java 17 + [Maven](https://maven.apache.org/) — required to build `sofinco-core` (Maven OSGi bundle)
- Docker — required to run the local Jahia development environment

### Building for Production

```bash
# Install dependencies
yarn install

# Build all packages
yarn build
```

This produces a deployable artifact for the template set:

- `packages/template-set/dist/package.tgz`: the production artifact.

  The module can be installed manually on any Jahia instance through the **Modules** administration interface: [localhost:8080/jahia/administration/manageModules](http://localhost:8080/jahia/administration/manageModules).

### Running in Development Mode

```bash
# Install dependencies
yarn install

# Start a local Jahia instance (Jahia EE 8.2 + PostgreSQL)
cd packages/template-set && docker compose up --wait

# Start the development watcher for the template set
yarn workspace sofinco-template dev

# Start the Storybook for sofinco-react
yarn storybook
```

Jahia will be available at [localhost:8080](http://localhost:8080). Storybook runs at [localhost:6006](http://localhost:6006).

### Code Quality

```bash
yarn lint     # ESLint across the monorepo
yarn format   # Prettier across the monorepo
```

## Documentation

- [`docs/methodology/jahia-ds-component.md`](./docs/methodology/jahia-ds-component.md) — end-to-end recipe for consuming a `sofinco-react` (Storybook) component inside a Jahia template: `default.server.tsx` data wrapper, mandatory `*Jahia.client.tsx` Island bridge, tsconfig / Vite alias setup, serializable-props rules, and verification steps.

- [`docs/consent-and-tracking.md`](./docs/consent-and-tracking.md) *(en français)* — how the CMP (Didomi), Consent Mode, GTM and Eulerian fit together: where each piece lives, why the `<head>` emission order is a contract, what the Didomi console owns versus this repository, per-environment configuration of the notice id, and the end-to-end path of the footer's « Gérer mes cookies » entry.
