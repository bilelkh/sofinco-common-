/*
 * migrate-header-nodetype.groovy
 * ------------------------------
 * MET EN CONFORMITE le noeud d'area `header` de chaque page.
 *
 * REGLE APPLIQUEE
 * ---------------
 * Toute jnt:page doit porter un enfant `header` de type `sofnt:header` avec le
 * mixin `jmix:isAreaList` - le noeud d'area attendu par
 * <Area name="header" nodeType="sofnt:header" /> (src/templates/Page/basic.server.tsx
 * et legacy.server.tsx), dans la forme provisionnee par settings/import.xml.
 *
 * TROIS ANOMALIES, TROIS CORRECTIONS
 * ----------------------------------
 *   KO-ABSENT -> CREATE    : creation du noeud `header` (type + mixin). Desactive
 *                            par defaut (HANDLE_ABSENT) : Jahia cree lui-meme ce
 *                            noeud, au bon type, au premier rendu de la page en
 *                            mode edition.
 *   KO-MIXIN  -> ADD-MIXIN : ajout de jmix:isAreaList sur un noeud deja au bon type
 *   KO-TYPE   -> RECREATE  : JCR interdit de changer le type primaire en place.
 *                            L'ancien noeud est renomme, `header` est recree au bon
 *                            type, les enfants y sont REDEPLACES (le header porte un
 *                            enfant `hero` consomme par <RenderChild name="hero" />
 *                            dans components/Header/default.server.tsx, plus les
 *                            eventuels j:translation_*), puis l'ancien est supprime.
 *
 * PERIMETRE
 * ---------
 * Par defaut TOUTES les pages du site. `TEMPLATES_WITH_HEADER` permet de
 * restreindre : a noter que les templates `simple`, `footer` et `menu` ne
 * declarent aucun <Area name="header"> - un noeud y serait inerte, ni lu ni rendu.
 *
 * GARDE-FOUS
 * ----------
 *   - DRY_RUN par defaut : aucune ecriture tant qu'il vaut true.
 *   - MIGRATABLE_TYPES : seuls ces types sont RECREES. Un header d'un type
 *     inattendu est signale et laisse en l'etat.
 *   - Un noeud reference ailleurs (hard ou weak reference) n'est pas recree :
 *     l'uuid changerait et casserait la reference. FORCE_WITH_REFS pour outrepasser.
 *   - Aucun enfant supprime : si un enfant ne peut pas etre redeplace, l'ancien
 *     noeud est CONSERVE sous BACKUP_SUFFIX et la page remonte dans le bilan.
 *   - Un save par page : une page en echec est annulee seule (session.refresh(false)),
 *     les pages deja traitees dans le meme run sont conservees.
 *
 * PUBLICATION ET UUID  (le point qui fait tout marcher ou tout coincer)
 * --------------------------------------------------------------------
 * Un noeud recree porte un uuid NEUF. Or `live` detient encore l'ancien noeud,
 * au meme chemin mais avec l'ancien uuid - et Jahia apparie les noeuds entre
 * workspaces par uuid, pas par chemin. La publication de la page bute alors sur
 * deux noeuds concurrents au meme emplacement : elle echoue, et la page reste
 * bloquee tant qu'on n'a pas nettoye `live` a la main.
 *
 * Le script traite donc les trois temps dans cet ordre :
 *
 *   1. `default` : recreation du noeud au bon type (nouvel uuid)
 *   2. `live`    : suppression de l'ancien noeud (CLEAN_LIVE) - plus aucun
 *                  concurrent au meme chemin, la publication redevient possible.
 *                  Rien n'est perdu a l'ecran : un jnt:contentList vide ne rendait
 *                  deja rien, et la vue sofnt:header lit l'essentiel du noeud SITE.
 *   3. publication (PUBLISH) : `live` recoit le noeud de `default`, AVEC SON UUID.
 *
 * A la fin, les deux workspaces portent le meme noeud, le meme type et le meme
 * uuid. VERIFY_UUID le controle et le journalise page par page.
 *
 * Sans PUBLISH, l'etat d'arrivee est : noeud correct en `default`, aucun noeud en
 * `live`, page publiable normalement quand on le decidera. C'est un etat sain -
 * pas un blocage.
 *
 * WORKSPACE
 * ---------
 * La RECREATION n'a lieu qu'en `default` : creer le noeud directement en `live`
 * lui donnerait la encore un uuid different de son homologue d'edition. `live`
 * n'est touche que pour SUPPRIMER l'ancien noeud (etape 2 ci-dessus) ; c'est la
 * publication qui l'y recree, avec le bon uuid.
 *
 * ORDRE D'EXECUTION
 * -----------------
 *   1. settings/groovyConsole/check-header-nodetype.groovy : etat des lieux
 *   2. Ce script avec DRY_RUN = true  -> verifier le plan page par page
 *   3. Relancer avec DRY_RUN = false
 *   4. Republier les pages listees au bilan (ou PUBLISH = true)
 *   5. Outils -> Caches -> Vider tous, puis recharger jContent
 *   6. Rejouer le check : plus aucun KO-*
 */

import org.jahia.services.content.JCRTemplate
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRPublicationService
import javax.jcr.query.Query
import java.util.Locale

// --------------------------- CONFIGURATION -------------------------------

final boolean DRY_RUN = true

// Point d'entree : chemin du site, d'une page, ou de n'importe quel contenu.
final String TARGET_PATH = "/sites/sofinco"

// true  : traiter toutes les pages sous TARGET_PATH (celui-ci inclus si c'est une page)
// false : traiter uniquement la page portant TARGET_PATH
final boolean SCAN_SUBTREE = true

// null = toutes les pages. Sinon la liste des templates a traiter, p.ex.
// ["basic", "legacy"] : les seuls a declarer <Area name="header">.
final List<String> TEMPLATES_WITH_HEADER = null

// Creer le noeud sur les pages qui n'en ont aucun ?
// false (defaut) : ces pages sont ignorees, et c'est le bon choix. Jahia cree le
//   noeud d'area au premier rendu de la page en mode edition, deja au bon type
//   puisque l'Area declare nodeType=sofnt:header. Les creer ici ne ferait que
//   devancer Jahia, au prix d'autant de noeuds a publier.
// true : applique la regle stricte, creation du noeud sur chaque page.
final boolean HANDLE_ABSENT = false

final String AREA_NAME = "header"
final String EXPECTED_TYPE = "sofnt:header"
final String REQUIRED_MIXIN = "jmix:isAreaList"

// Types de depart acceptes pour une RECREATION. Liste vide = tout type non conforme.
final List<String> MIGRATABLE_TYPES = ["jnt:contentList"]

// Suffixe du noeud conserve quand un enfant n'a pas pu etre redeplace.
final String BACKUP_SUFFIX = "_legacy_backup"

// Recreer malgre des references entrantes (l'uuid change : elles casseront).
final boolean FORCE_WITH_REFS = false

// Supprimer l'ancien noeud dans `live` apres la recreation en `default`.
// Indispensable : sans ca, deux noeuds d'uuid different se disputent le meme
// chemin et la publication de la page echoue (cf. "PUBLICATION ET UUID").
final boolean CLEAN_LIVE = true

// Publier les pages traitees en fin de run.
// /!\ La publication porte sur TOUTE la page (allSubTree) : elle emporte aussi
// les autres modifications en attente. A laisser a false si des brouillons courent.
final boolean PUBLISH = false

// Controler, page par page, que `default` et `live` portent bien le meme uuid.
final boolean VERIFY_UUID = true

// Proprietes systeme non recopiables sur le nouveau noeud (cas RECREATE).
final List<String> SKIP_PROPS = [
        "jcr:primaryType", "jcr:mixinTypes", "jcr:uuid",
        "jcr:created", "jcr:createdBy", "jcr:lastModified", "jcr:lastModifiedBy",
        "jcr:versionHistory", "jcr:baseVersion", "jcr:predecessors", "jcr:isCheckedOut",
        "j:originWS", "j:nodename", "j:fullpath", "j:processId",
]

// -------------------------------------------------------------------------

final String WORKSPACE = "default"
final String TMP_SUFFIX = "__migr_tmp"

def SEP = "-" * 78

// ------------------------------ helpers ----------------------------------

def mixinsOf = { JCRNodeWrapper n ->
    try { n.getMixinNodeTypes().collect { it.getName() } } catch (Exception e) { [] }
}

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

// Nom du frere suivant, pour restaurer la position du noeud apres recreation.
def nextSiblingName = { JCRNodeWrapper page, String name ->
    def names = childrenOf(page).collect { it.getName() }
    int i = names.indexOf(name)
    return (i >= 0 && i + 1 < names.size()) ? names[i + 1] : null
}

// Un noeud versionne refuse toute ecriture sans checkout prealable.
def ensureCheckedOut = { session, JCRNodeWrapper page ->
    try {
        if (!page.isCheckedOut()) session.workspace.versionManager.checkout(page.getPath())
    } catch (Exception ignored) { /* non versionable */ }
}

// ===== Bilan ==============================================================

List<String> created = []
List<String> mixinAdded = []
List<String> recreated = []
List<String> skipped = []
List<String> failed = []
List<String> backups = []
List<String> lostProps = []

println "=" * 78
println " Header - mise en conformite du noeud d'area"
println " Regle       : chaque jnt:page porte '${AREA_NAME}' en ${EXPECTED_TYPE} + ${REQUIRED_MIXIN}"
println " Mode        : ${DRY_RUN ? 'DRY RUN (aucune ecriture)' : 'APPLY (ecritures reelles)'}"
println " Workspace   : ${WORKSPACE}"
println " Perimetre   : ${SCAN_SUBTREE ? 'toutes les pages sous ' + TARGET_PATH : 'la page ' + TARGET_PATH}"
println " Templates   : ${TEMPLATES_WITH_HEADER ?: '(tous)'}"
println " Sans noeud  : ${HANDLE_ABSENT ? 'CREATION du noeud' : 'ignorees (HANDLE_ABSENT = false)'}"
println " Recreation  : depuis ${MIGRATABLE_TYPES ?: '(tout type non conforme)'}"
println " Nettoyage   : ${CLEAN_LIVE ? 'suppression de l\'ancien noeud dans live' : 'AUCUN (publication susceptible d\'echouer)'}"
println " Publication : ${PUBLISH ? 'ACTIVE (allSubTree)' : 'manuelle'}"
println "=" * 78

JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, WORKSPACE, Locale.FRENCH) { session ->

    JCRNodeWrapper target
    try {
        target = session.getNode(TARGET_PATH)
    } catch (Exception e) {
        println "\n[STOP] Chemin ${TARGET_PATH} introuvable dans '${WORKSPACE}' : ${e.getClass().getSimpleName()}"
        return
    }
    println "\nPoint d'entree : ${target.getPath()} [${target.getPrimaryNodeTypeName()}]"

    // ---- 1. Selection des pages ------------------------------------------

    List pages = []
    if (SCAN_SUBTREE) {
        // ISDESCENDANTNODE exclut le noeud lui-meme : l'ajouter si c'est une page.
        if (target.isNodeType("jnt:page")) pages << target
        pages += session.workspace.queryManager
                .createQuery("SELECT * FROM [jnt:page] WHERE ISDESCENDANTNODE('${TARGET_PATH}')", Query.JCR_SQL2)
                .execute().nodes.toList()
    } else {
        def p = pageOf(target)
        if (p == null) {
            println "[STOP] Aucun ancetre jnt:page pour ${TARGET_PATH}."
            return
        }
        pages = [p]
    }
    println "${pages.size()} page(s) dans le perimetre."
    println SEP

    // ---- 2. Traitement page par page -------------------------------------

    pages.sort { it.path }.each { JCRNodeWrapper page ->

        String pagePath = page.getPath()
        String template = templateOf(page)

        if (TEMPLATES_WITH_HEADER && !TEMPLATES_WITH_HEADER.contains(template)) return

        // ---- Diagnostic : quelle action pour cette page ? -----------------

        String action
        def header = null
        String currentType = "-"
        List oldMixins = []

        if (!page.hasNode(AREA_NAME)) {
            if (!HANDLE_ABSENT) return
            action = "CREATE"
        } else {
            header = page.getNode(AREA_NAME)
            currentType = header.getPrimaryNodeTypeName()
            oldMixins = mixinsOf(header)
            if (!header.isNodeType(EXPECTED_TYPE)) {
                action = "RECREATE"
            } else if (!oldMixins.contains(REQUIRED_MIXIN)) {
                action = "ADD-MIXIN"
            } else {
                return   // conforme
            }
        }

        // ---- Garde-fous propres a la recreation ---------------------------

        int refs = 0
        def kids = []
        def copyProps = []

        if (action == "RECREATE") {
            if (MIGRATABLE_TYPES && !MIGRATABLE_TYPES.contains(currentType)) {
                println "[SKIP] ${pagePath} : header en ${currentType}, hors MIGRATABLE_TYPES."
                skipped << "${pagePath} (${currentType} non liste)"
                return
            }
            refs = countRefs(header)
            if (refs > 0 && !FORCE_WITH_REFS) {
                println "[SKIP] ${pagePath} : ${refs} reference(s) entrante(s) vers le noeud header."
                println "       La recreation changerait son uuid. FORCE_WITH_REFS = true pour passer outre."
                skipped << "${pagePath} (${refs} reference(s))"
                return
            }
            kids = childrenOf(header)
            try {
                def iter = header.getProperties()
                while (iter.hasNext()) {
                    def prop = iter.nextProperty()
                    if (SKIP_PROPS.contains(prop.getName())) continue
                    if (prop.getDefinition().isProtected()) continue
                    copyProps << prop.getName()
                }
            } catch (Exception e) {
                println "       [WARN] lecture des proprietes impossible : ${e.message}"
            }
        }

        // ---- Journal du plan ----------------------------------------------

        println "[${DRY_RUN ? 'WOULD' : 'DO'}] ${action.padRight(9)} ${pagePath}  (template ${template})"
        if (action == "CREATE") {
            println "       creation de '${AREA_NAME}' : ${EXPECTED_TYPE} + ${REQUIRED_MIXIN}"
        } else if (action == "ADD-MIXIN") {
            println "       ${currentType} : ajout du mixin ${REQUIRED_MIXIN}"
            println "       mixins actuels : ${oldMixins.join(', ') ?: '(aucun)'}"
        } else {
            println "       ${currentType} -> ${EXPECTED_TYPE}"
            println "       mixins     : ${(oldMixins + [REQUIRED_MIXIN]).unique().join(', ')}"
            println "       proprietes : ${copyProps ?: '(aucune)'}"
            println "       enfants    : ${kids.collect { it.getName() + ' [' + it.getPrimaryNodeTypeName() + ']' }.join(', ') ?: '(aucun)'}"
        }

        if (DRY_RUN) {
            if (action == "CREATE") created << pagePath
            else if (action == "ADD-MIXIN") mixinAdded << pagePath
            else recreated << pagePath
            return
        }

        // ---- Application ---------------------------------------------------

        try {
            ensureCheckedOut(session, page)

            if (action == "CREATE") {

                def fresh = page.addNode(AREA_NAME, EXPECTED_TYPE)
                if (!fresh.isNodeType(REQUIRED_MIXIN)) fresh.addMixin(REQUIRED_MIXIN)
                session.save()
                println "       [OK] noeud cree."
                created << pagePath

            } else if (action == "ADD-MIXIN") {

                header.addMixin(REQUIRED_MIXIN)
                session.save()
                println "       [OK] mixin ajoute."
                mixinAdded << pagePath

            } else {   // RECREATE

                String tmpName = AREA_NAME + TMP_SUFFIX
                String tmpPath = pagePath + "/" + tmpName
                String headerPath = header.getPath()
                String sibling = nextSiblingName(page, AREA_NAME)
                boolean keepBackup = false

                if (page.hasNode(tmpName)) {
                    println "       ECHEC : ${tmpPath} existe deja (run precedent interrompu ?). Page ignoree."
                    failed << "${pagePath} (tmp residuel)"
                    return
                }

                // a. Liberer le nom "header"
                session.move(headerPath, tmpPath)
                def old = session.getNode(tmpPath)

                // b. Recreer au bon type
                def fresh = page.addNode(AREA_NAME, EXPECTED_TYPE)

                // c. Mixins d'origine + celui exige par Jahia pour une area
                (oldMixins + [REQUIRED_MIXIN]).unique().each { mixin ->
                    try {
                        if (!fresh.isNodeType(mixin)) fresh.addMixin(mixin)
                    } catch (Exception e) {
                        println "       [WARN] mixin ${mixin} non applicable : ${e.message}"
                    }
                }

                // d. Proprietes contribuees
                copyProps.each { String name ->
                    try {
                        def prop = old.getProperty(name)
                        if (prop.isMultiple()) fresh.setProperty(name, prop.getValues())
                        else fresh.setProperty(name, prop.getValue())
                    } catch (Exception e) {
                        def value = "(illisible)"
                        try { value = old.getProperty(name).getString() } catch (Exception ignored) { }
                        println "       [PERDU] propriete ${name} = \"${value}\" : ${e.message}"
                        lostProps << "${pagePath} -> ${name} = \"${value}\""
                    }
                }

                // e. Enfants, dans l'ordre d'origine (un move ajoute en fin de liste)
                int moved = 0
                childrenOf(old).each { kid ->
                    String kidName = kid.getName()
                    if (fresh.hasNode(kidName)) {
                        println "       [CONFLIT] ${kidName} existe deja sous le nouveau noeud : non deplace."
                        keepBackup = true
                        return
                    }
                    try {
                        session.move(kid.getPath(), fresh.getPath() + "/" + kidName)
                        moved++
                    } catch (Exception e) {
                        println "       [CONFLIT] ${kidName} [${kid.getPrimaryNodeTypeName()}] non deplacable : ${e.message}"
                        keepBackup = true
                    }
                }

                // f. Ancien noeud : supprime si vide, conserve sinon (jamais de perte)
                if (keepBackup) {
                    String backup = AREA_NAME + BACKUP_SUFFIX
                    session.move(tmpPath, pagePath + "/" + backup)
                    println "       [BACKUP] contenu non migre conserve sous ${pagePath}/${backup}"
                    backups << "${pagePath}/${backup}"
                } else {
                    old.remove()
                }

                // g. Position d'origine parmi les freres
                if (sibling) {
                    try { page.orderBefore(AREA_NAME, sibling) } catch (Exception ignored) { }
                }

                session.save()
                println "       [OK] recree (${moved} enfant(s) deplace(s))."
                recreated << pagePath
            }

        } catch (Exception e) {
            // Annulation de la seule page en cours : les precedentes sont deja sauvees.
            println "       ECHEC : ${e.getClass().getSimpleName()} - ${e.message}"
            try { session.refresh(false) } catch (Exception ignored) { }
            failed << "${pagePath} : ${e.message}"
        }
    }
}

// ---- 3. Nettoyage de `live` ----------------------------------------------
//
// L'ancien noeud y survit avec son ancien uuid. Tant qu'il est la, il occupe le
// chemin que la publication veut ecrire : celle-ci echoue et la page se retrouve
// bloquee. On le retire donc AVANT toute publication.

List<String> touched = (created + mixinAdded + recreated).unique()
List<String> liveFailed = []

if (CLEAN_LIVE && !touched.empty) {
    println "\n" + SEP
    println "NETTOYAGE DE 'live' - retrait des anciens noeuds"
    println SEP
    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, "live", Locale.FRENCH) { session ->
        touched.each { String path ->
            def page
            try {
                page = session.getNode(path)
            } catch (Exception e) {
                println "   [ABSENT] ${path} (page non publiee)"
                return
            }
            if (!page.hasNode(AREA_NAME)) {
                println "   [RIEN]   ${path} : deja sans noeud '${AREA_NAME}'."
                return
            }
            def old = page.getNode(AREA_NAME)
            int kidCount = 0
            try { def iter = old.getNodes(); while (iter.hasNext()) { iter.nextNode(); kidCount++ } } catch (Exception ignored) { }
            println "   [${DRY_RUN ? 'WOULD' : 'DO'}]   ${path}/${AREA_NAME}  [${old.getPrimaryNodeTypeName()}, ${kidCount} enfant(s)] uuid=${old.getIdentifier()}"
            if (DRY_RUN) return
            try {
                old.remove()
                session.save()
            } catch (Exception e) {
                println "            ECHEC : ${e.getClass().getSimpleName()} - ${e.message}"
                try { session.refresh(false) } catch (Exception ignored) { }
                liveFailed << "${path} : ${e.message}"
            }
        }
    }
}

// ---- 4. Publication (optionnelle) ---------------------------------------

if (PUBLISH && !DRY_RUN && !touched.empty) {
    println "\n" + SEP
    println "PUBLICATION des pages traitees"
    println SEP
    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, WORKSPACE, Locale.FRENCH) { session ->
        def pub = JCRPublicationService.getInstance()
        touched.each { String path ->
            try {
                def page = session.getNode(path)
                pub.publishByMainId(page.getIdentifier(), "default", "live", null, true, null)
                println "   [OK] ${path}"
            } catch (Exception e) {
                println "   ECHEC ${path} : ${e.message}"
            }
        }
    }
}

// ---- 5. Verification des uuid --------------------------------------------
//
// Etat attendu en sortie :
//   - avec PUBLISH  : meme noeud, meme type, MEME UUID des deux cotes
//   - sans PUBLISH  : noeud en `default`, rien en `live` -> page publiable

Map defaultUuids = [:]
Map liveUuids = [:]

if (VERIFY_UUID && !DRY_RUN && !touched.empty) {
    println "\n" + SEP
    println "VERIFICATION - uuid du noeud '${AREA_NAME}' dans les deux workspaces"
    println SEP

    ["default", "live"].each { String ws ->
        JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, ws, Locale.FRENCH) { session ->
            touched.each { String path ->
                try {
                    def page = session.getNode(path)
                    if (page.hasNode(AREA_NAME)) {
                        def h = page.getNode(AREA_NAME)
                        def entry = [uuid: h.getIdentifier(), type: h.getPrimaryNodeTypeName()]
                        if (ws == "default") defaultUuids[path] = entry else liveUuids[path] = entry
                    }
                } catch (Exception ignored) { /* page absente de ce workspace */ }
            }
        }
    }

    int aligned = 0, pending = 0, diverged = 0
    touched.each { String path ->
        def d = defaultUuids[path]
        def l = liveUuids[path]
        if (d && l && d.uuid == l.uuid) {
            aligned++
            println "   [OK]      ${path}  uuid=${d.uuid} [${d.type}]"
        } else if (d && !l) {
            pending++
            println "   [A PUBLIER] ${path}  default=${d.uuid} [${d.type}], rien en live"
        } else if (d && l) {
            diverged++
            println "   [DIVERGENT] ${path}"
            println "               default=${d.uuid} [${d.type}]"
            println "               live   =${l.uuid} [${l.type}]  <-- bloquera la publication"
        } else {
            println "   [?]       ${path} : aucun noeud en default."
        }
    }
    println ""
    println "   alignes: ${aligned}   a publier: ${pending}   divergents: ${diverged}"
    if (diverged > 0) {
        println "   /!\\ Relancer avec CLEAN_LIVE = true, ou passer par"
        println "       settings/groovyScripts/delete-legacy-header-nodes.groovy."
    }
}

// ---- 6. Caches -----------------------------------------------------------

if (!DRY_RUN && !touched.empty) {
    try {
        org.jahia.services.cache.CacheHelper.flushOutputCaches()
        println "\n[OK] Caches de sortie vides."
    } catch (Exception e) {
        println "\n[INFO] Flush des caches a faire manuellement : ${e.message}"
    }
}

// ---- 7. Bilan ------------------------------------------------------------

println "\n" + "=" * 78
println " Termine."
println " CREATE    (noeud ${DRY_RUN ? 'a creer' : 'cree'})        : ${created.size()}"
created.each { println "   - ${it}" }
println " ADD-MIXIN (${DRY_RUN ? 'a ajouter' : 'ajoute'})          : ${mixinAdded.size()}"
mixinAdded.each { println "   - ${it}" }
println " RECREATE  (${DRY_RUN ? 'a recreer' : 'recree'})          : ${recreated.size()}"
recreated.each { println "   - ${it}" }
if (!skipped.empty) {
    println " Pages ignorees   : ${skipped.size()}"
    skipped.each { println "   - ${it}" }
}
if (!failed.empty) {
    println " ECHECS           : ${failed.size()}"
    failed.each { println "   - ${it}" }
}
if (!liveFailed.empty) {
    println " ECHECS nettoyage live (publication encore bloquee) : ${liveFailed.size()}"
    liveFailed.each { println "   - ${it}" }
}
if (!backups.empty) {
    println " Sauvegardes a traiter manuellement (contenu non migre) :"
    backups.each { println "   - ${it}" }
}
if (!lostProps.empty) {
    println " Proprietes non reprises - a ressaisir en edition :"
    lostProps.each { println "   - ${it}" }
}
println ""
if (DRY_RUN) {
    println " DRY_RUN = false pour appliquer reellement."
} else {
    println " PROCHAINES ETAPES :"
    println "   1. ${PUBLISH ? 'Publication deja jouee ci-dessus' : 'Republier les pages traitees depuis jContent (live nettoye, plus de blocage)'}"
    println "   2. Outils -> Caches -> Vider tous"
    println "   3. Rejouer check-header-nodetype.groovy : plus aucun KO-*"
    println "   4. Verifier en live le bandeau d'alerte, le menu et le hero du header"
}
println "=" * 78
