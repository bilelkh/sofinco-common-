/*
 * check-header-nodetype.groovy - DIAGNOSTIC EN LECTURE SEULE
 *
 * A coller dans la console Groovy de Jahia (Administration > Server > Tools > Groovy console).
 * N'ecrit rien : aucun session.save(), aucun addNode/remove.
 *
 * REGLE VERIFIEE
 * --------------
 * Toute jnt:page doit porter un enfant `header` de type `sofnt:header` avec le
 * mixin `jmix:isAreaList`. C'est le noeud d'area attendu par
 * <Area name="header" nodeType="sofnt:header" /> des templates `basic` et
 * `legacy` (src/templates/Page/), et la forme provisionnee par
 * settings/import.xml. Toute autre situation est une anomalie :
 *
 *   OK        : sofnt:header (ou sous-type) + jmix:isAreaList
 *   KO-MIXIN  : bon type mais jmix:isAreaList manquant
 *   KO-TYPE   : noeud present mais d'un autre type (typiquement jnt:contentList,
 *               herite de l'ancien template : la vue sofnt:header ne s'applique pas)
 *   SANS-NOEUD: aucun noeud `header` sous la page. PAS une anomalie par defaut :
 *               Jahia cree le noeud d'area au PREMIER RENDU DE LA PAGE EN MODE
 *               EDITION, pas a la contribution. Une page jamais ouverte en edition
 *               depuis le deploiement n'a donc pas de noeud, et son header s'affiche
 *               quand meme. Le noeud sera cree au bon type des la premiere ouverture,
 *               puisque l'Area declare nodeType=sofnt:header (il restera a publier).
 *               ABSENT_IS_ANOMALY = true pour le compter comme KO-ABSENT.
 *
 * Les trois KO-* se corrigent avec settings/groovyScripts/migrate-header-nodetype.groovy.
 */

import org.jahia.services.content.JCRTemplate
import org.jahia.services.content.JCRNodeWrapper
import javax.jcr.query.Query
import java.util.Locale

// --------------------------- CONFIGURATION -------------------------------
def TARGET_PATH    = "/sites/sofinco"   // site, page, ou n'importe quel contenu
def AREA_NAME      = "header"
def EXPECTED_TYPE  = "sofnt:header"
def REQUIRED_MIXIN = "jmix:isAreaList"
def WORKSPACES     = ["default", "live"]
def SCAN_SUBTREE   = true      // auditer toutes les pages sous TARGET_PATH (celui-ci inclus)
def ONLY_TEMPLATE  = null      // ex: "legacy" pour ne lister que les pages de ce template
def ONLY_KO        = false     // true : n'afficher que les pages en anomalie
// Preuves brutes : pages dont on veut le detail complet. Vide = les EVIDENCE_MAX
// premieres pages KO. Sert a qualifier un faux positif suppose.
// Absence de noeud : anomalie ou simple constat ?
// false (defaut) -> statut SANS-NOEUD, hors des KO. Jahia cree le noeud d'area au
//   premier rendu de la page en mode edition : une page jamais ouverte en edition
//   n'en a pas, et son header s'affiche quand meme.
// true -> statut KO-ABSENT, compte comme anomalie (regle stricte : chaque page
//   doit porter le noeud).
def ABSENT_IS_ANOMALY = false

def EVIDENCE_PATHS = ["/sites/sofinco/home/nous-decouvrir-1/a-propos-de-sofinco/autres-sites-du-groupe-credit-ag"]
def EVIDENCE_MAX   = 5
def MAX_ROWS       = 500       // garde-fou d'affichage
// -------------------------------------------------------------------------

def SEP = "-" * 110

// ------------------------------ helpers ----------------------------------

def mixinsOf = { JCRNodeWrapper n ->
    try { n.getMixinNodeTypes().collect { it.getName() } } catch (Exception e) { [] }
}

def countChildren = { JCRNodeWrapper n ->
    int c = 0
    def iter = n.getNodes()
    while (iter.hasNext()) { iter.nextNode(); c++ }
    return c
}

def templateOf = { JCRNodeWrapper page ->
    try {
        page.hasProperty("j:templateName") ? page.getProperty("j:templateName").getString() : "(h\u00e9rit\u00e9)"
    } catch (Exception e) { "?" }
}

def pageOf = { JCRNodeWrapper n ->
    def cur = n
    while (cur != null) {
        if (cur.isNodeType("jnt:page")) return cur
        try { cur = cur.getParent() } catch (Exception e) { return null }
    }
    return null
}

/** Audite l'area `header` d'une page selon la regle ci-dessus. */
def auditPage = { JCRNodeWrapper page ->
    def row = [path: page.getPath(), template: templateOf(page),
               status: "?", type: "-", children: 0, mixins: ""]
    if (!page.hasNode(AREA_NAME)) {
        row.status = ABSENT_IS_ANOMALY ? "KO-ABSENT" : "SANS-NOEUD"
        return row
    }
    def header = page.getNode(AREA_NAME)
    def mixins = mixinsOf(header)
    row.type     = header.getPrimaryNodeTypeName()
    row.mixins   = mixins.join(", ")
    row.children = countChildren(header)
    if (!header.isNodeType(EXPECTED_TYPE)) {
        row.status = "KO-TYPE"
    } else if (!mixins.contains(REQUIRED_MIXIN)) {
        row.status = "KO-MIXIN"
    } else {
        row.status = "OK"
    }
    return row
}

/** Donnees brutes d'une page : ce sur quoi le verdict est fonde. */
def dumpEvidence = { session, String path ->
    println ""
    println "  --- ${path}"
    def p
    try {
        p = session.getNode(path)
    } catch (Exception e) {
        println "      [introuvable dans ce workspace] ${e.getClass().getSimpleName()}"
        return
    }
    println "      page uuid : ${p.getIdentifier()}"
    println "      page type : ${p.getPrimaryNodeTypeName()}   template=${templateOf(p)}"
    println "      hasNode('${AREA_NAME}') = ${p.hasNode(AREA_NAME)}"
    println "      enfants directs :"
    def iter = p.getNodes()
    boolean any = false
    while (iter.hasNext()) {
        def k = iter.nextNode()
        any = true
        println String.format("        %-28s %-26s mixins=(%s)",
                k.getName(), k.getPrimaryNodeTypeName(), mixinsOf(k).join(", "))
    }
    if (!any) println "        (aucun)"
    println "      mixins page : ${mixinsOf(p).join(", ") ?: "(aucun)"}"
    try {
        if (p.hasNode(AREA_NAME)) {
            def h = p.getNode(AREA_NAME)
            println "      noeud '${AREA_NAME}' : uuid=${h.getIdentifier()}"
            println "        type   = ${h.getPrimaryNodeTypeName()}"
            println "        mixins = ${mixinsOf(h).join(", ") ?: "(aucun)"}"
            println "        isNodeType(${EXPECTED_TYPE}) = ${h.isNodeType(EXPECTED_TYPE)}"
            println "        isNodeType(${REQUIRED_MIXIN}) = ${h.isNodeType(REQUIRED_MIXIN)}"
        }
    } catch (Exception e) {
        println "      [ERREUR] lecture de '${AREA_NAME}' : ${e.getClass().getSimpleName()} - ${e.message}"
    }

    // Acces direct par chemin : si hasNode() ment, getNode() le dira autrement.
    try {
        def direct = session.getNode(path + "/" + AREA_NAME)
        println "      getNode('${path}/${AREA_NAME}') OK -> [${direct.getPrimaryNodeTypeName()}]"
    } catch (Exception e) {
        println "      getNode('${path}/${AREA_NAME}') -> ${e.getClass().getSimpleName()}"
    }

    // Le noeud existe-t-il PLUS BAS dans la page (pas en enfant direct) ?
    def deep = []
    def walk
    walk = { node, int depth ->
        if (depth <= 0) return
        def iter2 = node.getNodes()
        while (iter2.hasNext()) {
            def k = iter2.nextNode()
            if (k.isNodeType("jnt:page")) continue          // ne pas descendre dans les sous-pages
            if (k.getName() == AREA_NAME) deep << k
            walk(k, depth - 1)
        }
    }
    try { walk(p, 4) } catch (Exception ignored) { }
    println "      descendants nommes '${AREA_NAME}' (hors sous-pages, profondeur 4) :"
    if (deep.empty) println "        (aucun)"
    deep.each { println "        ${it.getPath()}  [${it.getPrimaryNodeTypeName()}]" }

    // Un noeud du bon TYPE existe-t-il quelque part sous la page ?
    try {
        def sub = session.workspace.queryManager
                .createQuery("SELECT * FROM [${EXPECTED_TYPE}] WHERE ISDESCENDANTNODE('${path}')", Query.JCR_SQL2)
                .execute().nodes.toList()
        println "      descendants de type [${EXPECTED_TYPE}] :"
        if (sub.empty) println "        (aucun)"
        sub.each { println "        ${it.path}" }
    } catch (Exception e) {
        println "      [ERREUR] requete descendants : ${e.message}"
    }
}

def printRows = { List rows ->
    println "L\u00e9gende : OK = ${EXPECTED_TYPE} + ${REQUIRED_MIXIN}"
    println "          KO-MIXIN = bon type, ${REQUIRED_MIXIN} manquant"
    println "          KO-TYPE  = noeud present, type non conforme"
    println "          " + (ABSENT_IS_ANOMALY
            ? "KO-ABSENT= aucun noeud '${AREA_NAME}' sous la page"
            : "SANS-NOEUD= aucun noeud '${AREA_NAME}' (cree au 1er rendu en mode edition)")
    println ""
    println String.format("%-10s | %-14s | %-28s | %5s | %s",
            "STATUT", "TEMPLATE", "TYPE DU NOEUD header", "ENF.", "CHEMIN DE LA PAGE")
    println SEP
    rows.take(MAX_ROWS).each { r ->
        println String.format("%-10s | %-14s | %-28s | %5d | %s",
                r.status, r.template, r.type, r.children, r.path)
    }
    if (rows.size() > MAX_ROWS) {
        println "... ${rows.size() - MAX_ROWS} ligne(s) tronquee(s) (MAX_ROWS=${MAX_ROWS})"
    }
}

// -------------------- traitement d'un workspace --------------------------

def runForWorkspace = { String workspace ->
    println ""
    println "=" * 110
    println "WORKSPACE : ${workspace}"
    println "=" * 110

    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, workspace, Locale.FRENCH) { session ->

        JCRNodeWrapper node = null
        try {
            node = session.getNode(TARGET_PATH)
        } catch (Exception e) {
            println "❌ Chemin ${TARGET_PATH} introuvable dans '${workspace}' (${e.getClass().getSimpleName()})."
            println "   -> present en 'default' mais absent en 'live' = contenu non publie."
            return
        }

        println "✅ Noeud trouv\u00e9"
        println "    chemin : ${node.getPath()}"
        println "    type   : ${node.getPrimaryNodeTypeName()}"
        println "    mixins : ${mixinsOf(node).join(', ') ?: '(aucun)'}"
        println ""

        // 1) La page porteuse
        def page = pageOf(node)
        if (page == null) {
            println "ℹ️  Point d'entree non rattache a une page (site ou dossier) :"
            println "   on passe directement a l'audit du sous-arbre."
        } else {
            println "Page porteuse : ${page.getPath()}   (template = ${templateOf(page)})"
            def row = auditPage(page)
            println ""
            printRows([row])
            println ""
            if (row.status == "KO-TYPE") {
                println "❌ Le noeud '${AREA_NAME}' est un ${row.type} au lieu de ${EXPECTED_TYPE} :"
                println "   la vue sofnt:header ne s'applique pas, l'area rend du vide."
            } else if (row.status == "KO-MIXIN") {
                println "❌ Le noeud '${AREA_NAME}' est bien un ${row.type} mais n'a pas ${REQUIRED_MIXIN} :"
                println "   Jahia ne le reconnait pas comme noeud d'area."
            } else if (row.status == "KO-ABSENT") {
                println "❌ Aucun noeud '${AREA_NAME}' sous la page."
            } else if (row.status == "SANS-NOEUD") {
                println "ℹ️  Aucun noeud '${AREA_NAME}' sous la page - statut informatif."
                println "   Page jamais rendue en mode edition depuis le deploiement : Jahia creera"
                println "   le noeud au bon type des la premiere ouverture (restera a publier)."
                println "   ABSENT_IS_ANOMALY = true pour le compter comme anomalie."
            } else {
                println "✅ Conforme (${row.type} + ${REQUIRED_MIXIN}, ${row.children} enfant(s))."
            }

            // Enfants directs, pour reperer un noeud d'area herite sous un autre nom.
            println ""
            println "  Enfants directs de la page :"
            def kids = page.getNodes()
            while (kids.hasNext()) {
                def k = kids.nextNode()
                println String.format("    %-28s %s", k.getName(), k.getPrimaryNodeTypeName())
            }
        }

        // 2) Audit de tout le sous-arbre
        if (!SCAN_SUBTREE) return

        println ""
        println SEP
        println "AUDIT : ${TARGET_PATH}" + (ONLY_TEMPLATE ? "   (template = ${ONLY_TEMPLATE})" : "")
        println SEP

        // ISDESCENDANTNODE exclut le noeud lui-meme : l'ajouter si c'est une page.
        def pages = []
        if (node.isNodeType("jnt:page")) pages << node
        def stmt = "SELECT * FROM [jnt:page] WHERE ISDESCENDANTNODE('${TARGET_PATH}')"
        pages += session.workspace.queryManager
                .createQuery(stmt, Query.JCR_SQL2)
                .execute().nodes.toList()

        def rows = []
        pages.each { p ->
            def r = auditPage(p)
            if (ONLY_TEMPLATE && r.template != ONLY_TEMPLATE) return
            if (ONLY_KO && r.status == "OK") return
            rows << r
        }
        rows = rows.sort { it.path }

        println ""
        printRows(rows)

        // 3) Synthese
        println ""
        println SEP
        println "SYNTH\u00c8SE (${rows.size()} page(s) auditee(s))"
        println SEP
        rows.groupBy { it.status }.sort { it.key }.each { status, list ->
            println String.format("  %-10s : %4d page(s)", status, list.size())
        }
        println ""
        println "  Types rencontres pour le noeud '${AREA_NAME}' :"
        rows.groupBy { it.type }.sort { -it.value.size() }.each { type, list ->
            def flag = (type == EXPECTED_TYPE) ? "✅" : "❌"
            println String.format("   %s %-30s : %4d", flag, type, list.size())
        }

        def sansNoeud = rows.findAll { it.status == "SANS-NOEUD" }
        if (sansNoeud) {
            println ""
            println "  ${sansNoeud.size()} page(s) SANS-NOEUD - hors anomalies (ABSENT_IS_ANOMALY = false)."
        }

        def ko = rows.findAll { it.status.startsWith("KO") }
        if (ko) {
            println ""
            println "  ❌ ${ko.size()} page(s) non conforme(s), par statut puis par template :"
            ko.groupBy { it.status }.sort { it.key }.each { status, byStatus ->
                println "     ${status} (${byStatus.size()}) :"
                byStatus.groupBy { it.template }.sort { it.key }.each { tpl, list ->
                    println "       - template '${tpl}' : ${list.size()} page(s)"
                    list.take(20).each { println "           ${it.path}  [${it.type}, ${it.children} enfant(s)]" }
                    if (list.size() > 20) println "           ... (${list.size() - 20} de plus)"
                }
            }
            println ""
            println "  Correction : settings/groovyScripts/migrate-header-nodetype.groovy"
            println "  (KO-ABSENT -> creation, KO-MIXIN -> ajout du mixin, KO-TYPE -> recreation"
            println "   du noeud au bon type avec redeplacement des enfants)."
        } else {
            println ""
            println "  ✅ Toutes les pages du perimetre sont conformes."
        }

        // Preuves : de quoi qualifier un faux positif sans relancer un script.
        def evidence = EVIDENCE_PATHS ?: ko.take(EVIDENCE_MAX).collect { it.path }
        if (evidence) {
            println ""
            println SEP
            println "PREUVES - donnees brutes ayant produit le verdict"
            println SEP
            evidence.each { dumpEvidence(session, it) }
        }

        return
    }
}

println "Point d'entree : ${TARGET_PATH}"
println "Regle : chaque jnt:page porte un enfant '${AREA_NAME}' en ${EXPECTED_TYPE} + ${REQUIRED_MIXIN}"
WORKSPACES.each { runForWorkspace(it) }
println ""
println "🏁 Diagnostic termin\u00e9 (aucune ecriture JCR)."
