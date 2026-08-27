import type { HowItWorksProps } from "sofinco-react";

/**
 * Variante serveur des props.
 *
 * En mode édition on n'utilise pas `steps` côté React : c'est <RenderChildren>
 * qui prend le relais et délègue le rendu de chaque étape à son node JCR.
 * On ne transporte donc que le chrome (titre + sous-titre + CTA).
 *
 * TODO(SOF-XXXX) : si un jour on veut un aperçu fidèle en édition (preview
 * pixel-perfect côté auteur), rétablir `steps` ici et rendre 2 vues côte à
 * côte — édition (RenderChildren) + preview React live. Ticket à ouvrir avec
 * les specs UX de l'éditeur avant refacto.
 */
export type HowItWorksPropsServer = Omit<HowItWorksProps, "steps">;
