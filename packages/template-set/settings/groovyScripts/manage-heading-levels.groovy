/*
 * manage-heading-levels.groovy
 * ============================
 * Rend EXPLICITE, sur les contenus deja en base, le niveau de titre que le rendu
 * applique deja par defaut. Lot « niveaux de titre (Hn) ».
 *
 * ============================================================================
 * MODE D'EMPLOI
 * ============================================================================
 *
 *   1. Laisser DRY_RUN = true, lancer, LIRE la synthese.
 *   2. Repasser DRY_RUN = false, relancer.
 *   3. Outils -> Caches -> Vider tous.
 *   4. Verifier le rendu. ATTENTION, deux attentes differentes selon l'action :
 *        - backfill (item-level, eyebrow-level) : AUCUN titre ne doit changer.
 *        - repair   (eyebrow-repair)            : le sur-titre des heros corriges
 *          passe de <h1> a <p>. C'est le BUT. Son apparence, elle, ne bouge pas :
 *          elle vient du variant `eyebrow`, pas d'une echelle de titre.
 *
 * En DRY_RUN, AUCUNE ecriture n'est faite : ni setProperty, ni save().
 *
 * ============================================================================
 * POURQUOI CE SCRIPT EST NECESSAIRE
 * ============================================================================
 *
 * Les nouvelles proprietes — `itemsTitleLevel` sur les conteneurs a liste,
 * `eyebrowLevel` sur le hero produit — ne se posent qu'a la CREATION du noeud.
 * C'est le contrat d'`autocreated` et des `defaultValues` de formulaire. Les
 * contenus deja publies n'ont donc aucune valeur.
 *
 * Le rendu reste correct sans ce script : les mappings retombent sur exactement
 * les memes valeurs. Ce qui manque, c'est l'EXPLICITE — un contributeur ouvrant
 * une fiche existante voit un champ vide la ou une fiche neuve montre « H3 ».
 *
 * ============================================================================
 * DEUX OPERATIONS DISTINCTES : BACKFILL ET REPAIR
 * ============================================================================
 *
 * BACKFILL (`item-level`, `eyebrow-level`) — pose une valeur la ou il n'y en a
 * AUCUNE. Ne touche jamais a un choix existant, donc rejouable a l'infini et sans
 * effet sur le rendu. C'est le comportement historique de ce script.
 *
 * REPAIR (`eyebrow-repair`) — corrige une valeur DEJA ECRITE, et fausse.
 *
 * Pourquoi c'est necessaire : une version de ce lot a livre le CND avec
 * `eyebrowLevel (string, choicelist) = 'h1' autocreated`. Tout `sofnt:productHero`
 * cree pendant que cette version etait deployee — dev, recette, voire prod si elle
 * y est passee — porte donc `eyebrowLevel = "h1"` en base.
 *
 * Ces noeuds echappent aux DEUX filets :
 *   - le CND corrige (= 'p') ne les rattrape pas : `autocreated` ne joue qu'a la
 *     CREATION du noeud, jamais retroactivement ;
 *   - le backfill les saute : ils ont deja une valeur.
 *
 * Resultat : un SECOND <h1> sur ces pages produit, indefiniment, jusqu'a ce qu'un
 * contributeur rouvre la fiche et change le champ a la main. D'ou cette action.
 *
 * ============================================================================
 * POURQUOI LE REPAIR EST SUR MALGRE L'ECRASEMENT
 * ============================================================================
 *
 * Il n'ecrase QU'UNE valeur precise, `h1`, et sur cette propriete uniquement.
 *
 * `h1` n'est jamais un choix legitime pour le sur-titre du hero produit : le titre
 * du hero juste en dessous porte deja le <h1> de la page (`titleLevel` ET
 * `titleStyle` valent h1 dans `sofnt_productHero.json`). Un `h1` sur le sur-titre
 * ne peut donc etre qu'un artefact du CND fautif — pas une decision editoriale.
 *
 * Un contributeur qui aurait delibrement choisi h2, h3 ou tout autre niveau garde
 * sa valeur : le repair ne la regarde meme pas.
 *
 * ============================================================================
 * CE QUE CE SCRIPT NE FAIT PAS, ET POURQUOI
 * ============================================================================
 *
 * AUCUNE MIGRATION DE DONNEES.
 *
 * Une version anterieure de ce lot faisait passer `sofnt:appShowcase.subtitle` de
 * non-i18n a i18n, en remplacant la propriete locale par celle de
 * `sofmix:sectionHeader`. Meme nom, mais stockage different : la valeur passait du
 * noeud de contenu a ses `j:translation_<lang>`, et il fallait la recopier — sans
 * quoi le sous-titre disparaissait du site sans la moindre erreur.
 *
 * Cette bascule a ete abandonnee. Les quatre conteneurs GARDENT leur `subtitle`
 * local et n'heritent que de `sofmix:headingStyle`, qui apporte les deux axes du
 * titre — la seule chose qui leur manquait vraiment. Le changement de CND devient
 * purement ADDITIF : aucune propriete retiree, aucune valeur deplacee.
 *
 * Le sous-titre d'`appShowcase` reste non traduisible. C'est un defaut, mais sans
 * portee sur un site monolingue. Le jour ou une seconde langue arrivera, la
 * bascule i18n se fera isolement, avec sa propre migration, au moment ou elle
 * servira a quelque chose. Faire porter ce risque a un lot qui n'en a pas besoin
 * serait un mauvais arbitrage.
 */

import org.jahia.services.content.JCRTemplate
import javax.jcr.query.Query
import java.util.Locale

// ============================================================================
// REGLAGES
// ============================================================================

/** true = aucune ecriture. Toujours commencer par la. */
final boolean DRY_RUN = true

/**
 * Actions jouees, dans cet ordre. Retirer une entree pour la sauter.
 *
 * `eyebrow-repair` avant `eyebrow-level` par lisibilite du journal : les deux sont
 * en realite disjointes — la premiere ne touche que les noeuds valant 'h1', la
 * seconde que ceux sans valeur. Aucun noeud n'est vu par les deux.
 */
final List<String> ACTIONS = ["item-level", "eyebrow-repair", "eyebrow-level"]

/**
 * `default` = espace d'edition, `live` = contenu publie.
 *
 * Les DEUX portent leurs propres valeurs. Ne traiter que `default` laisserait le
 * site en ligne dans l'etat d'avant jusqu'a la prochaine publication de chaque
 * contenu — soit, en pratique, indefiniment.
 */
final List<String> WORKSPACES = ["default", "live"]

// ============================================================================
// TABLES DE REFERENCE
// ============================================================================

/**
 * Niveau des titres d'ITEMS, porte par le CONTENEUR et non par chaque item : des
 * items freres sont des pairs dans le plan de la page.
 *
 * `level` DOIT rester aligne sur TROIS choses, sous peine de rendre trois etats
 * differents pour un meme contenu :
 *   - le repli du mapping (*.mapping.ts)
 *   - le `defaultValues` du formulaire (content-editor-forms/forms/*.json)
 *   - la valeur posee ici
 */
final List<Map> ITEM_TARGETS = [
        [type: "sofnt:reassurance",       level: "h3", was: "<h3> en dur sur les items"],
        [type: "sofnt:appShowcase",       level: "h3", was: "<h3> en dur sur les cartes"],
        [type: "sofnt:productAdvantages", level: "h3", was: "<h3> en dur sur les slides"],
        [type: "sofnt:howItWorks",        level: "p",  was: "<span> sur les etapes (rendu identique)"],
]

/*
 * `p` et non `h1` : c'est la balise historique du sur-titre du hero. Poser `h1`
 * creerait un SECOND <h1> sur chaque page produit — le titre du hero en porte
 * deja un — soit une regression SEO, l'inverse du but de ce lot.
 */
final Map EYEBROW_TARGET = [type: "sofnt:productHero", property: "eyebrowLevel", level: "p"]

/**
 * Valeurs FAUSSES a corriger, ecrites par un `autocreated` errone (voir l'en-tete).
 *
 * `wrong` est volontairement une valeur unique et non une liste : plus le filtre est
 * etroit, moins le risque d'emporter une contribution legitime est grand. Elargir ce
 * champ demande de pouvoir affirmer, pour CHAQUE valeur ajoutee, qu'aucun
 * contributeur n'a pu la choisir intentionnellement.
 */
final List<Map> REPAIR_TARGETS = [
        [
                type    : "sofnt:productHero",
                property: "eyebrowLevel",
                wrong   : "h1",
                to      : "p",
                why     : "le titre du hero porte deja le <h1> de la page",
        ],
]

// ============================================================================
// OUTILLAGE
// ============================================================================

/*
 * `writes` et `repairs` sont comptes SEPAREMENT, et c'est le point important de la
 * synthese : le premier mesure une mise a l'explicite sans effet visible, le second
 * un changement de balise reellement servi aux moteurs. Les confondre ferait passer
 * une correction SEO pour une operation neutre.
 */
def stats = [writes: 0, kept: 0, repairs: 0, untouched: 0]

/** Parcourt un type de noeud sur un workspace. `body(session, node, path, workspace)`. */
def eachNode = { String workspace, String type, Closure body ->
    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, workspace, Locale.FRENCH) { session ->
        def nodes
        try {
            nodes = session.workspace.queryManager
                    .createQuery("SELECT * FROM [${type}]", Query.JCR_SQL2)
                    .execute().nodes.toList()
        } catch (Exception e) {
            println "   [${workspace}] requete impossible sur ${type} : ${e.message}"
            return
        }
        if (nodes.empty) {
            println "   [${workspace}] aucun noeud ${type}."
            return
        }

        int touched = 0
        nodes.each { node ->
            def path
            try { path = node.path } catch (Exception ignored) { path = "(chemin illisible)" }
            touched += (body(session, node, path, workspace) ?: 0)
        }

        if (touched > 0 && !DRY_RUN) {
            session.save()
            println "   [${workspace}] ${nodes.size()} noeud(s), ${touched} ecriture(s) persistee(s)."
        } else if (touched > 0) {
            println "   [${workspace}] ${nodes.size()} noeud(s), ${touched} ecriture(s) prevue(s) — pas de save()."
        } else {
            println "   [${workspace}] ${nodes.size()} noeud(s), rien a ecrire."
        }
    }
}

/** Checkout obligatoire avant ecriture sur un noeud versionne. */
def ensureCheckedOut = { session, target ->
    try {
        if (target.isNodeType("mix:versionable") && !target.isCheckedOut()) {
            session.workspace.versionManager.checkout(target.path)
        }
    } catch (Exception ignored) { /* non versionable : rien a faire */ }
}

/** Pose `property = level` sur les noeuds de `type` qui n'ont pas encore de valeur. */
def backfill = { String type, String property, String level, String label ->
    println "\n ${type}.${property} -> '${level}'${label ? '   (avant : ' + label + ')' : ''}"

    WORKSPACES.each { workspace ->
        eachNode(workspace, type) { session, node, path, ws ->

            // Ne JAMAIS ecraser un choix deja fait : le script doit rester rejouable
            // sans annuler une contribution SEO faite entre deux passages.
            boolean alreadySet = false
            try {
                alreadySet = node.hasProperty(property) && node.getProperty(property).string?.trim()
            } catch (Exception ignored) { }

            if (alreadySet) { stats.kept++; return 0 }

            println "   [${DRY_RUN ? 'WOULD' : 'DO'}] [${ws}] ${path} <- '${level}'"
            if (DRY_RUN) { stats.writes++; return 1 }

            try {
                ensureCheckedOut(session, node)
                node.setProperty(property, level)
                stats.writes++
                return 1
            } catch (Exception e) {
                println "        ECHEC : ${e.message}"
                return 0
            }
        }
    }
}

/**
 * Remplace `wrong` par `to` sur `type`.`property`. DELIBEREMENT distinct de
 * `backfill` : celui-ci garantit de ne jamais ecraser un choix existant, et cette
 * garantie ne doit pas devenir conditionnelle a un drapeau. Deux intentions
 * opposees, deux closures.
 *
 * Tout ce qui n'est pas EXACTEMENT `wrong` est laisse tel quel — y compris la
 * valeur vide, qui releve du backfill.
 */
def repair = { String type, String property, String wrong, String to, String why ->
    println "\n ${type}.${property} : '${wrong}' -> '${to}'   (${why})"

    WORKSPACES.each { workspace ->
        eachNode(workspace, type) { session, node, path, ws ->

            String current = null
            try {
                if (node.hasProperty(property)) current = node.getProperty(property).string?.trim()
            } catch (Exception ignored) { }

            if (current != wrong) { stats.untouched++; return 0 }

            println "   [${DRY_RUN ? 'WOULD' : 'DO'}] [${ws}] ${path} : '${wrong}' -> '${to}'"
            if (DRY_RUN) { stats.repairs++; return 1 }

            try {
                ensureCheckedOut(session, node)
                node.setProperty(property, to)
                stats.repairs++
                return 1
            } catch (Exception e) {
                println "        ECHEC : ${e.message}"
                return 0
            }
        }
    }
}

// ============================================================================
// EXECUTION
// ============================================================================

println "=" * 78
println " NIVEAUX DE TITRE — mise a l'explicite des contenus existants"
println " Mode       : ${DRY_RUN ? 'DRY RUN (aucune ecriture)' : 'APPLY (ecritures reelles)'}"
println " Actions    : ${ACTIONS.join(', ')}"
println " Workspaces : ${WORKSPACES.join(', ')}"
if (ACTIONS.contains("eyebrow-repair")) {
    println " Rendu      : les backfills n'y touchent pas ; le repair change la BALISE"
    println "              du sur-titre des heros fautifs (h1 -> p). Apparence inchangee."
} else {
    println " Rendu      : INCHANGE — les valeurs posees sont celles des replis actuels"
}
println "=" * 78

if (ACTIONS.contains("item-level")) {
    println "\n" + "=" * 78
    println " Niveaux des titres d'items (portes par les CONTENEURS)"
    println "=" * 78
    ITEM_TARGETS.each { t -> backfill(t.type, "itemsTitleLevel", t.level, t.was) }
}

if (ACTIONS.contains("eyebrow-repair")) {
    println "\n" + "=" * 78
    println " REPRISE — sur-titres poses a 'h1' par le CND fautif"
    println "=" * 78
    REPAIR_TARGETS.each { r -> repair(r.type, r.property, r.wrong, r.to, r.why) }
}

if (ACTIONS.contains("eyebrow-level")) {
    println "\n" + "=" * 78
    println " Sur-titre du hero produit"
    println "=" * 78
    backfill(EYEBROW_TARGET.type, EYEBROW_TARGET.property, EYEBROW_TARGET.level,
             "<p> (balise historique)")
}

// ============================================================================
// SYNTHESE
// ============================================================================

println "\n" + "=" * 78
println " SYNTHESE"
println "=" * 78
println ""
println " BACKFILL — mise a l'explicite, rendu inchange"
println "   Ecritures ${DRY_RUN ? 'prevues' : 'faites '} : ${stats.writes}"
println "   Choix existants conserves : ${stats.kept}"
println ""
if (ACTIONS.contains("eyebrow-repair")) {
    println " REPAIR — correction SEO, la balise change"
    println "   Corrections ${DRY_RUN ? 'prevues' : 'faites '} : ${stats.repairs}"
    println "   Noeuds hors perimetre (valeur absente ou legitime) : ${stats.untouched}"
    println ""
    if (stats.repairs == 0) {
        println "   Aucun 'h1' trouve : cet environnement n'a jamais recu le CND fautif."
    } else {
        println "   ${stats.repairs} page(s) produit servaient DEUX <h1>. Prevoir un passage"
        println "   du crawl SEO apres application."
    }
    println ""
}
if (DRY_RUN) {
    println " DRY_RUN = false pour appliquer reellement."
} else {
    println " PROCHAINES ETAPES :"
    println "   1. Outils -> Caches -> Vider tous"
    println "   2. Verifier le rendu :"
    println "      - titres d'items et sur-titres backfilles : AUCUN changement attendu."
    println "      - sur-titres repares : <p> au lieu de <h1> dans le DOM, meme apparence"
    println "        a l'ecran (le style vient du variant `eyebrow`, pas d'une echelle)."
    println ""
    println " Tout ecart HORS de ce perimetre est une anomalie."
}
println "=" * 78
