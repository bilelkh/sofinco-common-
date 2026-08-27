import org.jahia.services.content.JCRSessionFactory
import javax.jcr.RepositoryException
import javax.jcr.query.Query
import java.util.Locale

/**
 * Provisionne la recherche du site en une passe :
 *   1. la page de resultats (/sites/<site>/<pageName>, gabarit basic) ;
 *   2. le bloc sofnt:siteSearchBlock dans sa zone "main" ;
 *   3. le cablage du noeud `search` du menu (url + searchBlockTarget) vers ces deux noeuds.
 *
 * L'interet n'est pas de creer la page : c'est de garantir la COHERENCE du couple
 * (url, searchBlockTarget). Ce sont deux weakreferences independantes, heritees de
 * spnt:header (portal-common), qu'aucune validation ne rapproche : designer un bloc
 * qui n'est pas sur la page designee produit une page de resultats vide, sans erreur.
 *
 * DETECTION DE L'EXISTANT (resolve-then-create) : le script ne se fie PAS au nom de la
 * page. Une page de resultats nommee autrement, ou rangee ailleurs sous le site, serait
 * invisible a un simple hasNode("recherche") et le script creerait un doublon orphelin.
 * L'ordre de resolution va donc du plus fiable au moins fiable :
 *   1. `searchBlockTarget` du menu, resolu par UUID (source de verite : c'est ce que le
 *      header interroge reellement) ;
 *   2. sinon, requete sur [spnt:siteSearchBlock] dans tout le site -- le type PARENT, car
 *      `sofnt:siteSearchBlock` en herite et le picker du menu selectionne sur `spnt:` ;
 *      un bloc cree directement au type portal-common est legitime et doit etre trouve ;
 *   3. sinon, balayage du sous-arbre de la page (repli si l'index/le type est indisponible) ;
 *   4. la page = ancetre jnt:page du bloc, sinon `url` resolu, sinon la page nommee
 *      `pageName` A CONDITION qu'elle soit bien une jnt:page.
 * Rien n'est cree tant qu'une de ces pistes aboutit ; en cas d'ambiguite (plusieurs blocs
 * non departageables) le script s'arrete sans rien creer.
 *
 * Contraintes issues du module portal-common-sofinco (spnt:siteSearchBlock) :
 *   - `maxSuggestionsForheader` est MANDATORY dans la CND : sans valeur, session.save()
 *     leve une ConstraintViolationException. Il est donc toujours pose a la creation.
 *   - `minLettersBeforeSuggest` est pose explicitement : le defaut differe selon le
 *     chemin de rendu (3 dans search.mapping.ts, 6 en dur dans SearchFilter.java).
 *   - le bloc DOIT etre sous une jnt:page : les suggestions de termes construisent leur
 *     URL via getAncestorUrl(currentNode, 'jnt:page'). Dans un dossier de contenu, elles
 *     disparaissent silencieusement.
 *   - les identifiants SmartTribune (onglet "Questions & reponses") ne sont PAS poses
 *     ici : ce script part dans le bundle et dans git. Ils se saisissent dans jContent.
 *
 * Idempotent : chaque noeud est garde par une resolution d'existence, et le cablage
 * n'ecrase jamais une valeur deja saisie ET VALIDE (sauf forceRewire). Une weakreference
 * pendante -- la cible a ete supprimee, l'UUID subsiste -- est traitee comme vide et
 * reparee. Ne jamais remplacer ces gardes par un remove()/recreate : cela detruirait les
 * suggestions contribuees a chaque deploiement.
 *
 * Regles contenu francais : Locale.FRENCH + accents echappes \\uXXXX.
 */

// --- CONFIGURATION ---
def siteKey = "sofinco"
def pageName = "recherche"          // nom de repli uniquement : l'existant est detecte par reference/requete
def pageTitle = "Recherche"
def templateName = "basic"          // basic ou legacy : seuls gabarits affichant le header
def validTemplates = ["basic", "legacy"]
def areaName = "main"               // zone rendue par le gabarit basic
def blockName = "bloc-recherche"
def blockTitle = "Que recherchez-vous ?"
def minLettersBeforeSuggest = 3L
def maxSuggestionsForheader = 5L    // plafonne a 6 cote serveur (PAGE_SIZE_LIMIT), inutile d'aller au-dela
def seedExamples = true             // 2 suggestions de termes d'amorcage, a la creation du bloc uniquement
def forceRewire = false             // true = reecrit url/searchBlockTarget meme s'ils pointent ailleurs
// ---------------------

def session = JCRSessionFactory.getInstance().getCurrentSystemSession("default", Locale.FRENCH, null)

def warnings = []

/** Retrouve le noeud `search` du menu sans le creer : il est autocreated sous sofnt:tabMenu. */
def findSearchNode = { jcrSession, key ->
    // Chemin nominal : page Menu -> AbsoluteArea "menu" (sofnt:navMenu) -> tabMenu -> search.
    def nominal = "/sites/${key}/menu/menu/tabMenu/search"
    if (jcrSession.nodeExists(nominal)) {
        return jcrSession.getNode(nominal)
    }
    // Repli : la zone du menu a pu etre posee ailleurs sous le site.
    try {
        def qm = jcrSession.getWorkspace().getQueryManager()
        def stmt = "select * from [sofnt:navMenu] where isdescendantnode('/sites/${key}')"
        def it = qm.createQuery(stmt, Query.JCR_SQL2).execute().getNodes()
        while (it.hasNext()) {
            def navMenu = it.nextNode()
            if (navMenu.hasNode("tabMenu") && navMenu.getNode("tabMenu").hasNode("search")) {
                return navMenu.getNode("tabMenu").getNode("search")
            }
        }
    } catch (Exception e) {
        println "[ATTENTION] Recherche du menu impossible (${e.message}). Repli sur le chemin nominal uniquement."
    }
    return null
}

/**
 * Resout une weakreference en noeud, ou null.
 * Les weakreferences ne garantissent pas l'integrite referentielle : apres suppression de
 * la cible, la propriete conserve un UUID pendant. Un tel UUID vaut "non renseigne".
 */
def resolveRef = { jcrSession, node, propName ->
    if (node == null || !node.hasProperty(propName)) {
        return null
    }
    try {
        def uuid = node.getProperty(propName).getString()
        if (uuid == null || uuid.trim().isEmpty()) {
            return null
        }
        return jcrSession.getNodeByIdentifier(uuid.trim())
    } catch (Exception ignored) {
        // ItemNotFoundException (reference pendante) ou UUID malforme.
        return null
    }
}

/** Premier ancetre jnt:page en remontant depuis le noeud (inclusif), ou null. */
def ancestorPage = { node ->
    def current = node
    while (current != null) {
        if (current.isNodeType("jnt:page")) {
            return current
        }
        if (current.getPath() == "/") {
            return null
        }
        current = current.getParent()
    }
    return null
}

/** Vrai si le noeud est un bloc de recherche, quel que soit son sous-type local. */
def isSearchBlock = { node ->
    try {
        return node.isNodeType("spnt:siteSearchBlock")
    } catch (Exception ignored) {
        // Type non enregistre : portal-common-sofinco n'est pas deploye.
        return false
    }
}

/**
 * Tous les blocs de recherche du site. Retourne null si la requete est impossible
 * (type non enregistre, index indisponible) : l'appelant doit alors se replier sur un
 * balayage, et surtout ne pas conclure "aucun bloc" -- ce serait creer un doublon.
 */
def findSearchBlocks = { jcrSession, key ->
    def found = []
    try {
        def qm = jcrSession.getWorkspace().getQueryManager()
        def stmt = "select * from [spnt:siteSearchBlock] where isdescendantnode('/sites/${key}')"
        def it = qm.createQuery(stmt, Query.JCR_SQL2).execute().getNodes()
        while (it.hasNext()) {
            found << it.nextNode()
        }
    } catch (Exception e) {
        println "[ATTENTION] Requete des blocs de recherche impossible : ${e.message}"
        return null
    }
    return found
}

/** Balayage recursif du sous-arbre : repli quand la requete JCR-SQL2 n'est pas exploitable. */
def scanForSearchBlock
scanForSearchBlock = { node ->
    def children = node.getNodes()
    while (children.hasNext()) {
        def child = children.nextNode()
        if (child.getName().startsWith("j:")) {
            continue
        }
        if (isSearchBlock(child)) {
            return child
        }
        def deeper = scanForSearchBlock(child)
        if (deeper != null) {
            return deeper
        }
    }
    return null
}

/**
 * Les pages publiees sont versionnees : ecrire sous un noeud checked-in leve une
 * VersionException. Le checkout porte sur l'ancetre mix:versionable le plus proche --
 * le noeud ecrit (ici `search`, sous la page Menu) n'est generalement pas versionnable
 * lui-meme, donc tester `node.isCheckedOut()` seul ne protege de rien.
 */
def ensureCheckedOut = { jcrSession, node ->
    try {
        def current = node
        while (current != null) {
            if (current.isNodeType("mix:versionable")) {
                if (!current.isCheckedOut()) {
                    jcrSession.getWorkspace().getVersionManager().checkout(current.getPath())
                }
                return
            }
            if (current.getPath() == "/") {
                return
            }
            current = current.getParent()
        }
    } catch (Exception ignored) {
        /* non versionnable ou registry indisponible : rien a faire */
    }
}

try {
    def sitePath = "/sites/${siteKey}"
    if (!session.nodeExists(sitePath)) {
        println "[ERREUR] Le site '${siteKey}' est introuvable (${sitePath}). Rien n'a ete fait."
        return
    }

    def siteNode = session.getNode(sitePath)
    def needsSave = false

    // --- 1. Resolution du cablage existant ------------------------------------
    def searchNode = findSearchNode(session, siteKey)
    if (searchNode == null) {
        println "[ATTENTION] Noeud 'search' du menu introuvable sous ${sitePath}."
        println "             La page Menu n'a pas encore ete creee, ou la zone 'menu' (sofnt:navMenu)"
        println "             n'a pas encore ete initialisee. La page et le bloc seront tout de meme"
        println "             provisionnes ; relancer ce script ensuite pour effectuer le cablage."
        warnings << "noeud 'search' du menu absent : cablage non effectue"
    }

    def wiredPage = resolveRef(session, searchNode, "url")
    def wiredBlock = resolveRef(session, searchNode, "searchBlockTarget")

    // --- 2. Resolution du bloc existant ---------------------------------------
    def block = wiredBlock
    if (block == null) {
        def blocks = findSearchBlocks(session, siteKey)
        if (blocks == null) {
            // Requete indisponible : on ne pourra chercher qu'une fois la page connue (etape 3).
            println "[INFO] Detection du bloc par requete indisponible : repli sur le balayage de la page."
        } else if (blocks.size() == 1) {
            block = blocks[0]
            println "[INFO] Bloc de recherche existant detecte : ${block.getPath()}"
        } else if (blocks.size() > 1) {
            // Plusieurs blocs : on ne departage que si le header designe deja une page.
            def match = wiredPage == null ? null : blocks.find {
                def p = ancestorPage(it)
                return p != null && p.getPath() == wiredPage.getPath()
            }
            if (match != null) {
                block = match
                println "[INFO] ${blocks.size()} blocs de recherche presents ; celui de la page cablee est retenu : ${block.getPath()}"
            } else {
                println "[ERREUR] ${blocks.size()} blocs 'spnt:siteSearchBlock' coexistent sous ${sitePath} :"
                blocks.each { println "         - ${it.getPath()}" }
                println "         Impossible de choisir sans risque. Rien n'a ete cree ni cable."
                println "         Supprimer les blocs en trop dans jContent, ou renseigner 'searchBlockTarget'"
                println "         a la main sur le noeud 'search' du menu, puis relancer ce script."
                return
            }
        }
    } else {
        println "[INFO] Bloc de recherche deja cable depuis le menu : ${block.getPath()}"
    }

    // --- 3. Resolution de la page de resultats ---------------------------------
    def page = block == null ? null : ancestorPage(block)
    if (block != null && page == null) {
        // Le bloc existe mais hors d'une jnt:page : les suggestions de termes ne peuvent pas
        // construire leur URL (getAncestorUrl(currentNode, 'jnt:page')) et disparaissent.
        println "[ERREUR] Le bloc ${block.getPath()} n'est pas sous une jnt:page."
        println "         Les suggestions de termes ne fonctionneront pas. Le deplacer dans une page"
        println "         via jContent, puis relancer ce script. Rien n'a ete modifie."
        return
    }

    if (page == null) {
        page = wiredPage
        if (page != null) {
            println "[INFO] Page de resultats deja cablee depuis le menu : ${page.getPath()}"
        }
    }

    if (page == null && siteNode.hasNode(pageName)) {
        def candidate = siteNode.getNode(pageName)
        if (candidate.isNodeType("jnt:page")) {
            page = candidate
            println "[INFO] Page de resultats existante detectee par son nom : ${page.getPath()}"
        } else {
            // Y planter la zone et le bloc placerait le bloc hors d'une jnt:page.
            println "[ERREUR] ${candidate.getPath()} existe mais n'est pas une jnt:page (${candidate.getPrimaryNodeType().getName()})."
            println "         Le renommer ou le supprimer dans jContent, puis relancer. Rien n'a ete modifie."
            return
        }
    }

    if (page == null) {
        page = siteNode.addNode(pageName, "jnt:page")
        page.setProperty("j:templateName", templateName)
        // jcr:title est i18n : il vit sur le noeud de traduction, pas sur la page.
        page.getOrCreateI18N(Locale.FRENCH).setProperty("jcr:title", pageTitle)
        println "[OK] Page de resultats creee : ${sitePath}/${pageName} (gabarit '${templateName}')."
        needsSave = true
    } else {
        // Page adoptee : seuls basic et legacy affichent le header, donc le champ de recherche.
        def existingTemplate = page.hasProperty("j:templateName") ? page.getProperty("j:templateName").getString() : ""
        if (!validTemplates.contains(existingTemplate)) {
            println "[ATTENTION] La page ${page.getPath()} utilise le gabarit '${existingTemplate}'."
            println "            Seuls ${validTemplates.join(' ou ')} affichent le header. Le champ de recherche"
            println "            sera absent de la page de resultats. A corriger dans jContent."
            warnings << "gabarit '${existingTemplate}' sur ${page.getPath()}"
        }
    }

    // --- 4. Bloc de recherche --------------------------------------------------
    if (block == null) {
        // Repli quand la requete a echoue : un bloc peut deja exister sur la page adoptee.
        block = scanForSearchBlock(page)
        if (block != null) {
            println "[INFO] Bloc de recherche existant detecte sous la page : ${block.getPath()}"
        }
    }

    def blockCreated = false
    if (block == null) {
        def area
        if (!page.hasNode(areaName)) {
            ensureCheckedOut(session, page)
            area = page.addNode(areaName, "jnt:contentList")
            area.addMixin("jmix:isAreaList")
            needsSave = true
        } else {
            area = page.getNode(areaName)
            // Une liste sans le mixin n'est pas rendue comme zone par le gabarit.
            if (!area.isNodeType("jmix:isAreaList")) {
                ensureCheckedOut(session, area)
                area.addMixin("jmix:isAreaList")
                println "[OK] Mixin 'jmix:isAreaList' pose sur ${area.getPath()}."
                needsSave = true
            }
        }

        ensureCheckedOut(session, area)
        block = area.addNode(blockName, "sofnt:siteSearchBlock")
        block.setProperty("title", blockTitle)
        // MANDATORY dans la CND portal-common : sans lui, le save echoue.
        block.setProperty("maxSuggestionsForheader", maxSuggestionsForheader)
        // Pose explicitement : le defaut implicite vaut 3 ou 6 selon le rendu.
        block.setProperty("minLettersBeforeSuggest", minLettersBeforeSuggest)
        blockCreated = true
        needsSave = true
        println "[OK] Bloc de recherche cree : ${block.getPath()}"
    } else {
        // Filet de securite : un bloc anterieur a cette contrainte peut ne pas porter la
        // propriete mandatory, ce qui ferait echouer tout save ulterieur sur ce noeud.
        if (!block.hasProperty("maxSuggestionsForheader")) {
            ensureCheckedOut(session, block)
            block.setProperty("maxSuggestionsForheader", maxSuggestionsForheader)
            println "[OK] 'maxSuggestionsForheader' manquant sur le bloc existant : pose a ${maxSuggestionsForheader}."
            needsSave = true
        }
    }

    // Le bloc retenu peut vivre sur une autre page que celle retenue (deux weakreferences
    // independantes) : c'est exactement l'incoherence que ce script existe pour eviter.
    def blockPage = ancestorPage(block)
    if (blockPage != null && blockPage.getPath() != page.getPath()) {
        println "[ATTENTION] Le bloc ${block.getPath()} n'est pas sur la page ${page.getPath()}."
        println "            La page de resultats affichera une recherche vide. Aligner les deux"
        println "            dans jContent, ou relancer avec forceRewire = true."
        warnings << "bloc et page desalignes"
    }

    // --- 5. Suggestions d'amorcage (creation du bloc uniquement) --------------
    if (blockCreated && seedExamples) {
        // `term` est le mot recherche ; `termDisplayTitle` est le libelle affiche.
        // Les deux sont requis par la vue searchTermeSuggestion : sans le second, la
        // suggestion n'apparait pas dans la liste d'edition de la page de resultats.
        [
            [name: "terme-credit-auto", term: "cr\u00e9dit auto", label: "Cr\u00e9dit auto"],
            [name: "terme-pret-personnel", term: "pr\u00eat personnel", label: "Pr\u00eat personnel"]
        ].each { seed ->
            def suggestion = block.addNode(seed.name, "spnt:searchTermeSuggestion")
            suggestion.setProperty("term", seed.term)
            suggestion.setProperty("termDisplayTitle", seed.label)
        }
        println "[OK] 2 suggestions de termes d'amorcage ajoutees sous le bloc."
    }

    // --- 6. Cablage du champ de recherche du header ---------------------------
    if (searchNode != null) {
        // Reference absente OU pendante -> a (re)poser ; reference valide mais divergente
        // -> signalee, jamais ecrasee sans forceRewire.
        if (wiredPage == null || forceRewire) {
            ensureCheckedOut(session, searchNode)
            searchNode.setProperty("url", page.getIdentifier())
            println "[OK] Header -> page de resultats : ${page.getPath()}"
            needsSave = true
        } else if (wiredPage.getPath() != page.getPath()) {
            println "[ATTENTION] 'url' pointe sur ${wiredPage.getPath()} et non sur ${page.getPath()}."
            println "            Conserve (forceRewire=false)."
            warnings << "'url' du menu diverge"
        }

        if (wiredBlock == null || forceRewire) {
            ensureCheckedOut(session, searchNode)
            searchNode.setProperty("searchBlockTarget", block.getIdentifier())
            println "[OK] Header -> bloc de recherche : ${block.getPath()}"
            needsSave = true
        } else if (wiredBlock.getPath() != block.getPath()) {
            println "[ATTENTION] 'searchBlockTarget' pointe sur ${wiredBlock.getPath()} et non sur ${block.getPath()}."
            println "            Conserve (forceRewire=false)."
            warnings << "'searchBlockTarget' du menu diverge"
        }
    }

    // --- 7. Enregistrement ----------------------------------------------------
    if (needsSave) {
        session.save()
        println "[SUCCES] Recherche provisionnee pour le site '${siteKey}'."
        println "[RAPPEL] A faire a la main dans jContent :"
        println "         - publier la page de resultats AVEC le bloc, puis la page Menu ;"
        println "           les filtres de recherche ne s'appliquent qu'en mode live, un bloc"
        println "           non publie donne des resultats live systematiquement vides, sans erreur."
        println "         - renseigner les identifiants SmartTribune sur le bloc si l'onglet"
        println "           'Questions & reponses' doit remonter des resultats."
    } else if (warnings.isEmpty()) {
        println "[INFO] Recherche deja configuree pour le site '${siteKey}' : page ${page.getPath()},"
        println "       bloc ${block.getPath()}, header cable sur les deux. Rien a faire."
    } else {
        println "[ATTENTION] Recherche presente mais incoherente pour le site '${siteKey}' : ${warnings.join(' ; ')}."
        println "            Rien n'a ete modifie : corriger dans jContent puis relancer."
    }

} catch (RepositoryException e) {
    println "[ERREUR JCR] " + e.getMessage()
    // La session systeme est partagee avec les scripts suivants de la meme passe de
    // provisioning : sans ce refresh, les modifications en attente fuiteraient dans leur save().
    try {
        session.refresh(false)
    } catch (Exception ignored) {
        /* session deja invalide : rien a faire */
    }
}
