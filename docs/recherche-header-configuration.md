# Configurer la recherche du header

Guide de contribution — public : éditeurs jContent.

---

## À quoi ça sert

Le champ de recherche affiché dans le bandeau sombre en haut du site fait trois choses :

1. il affiche un **panneau de suggestions** dès que le visiteur clique dedans ;
2. il affiche des **résultats en temps réel** dès que la saisie dépasse un certain nombre de
   caractères ;
3. il envoie le visiteur vers une **page de résultats** quand il valide.

Ces trois comportements dépendent de deux réglages posés sur le nœud `search` du menu, et
d'un **bloc de recherche** placé sur la page de résultats. Le schéma :

```
Champ de recherche du header  ──┬── Page de résultats de recherche   (où l'on atterrit)
   (page Menu → bandeau)        │
                                └── Bloc de recherche associé        (suggestions + réglages)
                                       └── suggestions contribuées
```

> **Important — les deux réglages sont indépendants et rien ne vérifie leur cohérence.**
> Le bloc de recherche que vous désignez doit être celui qui se trouve sur la page de
> résultats que vous désignez. Sinon le visiteur atterrit sur une page qui n'affiche rien.

---

## Prérequis

- Un accès contributeur à jContent sur le site concerné.
- Le droit de **publier** (le paramétrage n'a aucun effet en ligne tant que tout n'est pas publié).
- Faites l'ensemble des étapes **dans l'ordre** : le bloc de recherche doit exister avant de
  pouvoir être sélectionné depuis le header.

---

## Étape 1 — Créer la page de résultats

1. Dans jContent, créez une page à l'endroit voulu (typiquement à la racine du site,
   par exemple `Recherche`).
2. Choisissez le gabarit **basic** ou **legacy**.

   > Les autres gabarits ne conviennent pas : **simple** n'affiche pas le header, et
   > **Menu page** / **Footer** / **Reassurance pictos** sont des pages d'administration
   > destinées à contribuer des zones partagées, pas des pages publiques.

3. Renseignez le titre et l'URL de la page comme pour n'importe quelle page.

---

## Étape 2 — Ajouter le bloc de recherche sur cette page

1. Ouvrez la page en mode édition.
2. Dans la zone principale, ajoutez le composant **Bloc de recherche du site**.
3. Renseignez ses champs :

   | Champ                     | Rôle                                                                   | Valeur par défaut si vide |
   | ------------------------- | ---------------------------------------------------------------------- | ------------------------- |
   | `title`                   | Titre affiché en haut de la page de résultats                          | « Que recherchez-vous ? » |
   | `minLettersBeforeSuggest` | Nombre de caractères à saisir avant que les résultats live s'affichent | 3                         |
   | `maxSuggestionsForheader` | Nombre maximum de résultats affichés dans le panneau du header         | 5                         |

   > **Attention** : `title` est un champ propre au bloc. Renommer le contenu dans jContent
   > (son nom d'affichage dans l'arborescence) ne change **pas** le titre affiché sur la page.

   > Le panneau du header **ne défile pas**. Au-delà de 5 ou 6 entrées, les suggestions
   > sortent du cadre — gardez `maxSuggestionsForheader` bas.

---

## Étape 3 — Contribuer les suggestions (facultatif)

Les suggestions sont des raccourcis affichés dans le panneau du header **avant** que le
visiteur ait saisi assez de caractères pour déclencher les résultats en temps réel.

Elles se contribuent **sous le bloc de recherche**, sur la page de résultats. Trois listes
apparaissent sous le bloc, **uniquement en mode édition** :

### « Suggestions de termes »

Des mots-clés cliquables. Le clic ouvre la page de résultats **avec la recherche déjà lancée**
sur ce terme.

| Champ  | Obligatoire | Rôle                            |
| ------ | ----------- | ------------------------------- |
| `term` | **oui**     | Le mot-clé affiché et recherché |

### « Suggestions de recherche »

Des liens directs vers une page ou une URL externe.

| Champ                 | Obligatoire                | Rôle                        |
| --------------------- | -------------------------- | --------------------------- |
| `targetPage`          | l'un **ou** l'autre        | Page interne du site        |
| `targetExternalUrl`   | avec `targetExternalTitle` | URL externe                 |
| `targetExternalTitle` | avec `targetExternalUrl`   | Libellé du lien externe     |
| `description`         | non                        | Texte affiché sous le titre |

> Si vous renseignez **à la fois** une page interne et un couple URL/titre externe, **c'est
> l'externe qui gagne**. Une URL externe sans titre (ou l'inverse) est ignorée.

### « Suggestions FAQ »

Des questions qui renvoient vers la page de résultats sur cette question.

| Champ                 | Obligatoire | Rôle                                   |
| --------------------- | ----------- | -------------------------------------- |
| `questionTitle`       | **oui**     | Intitulé de la question                |
| `questionslug`        | **oui**     | Identifiant de la question dans la FAQ |
| `questionDescription` | non         | Texte affiché sous le titre            |

### Règle commune

> **Un champ obligatoire manquant = la suggestion disparaît, sans message d'erreur.**
> Si une suggestion que vous avez saisie n'apparaît nulle part, commencez par vérifier ses
> champs obligatoires.

---

## Étape 4 — Relier le header à ce que vous venez de créer

Le champ de recherche du header n'est pas contribuable depuis une page classique : le menu
entier y est affiché en bloc, non modifiable. Il faut passer par la page d'administration
dédiée.

1. Dans l'arborescence du site, ouvrez la page **Menu** (gabarit « Menu page »).
2. En haut de la zone d'édition apparaît le bandeau d'onglets : les onglets
   (Particuliers / Professionnels) à gauche, et **le champ de recherche à droite**.
3. Cliquez sur ce champ de recherche pour l'éditer. Il s'appelle **Recherche du header**.

   > Ce contenu **existe déjà** : il est créé automatiquement avec le menu.
   > **Ne le supprimez pas, ne le recréez pas, ne le renommez pas.** Il est retrouvé par son
   > nom technique `search` — le renommer fait disparaître la recherche du site, sans erreur.

4. Renseignez les deux champs :

   | Champ                                                     | Valeur à choisir           |
   | --------------------------------------------------------- | -------------------------- |
   | **Page de résultats de recherche**                        | la page créée à l'étape 1  |
   | **Bloc de recherche associé (suggestions et paramètres)** | le bloc ajouté à l'étape 2 |

   > La liste déroulante ne propose que les blocs de recherche **du site courant**. Si le
   > vôtre n'y figure pas, c'est qu'il est sur un autre site — ou qu'il n'a pas encore été
   > enregistré.

---

## Étape 5 — Publier

Publiez, dans cet ordre :

1. la **page de résultats**, avec le bloc de recherche et ses suggestions ;
2. la page **Menu**.

> **Le bloc de recherche doit être publié, pas seulement la page.** Les suggestions en temps
> réel sont récupérées en direct depuis ce bloc dans l'environnement en ligne. S'il n'est pas
> publié, l'appel échoue **silencieusement** : aucune erreur ne s'affiche, les résultats live
> sont simplement toujours vides — alors que tout fonctionne en aperçu.

---

## Vérifier que tout fonctionne

Sur le site en ligne (ou en aperçu), sur un écran large :

- [ ] Le champ de recherche est visible dans le bandeau sombre en haut.
- [ ] Un clic dans le champ ouvre le panneau et affiche les suggestions contribuées.
- [ ] Une saisie de 1 ou 2 caractères affiche toujours les suggestions contribuées.
- [ ] À partir de 3 caractères (ou de la valeur de `minLettersBeforeSuggest`), le panneau
      affiche des résultats issus du contenu du site.
- [ ] Un clic sur une **suggestion de terme** ouvre la page de résultats avec la recherche
      déjà lancée (l'URL contient `?query=…`).
- [ ] Un clic sur **« Voir tous les résultats »** ouvre la page de résultats.
- [ ] La touche Entrée ouvre la page de résultats, qui affiche deux onglets —
      **Nos offres & actualités** et **Questions & réponses** — et 10 résultats par page.

Sur mobile (écran de moins de 1024 px) :

- [ ] Le bandeau d'onglets n'apparaît pas — c'est normal.
- [ ] Une icône loupe est présente dans la barre du menu, et l'ouvre en plein écran.

---

## Problèmes fréquents

| Symptôme                                                                      | Cause la plus probable                                                               |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Le panneau ne s'ouvre jamais au clic dans le champ                            | **Bloc de recherche associé** non renseigné — sans lui, il n'y a rien à afficher     |
| La validation ne mène nulle part / recharge la page courante                  | **Page de résultats de recherche** non renseignée                                    |
| Tout marche en aperçu, rien en ligne                                          | Le bloc de recherche n'est pas publié                                                |
| Le bloc n'apparaît pas dans la liste déroulante                               | Il n'est pas dans le site courant, ou pas encore enregistré                          |
| Le champ de recherche a disparu du site                                       | Le contenu `search` a été renommé ou supprimé sur la page Menu                       |
| Une suggestion contribuée ne s'affiche pas                                    | Un champ obligatoire est vide (voir étape 3)                                         |
| Un lien de suggestion pointe vers l'URL externe alors qu'une page est choisie | URL + titre externes renseignés : ils sont prioritaires sur la page interne          |
| La page de résultats affiche « 0 offres & actualités »                        | Les contenus recherchés ne sont pas publiés, ou ne sont pas indexés par la recherche |
| Les suggestions débordent du panneau                                          | `maxSuggestionsForheader` trop élevé — le panneau ne défile pas                      |

---

## Ce qui n'est pas paramétrable

Ces éléments sont figés dans le code et ne se contribuent pas :

- Les libellés de l'interface : « Rechercher », « Voir tous les résultats »,
  « Suggestions de recherche », ainsi que les titres d'onglets
  « Nos offres & actualités » et « Questions & réponses ».
- Le nombre de résultats par page sur la page de résultats : **10**.
- Le seuil d'affichage mobile : **1024 px**.
- Il n'existe **pas de message « aucun résultat »** : une recherche sans résultat affiche
  simplement une liste vide et un compteur à zéro.
- Les types de contenus remontés par la recherche, gérés par le moteur de recherche du site
  et non depuis jContent.

### Champs visibles mais sans effet

Le bloc de recherche expose dans jContent plusieurs champs hérités qui **ne sont pas
exploités** par l'affichage actuel. Les renseigner ne produit rien :

`noresultImage`, `noresultText`, `noresultRetryCta` (l'écran « aucun résultat » n'est pas
implémenté), `showDescription`, `suggestionBlockTitle`, `activateDevMode`, `faqDisplayPage`.

Pour toute demande sur ces points, passez par une évolution technique.
