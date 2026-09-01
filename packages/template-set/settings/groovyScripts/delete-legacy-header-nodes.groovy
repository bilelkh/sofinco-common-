/*
 * delete-legacy-header-nodes.groovy
 * ---------------------------------
 * SUPPRIME le noeud d'area `header` herite de l'ancien template (un
 * `jnt:contentList` la ou les templates attendent `sofnt:header`), sans rien
 * recreer.
 *
 * POURQUOI SUPPRIMER PLUTOT QUE RECREER
 * -------------------------------------
 * `migrate-header-nodetype.groovy` renomme puis recree le noeud au bon type :
 * le nouveau noeud porte donc un uuid different de son homologue en `live`.
 * Jahia apparie les noeuds entre workspaces par uuid, et la page se retrouve
 * bloquee en publication.
 *
 * La suppression n'a pas ce defaut : rien de nouveau n'est cree, donc rien a
 * publier. Le template repose le noeud AU BON TYPE au premier rendu de la page
 * en mode edition - c'est le mecanisme normal de Jahia, l'`Area` declarant
 * nodeType=sofnt:header (src/templates/Page/legacy.server.tsx, basic.server.tsx).
 *
 * Et cote rendu, rien ne casse entre-temps : la vue sofnt:header lit le menu, le
 * bouton QR et le hero depuis le noeud SITE (components/Header/default.server.tsx).
 * Un `jnt:contentList` vide ne rendait de toute facon rien du tout.
 *
 * LES DEUX WORKSPACES
 * -------------------
 * La suppression est jouee en `default` ET en `live`. Ne la jouer qu'en `default`
 * laisserait le noeud orphelin en `live` jusqu'a une publication de la page - or
 * c'est precisement la publication qui coince. Supprimer des deux cotes remet les
 * deux workspaces dans le meme etat : aucun noeud, aucun ecart, aucun uuid a
 * reconcilier.
 *
 * UN NOEUD CONFORME PEUT AUSSI BLOQUER
 * ------------------------------------
 * Un `sofnt:header` recree par `migrate-header-nodetype.groovy` porte un uuid
 * different de son homologue `live` : il est du bon type et bloque quand meme la
 * publication. Sur les pages explicitement listees dans PATHS, le noeud est donc
 * supprime QUEL QUE SOIT SON TYPE (DELETE_EVEN_IF_CONFORM). Le template le
 * reposera au premier rendu en edition, avec un uuid propre des deux cotes.
 *
 * GARDE-FOUS
 * ----------
 *   - DRY_RUN par defaut.
 *   - Un noeud DEJA conforme (sofnt:header ou sous-type) n'est JAMAIS supprime
 *     EN MODE DECOUVERTE. Sur un perimetre explicite (PATHS renseigne), il l'est :
 *     voir DELETE_EVEN_IF_CONFORM ci-dessous.
 *   - Seuls les types listes dans DELETABLE_TYPES sont supprimes.
 *   - Un noeud AYANT DES ENFANTS est saute (aucune perte de contenu), sauf
 *     FORCE_WITH_CHILDREN. Les 54 pages relevees par le check en portent zero.
 *   - Un noeud reference ailleurs est saute (l'integrite referentielle ferait
 *     de toute facon echouer le remove).
 *   - Un save par page : une page en echec est annulee seule (session.refresh(false)).
 *
 * ORDRE D'EXECUTION
 * -----------------
 *   1. settings/groovyConsole/check-header-nodetype.groovy : releve des KO-TYPE
 *   2. Ce script avec DRY_RUN = true  -> verifier le plan
 *   3. Relancer avec DRY_RUN = false
 *   4. Outils -> Caches -> Vider tous
 *   5. Ouvrir une des pages en mode edition : le noeud sofnt:header apparait
 *   6. Rejouer le check : plus aucun KO-TYPE
 */

import org.jahia.services.content.JCRTemplate
import org.jahia.services.content.JCRNodeWrapper
import javax.jcr.query.Query
import java.util.Locale

// --------------------------- CONFIGURATION -------------------------------

final boolean DRY_RUN = true

final String AREA_NAME = "header"
final String EXPECTED_TYPE = "sofnt:header"

// Types supprimables EN MODE DECOUVERTE. Liste vide = tout type non conforme.
final List<String> DELETABLE_TYPES = ["jnt:contentList"]

// Sur un perimetre explicite (PATHS renseigne), supprimer le noeud meme s'il est
// deja au bon type : un noeud recree porte un uuid different de son homologue
// `live` et bloque la publication malgre un type correct.
// Sans effet en mode decouverte : un header conforme trouve automatiquement n'est
// jamais supprime.
final boolean DELETE_EVEN_IF_CONFORM = true

// `default` = edition, `live` = publie. Voir "LES DEUX WORKSPACES" ci-dessus.
final List<String> WORKSPACES = ["default", "live"]

// Supprimer meme si le noeud porte des enfants (contenu contribue perdu).
final boolean FORCE_WITH_CHILDREN = false

// Perimetre. Liste vide -> decouverte automatique sous TARGET_PATH.
final String TARGET_PATH = "/sites/sofinco"
final List<String> PATHS = [
        "/sites/sofinco/home/Plan du site Sofinco",
        "/sites/sofinco/home/produits/credit-renouvelable/Agile optimum",
        "/sites/sofinco/home/produits/credit-renouvelable/credit-renouvelable-sofinco",
        "/sites/sofinco/home/produits/credit-renouvelable/credit-renouvelable-sofinco/guides-cr/cr-sofinco-emprunt-5000-euros",
        "/sites/sofinco/home/produits/credit-renouvelable/credit-renouvelable-sofinco/guides-cr/cr-sofinco-emprunt-6000-euros",
        "/sites/sofinco/home/produits/credit-renouvelable/credit-renouvelable-sofinco/guides-cr/credit-renouvelable-mode-emploi",
        "/sites/sofinco/home/produits/credit-renouvelable/credit-renouvelable-sofinco/guides-cr/organisme-credit-renouvelable",
        "/sites/sofinco/home/produits/credit-renouvelable/refonte-credit-renouvelable-4",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-10-000-euros",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-1000-euros--pret-personne",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-2000-euros-",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-20000-euros-2",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-3000-euros--financez-vos",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-30000-euros-4",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-4000-euros--simulation-cr",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-50000-euros-3",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-5000euros",
        "/sites/sofinco/home/produits/refonte-autres-prets/credit-7000-euros",
        "/sites/sofinco/home/produits/refonte-pret-personnel",
        "/sites/sofinco/home/produits/refonte-pret-personnel/credit-voiture-electrique-1",
        "/sites/sofinco/home/produits/refonte-pret-personnel/nos-guides-du-pret-perso/credit-conso-sans-cdi",
        "/sites/sofinco/home/produits/refonte-pret-personnel/nos-guides-du-pret-perso/credit-consommation-rapide",
        "/sites/sofinco/home/produits/refonte-pret-personnel/nos-guides-du-pret-perso/emprunter-sans-apport",
        "/sites/sofinco/home/produits/refonte-pret-personnel/nos-guides-du-pret-perso/obtenir-simulation-15000-euros",
        "/sites/sofinco/home/produits/refonte-pret-personnel/nos-guides-du-pret-perso/simul-credit-conso-guide",
        "/sites/sofinco/home/produits/refonte-pret-personnel/nos-guides-du-pret-perso/simulation-credit-calculette",
        "/sites/sofinco/home/produits/refonte-pret-personnel/nos-guides-du-pret-perso/simulation-remboursement-pret",
        "/sites/sofinco/home/produits/refonte-pret-personnel/pr-t-transition-nergetique/pr-t-auto-mobilite",
        "/sites/sofinco/home/produits/refonte-pret-personnel/pr-t-transition-nergetique/pret-travaux-vert",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-bateau",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-camping-car",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-mobil-home",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-auto",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-auto/credit-voiture-electrique",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-auto/credit-voiture-hybride",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-auto/refonte-pret-perso-auto-2",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-auto/refonte-pret-perso-auto-2/voiture-doccasion-a-payer-en-p-1",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-caravane",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-moto",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-moto-1",
        "/sites/sofinco/home/produits/refonte-pret-personnel/refonte-pret-perso-travaux",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/RAC-CDD",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/calculette-rachat-de-credits",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/choisir-organisme-rachat-credits",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/guide-faire-rachat-credit",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/meilleur-rachat-credits",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/rac-chomage",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/rac-conso-simulation-gratuite",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/rac-divorce-mode-d-emploi",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/rac-professions-liberales",
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/rachat-de-credit-auto",
        // Accent unicode-echappe : le chemin JCR doit round-tripper a l'identique.
        "/sites/sofinco/home/produits/refonte-rachat-de-credit/nos-guides-du-rachat-de-credit/restructuration de cr\u00e9dits",
        "/sites/sofinco/home/produits/simulation-de-credit/credit-voiture-electrique-1",
        "/sites/sofinco/home/produits/simulation-de-credit/simulation-pret-auto-occasion--c",
]

// -------------------------------------------------------------------------

// Perimetre explicite = liste fournie ; sinon decouverte automatique.
final boolean LISTED = !PATHS.isEmpty()
final boolean DELETE_ANY_TYPE = LISTED && DELETE_EVEN_IF_CONFORM

def SEP = "-" * 78

// ------------------------------ helpers ----------------------------------

def childrenOf = { JCRNodeWrapper n ->
    def out = []
    def iter = n.getNodes()
    while (iter.hasNext()) { out << iter.nextNode() }
    return out
}

def countRefs = { JCRNodeWrapper n ->
    int c = 0
    try { def iter = n.getReferences();     while (iter.hasNext()) { iter.nextProperty(); c++ } } catch (Exception ignored) { }
    try { def iter = n.getWeakReferences(); while (iter.hasNext()) { iter.nextProperty(); c++ } } catch (Exception ignored) { }
    return c
}

// ===== Bilan ==============================================================

Map deleted = [:]
Map skipped = [:]
Map failed = [:]

println "=" * 78
println " Header - suppression des noeuds d'area herites de l'ancien template"
println " Mode        : ${DRY_RUN ? 'DRY RUN (aucune ecriture)' : 'APPLY (ecritures reelles)'}"
println " Workspaces  : ${WORKSPACES.join(', ')}"
println " Supprime    : " + (DELETE_ANY_TYPE
        ? "'${AREA_NAME}' QUEL QUE SOIT SON TYPE, ${EXPECTED_TYPE} inclus (perimetre explicite)"
        : "'${AREA_NAME}' de type ${DELETABLE_TYPES ?: '(tout type non conforme)'}")
if (!DELETE_ANY_TYPE) println " Preserve    : tout noeud ${EXPECTED_TYPE} (jamais supprime)"
println " Perimetre   : ${PATHS ? PATHS.size() + ' page(s) listee(s)' : 'decouverte sous ' + TARGET_PATH}"
println "=" * 78

WORKSPACES.each { String workspace ->

    println ""
    println SEP
    println "WORKSPACE '${workspace}'"
    println SEP

    List wsDeleted = []
    List wsSkipped = []
    List wsFailed = []

    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, workspace, Locale.FRENCH) { session ->

        // ---- Perimetre ----------------------------------------------------

        List targets = PATHS
        if (!targets) {
            try {
                targets = session.workspace.queryManager
                        .createQuery("SELECT * FROM [jnt:page] WHERE ISDESCENDANTNODE('${TARGET_PATH}')", Query.JCR_SQL2)
                        .execute().nodes.toList()
                        .findAll { p ->
                            p.hasNode(AREA_NAME) && !p.getNode(AREA_NAME).isNodeType(EXPECTED_TYPE)
                        }
                        .collect { it.path }
                println "Decouverte : ${targets.size()} page(s) avec un '${AREA_NAME}' non conforme."
            } catch (Exception e) {
                println "[STOP] Decouverte impossible : ${e.message}"
                return
            }
        }

        // ---- Traitement ---------------------------------------------------

        targets.each { String pagePath ->

            def page
            try {
                page = session.getNode(pagePath)
            } catch (Exception e) {
                println "[ABSENT] ${pagePath} (page inconnue dans ce workspace)"
                wsSkipped << "${pagePath} (page absente)"
                return
            }

            if (!page.hasNode(AREA_NAME)) {
                println "[RIEN]   ${pagePath} : pas de noeud '${AREA_NAME}'."
                wsSkipped << "${pagePath} (deja sans noeud)"
                return
            }

            def header = page.getNode(AREA_NAME)
            String type = header.getPrimaryNodeTypeName()

            // Garde-fous n1 et n2 : le type ne conditionne la suppression qu'en mode
            // decouverte. Sur un perimetre explicite, c'est justement un noeud recree
            // - donc conforme - qui bloque la publication : il doit partir aussi.
            if (!DELETE_ANY_TYPE) {

                // n1 : ne jamais supprimer un header conforme trouve automatiquement.
                if (header.isNodeType(EXPECTED_TYPE)) {
                    println "[GARDE]  ${pagePath} : ${type} deja conforme, on ne touche pas."
                    wsSkipped << "${pagePath} (${type} conforme)"
                    return
                }

                // n2 : type non liste.
                if (DELETABLE_TYPES && !DELETABLE_TYPES.contains(type)) {
                    println "[GARDE]  ${pagePath} : ${type} hors DELETABLE_TYPES."
                    wsSkipped << "${pagePath} (${type} non liste)"
                    return
                }
            }

            // Garde-fou n3 : contenu contribue sous le noeud.
            def kids = childrenOf(header)
            if (kids && !FORCE_WITH_CHILDREN) {
                println "[GARDE]  ${pagePath} : ${kids.size()} enfant(s) sous '${AREA_NAME}', suppression refusee."
                kids.each { println "           ${it.getName()} [${it.getPrimaryNodeTypeName()}]" }
                wsSkipped << "${pagePath} (${kids.size()} enfant(s))"
                return
            }

            // Garde-fou n4 : references entrantes.
            int refs = countRefs(header)
            if (refs > 0) {
                println "[GARDE]  ${pagePath} : ${refs} reference(s) vers le noeud, suppression refusee."
                wsSkipped << "${pagePath} (${refs} reference(s))"
                return
            }

            println "[${DRY_RUN ? 'WOULD' : 'DO'}]   ${pagePath}/${AREA_NAME}  [${type}, ${kids.size()} enfant(s)]"

            if (DRY_RUN) {
                wsDeleted << pagePath
                return
            }

            try {
                // Un noeud versionne refuse toute ecriture sans checkout prealable.
                try {
                    if (!page.isCheckedOut()) session.workspace.versionManager.checkout(pagePath)
                } catch (Exception ignored) { /* non versionable (cas de `live`) */ }

                header.remove()
                session.save()
                wsDeleted << pagePath
            } catch (Exception e) {
                println "         ECHEC : ${e.getClass().getSimpleName()} - ${e.message}"
                try { session.refresh(false) } catch (Exception ignored) { }
                wsFailed << "${pagePath} : ${e.message}"
            }
        }
    }

    deleted[workspace] = wsDeleted
    skipped[workspace] = wsSkipped
    failed[workspace] = wsFailed
}

// ---- Caches --------------------------------------------------------------

if (!DRY_RUN && deleted.values().any { !it.empty }) {
    try {
        org.jahia.services.cache.CacheHelper.flushOutputCaches()
        println "\n[OK] Caches de sortie vides."
    } catch (Exception e) {
        println "\n[INFO] Flush des caches a faire manuellement : ${e.message}"
    }
}

// ---- Bilan ---------------------------------------------------------------

println "\n" + "=" * 78
println " Termine."
WORKSPACES.each { ws ->
    println ""
    println " Workspace '${ws}' :"
    println "   ${DRY_RUN ? 'A supprimer' : 'Supprimes'} : ${deleted[ws].size()}"
    println "   Ignores               : ${skipped[ws].size()}"
    skipped[ws].each { println "     - ${it}" }
    if (!failed[ws].empty) {
        println "   ECHECS                : ${failed[ws].size()}"
        failed[ws].each { println "     - ${it}" }
    }
}
println ""
if (DRY_RUN) {
    println " DRY_RUN = false pour appliquer reellement."
} else {
    println " PROCHAINES ETAPES :"
    println "   1. Outils -> Caches -> Vider tous"
    println "   2. Ouvrir une page traitee en mode edition : le noeud ${EXPECTED_TYPE}"
    println "      est recree par le template, puis publiable normalement"
    println "   3. Rejouer check-header-nodetype.groovy : plus aucun KO-TYPE"
}
println "=" * 78
