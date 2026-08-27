# Consentement & tracking — comment les pièces s'emboîtent

La chaîne du consentement traverse cinq couches : les types de nœuds JCR, un script Groovy de
provisionnement, les scripts inline du `<head>`, la couche de mapping Jahia, et un composant du
design system. Aucun fichier ne raconte l'histoire complète — d'où cette page.

À lire avant de toucher à quoi que ce soit sous `src/lib/tracking*`, `src/lib/consent*`, ou
l'entrée « Gérer mes cookies » du pied de page.

---

## 1. Où vit chaque pièce

| Rôle                                                         | Fichier                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Types de nœuds (`ga`, `numberly`, `didomi`)                  | [`src/components/Tracking/definition.cnd`](../packages/template-set/src/components/Tracking/definition.cnd)                                 |
| Provisionnement de `tracking-settings`                       | [`settings/groovyScripts/init-tracking-settings.groovy`](../packages/template-set/settings/groovyScripts/init-tracking-settings.groovy)     |
| Lecture de la config + construction des scripts du `<head>`  | [`src/lib/tracking.ts`](../packages/template-set/src/lib/tracking.ts)                                                                       |
| Défauts Consent Mode + garde des tags non-Google             | [`src/lib/consent-mode-bootstrap.ts`](../packages/template-set/src/lib/consent-mode-bootstrap.ts)                                           |
| Délégué de clic « Gérer mes cookies »                        | [`src/lib/consent-bootstrap.ts`](../packages/template-set/src/lib/consent-bootstrap.ts)                                                     |
| Délégué de mesure des clics + `window.__SOFINCO_TRACK__`     | [`src/lib/tracking-bootstrap.ts`](../packages/template-set/src/lib/tracking-bootstrap.ts)                                                   |
| Ordre d'émission dans le `<head>`                            | [`src/templates/Layout.tsx`](../packages/template-set/src/templates/Layout.tsx)                                                             |
| Résolution du mode CTA (`internal` / `external` / `consent`) | [`src/lib/cta.ts`](../packages/template-set/src/lib/cta.ts)                                                                                 |
| Mixin `sofmix:ctaConsent` et sa portée                       | [`src/components/Shared/CTA/definition.cnd`](../packages/template-set/src/components/Shared/CTA/definition.cnd)                             |
| Mapping du pied de page qui pose `isConsent`                 | [`src/components/Footer/FooterLink/footerLink.mapping.ts`](../packages/template-set/src/components/Footer/FooterLink/footerLink.mapping.ts) |
| Le `<button>` rendu                                          | [`sofinco-react/…/FooterLink/FooterLink.tsx`](../packages/sofinco-react/src/common/Footer/FooterLink/FooterLink.tsx)                        |

Les trois fichiers `.ts` suffixés `-bootstrap` ne sont **pas importés à l'exécution**. Le plugin
Vite `?inline-script` compile chacun en une IIFE minifiée au build, chaîne que `Layout.tsx`
injecte ensuite via `dangerouslySetInnerHTML`. Ils sont écrits en TypeScript lisible pour rester
relisables et testables — `#test/inlineScript` charge la chaîne **livrée**, pas une réécriture.

---

## 2. L'ordre du `<head>` est un contrat

`buildHeadScripts` produit les fragments ; `Layout.tsx` décide de leur ordre, et cet ordre est
porteur :

1. `consentMode` — défauts Consent Mode + garde des tags non-Google. **Synchrone.**
2. `didomiBootstrap` — stub IAB TCF + loader du CMP. Le loader, lui, est `async`.
3. `consentBootstrap` — délégué de clic « Gérer mes cookies ».
4. `trackingContext` — `window.__SOFINCO_TRACKING_CONTEXT__` + délégué de mesure.
5. `gtmSnippet` — `gtm.js`.
6. `eulerianBootstrap` / `eulerianPageTag` — différés derrière le consentement dès qu'un id
   vendor est configuré.

Deux pièges à nommer, parce qu'on est déjà tombé dans les deux :

**GTM ne lit pas `__tcfapi`.** Le stub TCF émis à l'étape 2 n'est consommé que par certains
produits publicitaires Google. Le conteneur GTM ne comprend que les signaux Consent Mode — c'est
le rôle de l'étape 1, et d'elle seule.

**L'étape 1 doit précéder le loader Didomi.** Le SDK est chargé en `async` et peut venir du cache
HTTP : il peut donc émettre son propre `consent update` avant que nos défauts ne soient posés.
Google traite un signal _absent_ comme accordé, donc un défaut tardif vaut exactement autant
qu'aucun défaut.

---

## 3. Répartition des rôles avec la console Didomi

La console en fait déjà plus que ce dépôt. Ne pas la doubler.

**Porté par la console** — tout est vérifiable dans le `dataLayer` de production : le
`gtag('consent', 'update', …)` de son intégration Google Consent Mode, les événements
`didomi-ready` et `didomi-consent`, et les variables `didomiVendorsConsent` /
`didomiPurposesConsent`. Les finalités custom (`sWeb` pour le scoring CACF,
`cookie-conv-iadvize`) y transitent sous forme de listes séparées par des virgules, exploitables
dans GTM avec une condition « contient ».

**Porté par ce dépôt** — deux choses que la console ne peut structurellement pas faire :

- L'état **initial** du Consent Mode. Il exige un bloc inline et synchrone en tête de document ;
  aucun script chargé par le réseau ne peut arriver assez tôt.
- La garde de consentement des **tags que ce module injecte lui-même**. Le Consent Mode ne couvre
  que les tags Google. Eulerian est un `<script>` écrit dans le `<head>` par `tracking.ts` : le
  blocage de vendors de Didomi ne le voit jamais, et `window.__SOFINCO_ON_CONSENT__` est la seule
  chose capable de le retenir.

---

## 4. Point ouvert — `didomiVendorId` reste à saisir

`gateOnConsent` n'enveloppe les tags Eulerian que si `numberly/didomiVendorId` est renseigné.
Tant qu'il ne l'est pas, **Eulerian part sans consentement** : le code est prêt, la configuration
ne l'est pas.

**Le vendor existe.** Relevé sur la notice de production :

```js
Didomi.getVendors().find((v) => v.didomiId === "eulerian");
// → { id: 413, didomiId: "eulerian", namespace: "iab", legIntPurposeIds: [] }
```

La valeur à saisir est donc **`413`**, brut. Jamais `iab:413` : ce préfixe n'existe que dans la
variable GTM `didomiVendorsConsent`, et le code legacy d'Eulerian sépare lui-même les deux
espaces de noms. `legIntPurposeIds` est vide : Eulerian ne déclare aucune finalité en intérêt
légitime, donc aucune voie de repli ne ferait partir le tag malgré un refus.

**`undefined` ne veut pas dire « id inconnu ».** Le SDK rend la même valeur dans deux
situations très différentes — vérifié en local, la même lecture rendant `undefined` avant le
choix de l'utilisateur puis `false` après :

```js
// bannière encore ouverte
Didomi.getUserConsentStatusForVendor("413"); // undefined  ← en attente
// après un refus
Didomi.getUserConsentStatusForVendor("413"); // false      ← décidé
```

Un `undefined` relevé bannière ouverte est normal. C'est un `undefined` qui **persiste après**
un choix qui signale une anomalie de configuration — id absent de la notice, mal orthographié,
ou vendor renommé côté console. `resolve` ne consigne donc dans
`__SOFINCO_CONSENT_UNRESOLVED__` que lorsque `shouldConsentBeCollected()` est faux. Sans cette
distinction, la trace se remplirait au premier affichage de chaque visiteur et n'aurait plus
aucune valeur de diagnostic.

Corollaire pour qui inspecte la console : un `undefined` relevé bannière ouverte ne prouve
rien. Refais la lecture après avoir accepté ou refusé.

**Pas de valeur par défaut dans le CND, et c'est délibéré.** `413` identifie Eulerian dans le
référentiel IAB, partout — mais un vendor IAB doit encore être _activé_ dans chaque notice, et
cela n'a été vérifié que sur la production. Poser un défaut propagerait un relevé de prod vers
tout environnement fraîchement provisionné : exactement le geste que l'on vient de retirer du
script Groovy pour le `noticeId`. Sur une notice où le vendor n'est pas activé, le consentement
serait indéterminé, donc refusé, et Eulerian muet.

`autocreated` n'aurait de toute façon rien changé pour les sites existants : il ne joue qu'à la
création du nœud. Tout environnement déjà en service exige donc une saisie manuelle dans
jContent.

**Deux marqueurs, qui doivent tous deux rester vides :**

```js
window.__SOFINCO_CONSENT_UNGATED__; // ['eulerian'] ⇒ aucun id saisi, le tag part sans garde
window.__SOFINCO_CONSENT_UNRESOLVED__; // ['413']   ⇒ id saisi mais inconnu de cette notice
```

Le premier rend le repli réellement visible, et non seulement documenté : sans lui, une page
servant Eulerian sans garde est indiscernable, dans le navigateur, d'une page où la garde passe —
c'est ainsi que le trou a survécu en production. Le second attrape un id erroné ou non activé,
qui éteindrait sinon le tag dans le silence complet.

**La garde exige le vendor ET la finalité de stockage.** Sous TCF, accepter un fournisseur et
accepter qu'il écrive sur son terminal sont deux choix distincts : le vendor seul ne suffit
donc pas, sans quoi l'identifiant Eulerian serait déposé contre un refus explicite. La finalité
retenue est `cookies` — la n° 1 du TCF, celle qui autorise le dépôt — et elle seule. Le legacy
exigeait `1-3-4-7-8`, mais réclamer les finalités publicitaires en plus éteindrait la mesure
pour tout utilisateur ayant refusé la personnalisation, alors que le tag n'est pas chargé pour
elles.

Une finalité absente de la notice se signale dans `__SOFINCO_CONSENT_UNRESOLVED__` au même titre
qu'un id vendor erroné, et les deux lectures se font sans court-circuit : un diagnostic montre
les deux identifiants inconnus d'un coup, pas le premier seulement.

**Limite assumée — un retrait de consentement ne décharge rien.** La garde réévalue à chaque
`consent.changed`, donc une acceptation tardive fait partir le tag immédiatement. La réciproque
est fausse et ne peut pas être corrigée ici : un script exécuté ne se désexécute pas,
l'identifiant est posé et le hit est parti. Neutraliser `EA_push` après coup casserait les
mécanismes internes d'Eulerian sans rien retirer de ce qui a déjà été envoyé.

Les deux seuls remèdes réels vivent hors du code : déclarer les cookies du vendor dans la
console Didomi pour qu'elle les **supprime** au retrait — c'est ce qui donne un effet immédiat à
la révocation — ou, à défaut, recharger la page sur `consent.changed`, ce qui est un choix
produit et non technique.

---

## 5. Configuration par environnement

Le `noticeId` n'est **pas** amorcé depuis le dépôt. Le script Groovy lit une propriété système :

```
-Dsofinco.didomi.noticeId=<uuid>
```

Sans propriété, le nœud est créé sans notice : aucun loader, aucune bannière, aucun tag
conditionné. L'échec est bruyant dans les logs et sans effet de bord. Amorcer la notice de
production partout ferait remonter du consentement de recette dans le périmètre de la notice de
prod — un défaut par défaut **vers** la production, sur une donnée réglementée.

Rien de lié au tracking n'est émis en **mode contribution** : les sessions des contributeurs
fausseraient les statistiques, un outil de rejeu de session déployé via GTM enregistrerait
l'interface d'administration de Jahia, et une modale de consentement par-dessus le Page Builder
le rendrait inutilisable. Le contexte de tracking et son délégué de clics, eux, restent émis :
les îlots hydratés doivent continuer de trouver `window.__SOFINCO_TRACK__`.

---

## 6. L'entrée « Gérer mes cookies », de bout en bout

1. Un contributeur choisit `ctaType = consent` sur un `sofnt:footerLink`. Le formulaire Content
   Editor ajoute le mixin `sofmix:ctaConsent`.
2. `resolveCtaMode` voit le mixin et renvoie `consent` ; `resolveCtaHref` renvoie le remplissage
   `CONSENT_HASH` — qui n'existe que pour éviter que `getCtaProps` n'écarte le CTA comme un lien
   sans cible. **Il n'atteint jamais le DOM.**
3. `footerLink.mapping` traduit ce mode en `isConsent: true`.
4. `FooterLink` rend un `<button>` nu portant `data-consent-action="preferences"` — jamais un
   `<a>` : l'entrée agit, elle ne navigue pas.
5. Le délégué de l'étape 3 de l'ordre du `<head>` capte le clic et empile
   `Didomi.preferences.show()` dans `didomiOnReady`.

Deux contraintes faciles à casser :

**Aucun gestionnaire React.** Le pied de page est rendu côté serveur sans îlot, donc jamais
hydraté. Un attribut traverse la frontière serveur/client ; une fonction non.

**`sofmix:ctaConsent` est restreint à `sofnt:footerLink` dans le CND**, et pas seulement dans le
formulaire. Un formulaire Content Editor ne contraint rien : il ne s'applique ni aux imports de
contenu, ni aux duplications de nœuds, ni aux `addMixin` par script. Élargir cet `extends`
proposerait le fieldset sur tout type porteur d'un CTA, où l'activer _remplacerait_ un lien qui
marche par une ancre morte, en silence — `resolveCtaMode` teste les mixins avant de lire
`ctaType`. `ctaConsentScope.cnd.test.ts` échoue si cette portée dérive.
