/*
 * migrate-simulation-params-to-page.groovy
 * ----------------------------------------
 * ADDITIF ET IDEMPOTENT — remonte les parametres de simulation portes par les
 * noeuds `sofnt:representativeExample` vers le mixin de page
 * `sofmix:simulationParams` (onglet Options de la page).
 *
 * Contexte
 * --------
 * Un exemple representatif decrit UNE OFFRE SUR UNE PAGE, pas un bloc. Les
 * parametres remontent donc au noeud page, ce qui rend la regle « un seul
 * exemple representatif par page » structurelle, et rend les valeurs
 * consommables par TOUS les composants de la page (CTA simulateur, variables
 * `{{taea}}` des mentions d'assurance) et non par le seul bloc qui les portait.
 *
 * Correspondance des proprietes
 * -----------------------------
 *   sofnt:representativeExample   ->   sofmix:simulationParams (sur jnt:page)
 *   ---------------------------        ---------------------------------------
 *   product     (sofmix:simulatorCta)  simProduct
 *   sourceId    (sofmix:simulatorCta)  simSourceId
 *   amount      (natif)                simAmount
 *   dueNumber   (natif)                simDuration
 *   scaleCode   (natif)                simScaleCode
 *
 * Le prefixe `sim*` est obligatoire cote page : jnt:page accumule les mixins de
 * plusieurs modules (spmix:seoPageOptions, spmix:eaPageOptions,
 * sofmix:breadcrumbOptions...) et un nom court y entrerait en collision.
 *
 * CE QUE FAIT LE SCRIPT
 * ---------------------
 *   1. copie les parametres du composant vers le mixin de la page ;
 *   2. EFFACE ensuite `amount`, `dueNumber`, `scaleCode`, `product` et `sourceId`
 *      du composant.
 *
 * ORDRE D'EXECUTION IMPERATIF
 * ---------------------------
 *   1. Avec la version du module qui DECLARE ENCORE ces proprietes :
 *      lancer avec DRY_RUN = true            -> verifier les logs
 *   2. Rejouer sur un DUMP DE PRODUCTION     -> verifier le rapport final
 *   3. Relancer avec DRY_RUN = false         -> ecritures reelles
 *   4. Verifier que le rapport affiche 0 exemple restant avec ces proprietes
 *   5. Outils -> Caches -> Vider tous
 *   6. Verifier en edition : Options de la page -> « Simulation (exemple
 *      representatif) » renseignee, et le bloc affiche « herite de la page »
 *   7. SEULEMENT ENSUITE, deployer la version du module qui retire ces
 *      proprietes du CND
 *
 * /!\ L'INVERSE CASSE LA PUBLICATION. Deployer d'abord le CND allege laisserait
 * les noeuds existants porteurs de proprietes NON DECLAREES : Jahia tolere la
 * lecture, mais leve une ConstraintViolationException a la premiere sauvegarde
 * ou publication. Le contributeur decouvrirait la panne en essayant de publier.
 *
 * PRODUIT NON RENSEIGNE
 * ---------------------
 * `simProduct` n'a volontairement PAS de valeur par defaut : le type de credit
 * determine des chiffres reglementes (TAEG, mensualites, TAEA) et un defaut
 * serait faux la plupart du temps, de facon invisible. Les noeuds dont `product`
 * est vide sont donc migres SANS produit — la simulation reste inactive sur ces
 * pages — et listes en fin de rapport pour ressaisie manuelle.
 *
 * IDEMPOTENCE
 * -----------
 * Une page portant deja `sofmix:simulationParams` avec un `simProduct` renseigne
 * n'est jamais reecrite : le script peut etre relance sans risque, et une
 * correction manuelle faite entre deux passages est preservee.
 */

import org.jahia.services.content.JCRTemplate
import javax.jcr.query.Query
import java.util.Locale

final boolean DRY_RUN = true

// Cle du site cible — meme convention que les autres scripts du dossier.
final String SITE_KEY = "sofinco"
final String SITE_PATH = "/sites/${SITE_KEY}"

final String SOURCE_TYPE = "sofnt:representativeExample"
final String TARGET_MIXIN = "sofmix:simulationParams"

// Bornes du CND — une valeur hors bornes ferait echouer le save.
final long AMOUNT_MIN = 150L
final long AMOUNT_MAX = 999999L
final long DURATION_MIN = 1L
final long DURATION_MAX = 120L

// Defauts `autocreated` du CND : inutile de recopier une valeur identique.
final long DEFAULT_AMOUNT = 3000L
final long DEFAULT_DURATION = 36L

final List<String> VALID_PRODUCTS = ["PB", "CR", "RAC"]

// `default` = espace d'edition, `live` = contenu publie. Les deux doivent etre
// migres : une page live sans le mixin perdrait sa simulation jusqu'a la
// prochaine publication.
final List<String> WORKSPACES = ["default", "live"]

println "=" * 72
println " Migration des parametres de simulation vers le mixin de page"
println " Mode      : ${DRY_RUN ? 'DRY RUN (aucune ecriture)' : 'APPLY (ecritures reelles)'}"
println " Site      : ${SITE_PATH}"
println " Source    : ${SOURCE_TYPE}"
println " Cible     : ${TARGET_MIXIN} (sur le jnt:page englobant)"
println " Workspaces: ${WORKSPACES.join(', ')}"
println "=" * 72

int grandTotalExamples = 0
int grandTotalPagesMigrated = 0
int grandTotalPropsCleaned = 0
List<String> pagesWithoutProduct = []
List<String> pagesWithSeveralExamples = []
List<String> orphanExamples = []
List<String> failures = []

WORKSPACES.each { workspace ->

    println "\n--- Workspace '${workspace}' ---"

    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, workspace, Locale.FRENCH) { session ->

        // Perimetre restreint au site cible, comme tous les scripts de ce dossier. Sans le
        // ISDESCENDANTNODE, la requete remonterait aussi les exemples des sites de recette ou de
        // demo presents sur la meme instance — et la migration les modifierait.
        if (!session.nodeExists(SITE_PATH)) {
            println "   [ERREUR] ${SITE_PATH} n'existe pas dans ce workspace. Verifiez la cle du site."
            return
        }

        def examples
        try {
            examples = session.workspace.queryManager
                    .createQuery("SELECT * FROM [${SOURCE_TYPE}] "
                            + "WHERE ISDESCENDANTNODE('${SITE_PATH}')", Query.JCR_SQL2)
                    .execute().nodes.toList()
        } catch (Exception e) {
            println "   [SKIP] Requete impossible sur ${SOURCE_TYPE} : ${e.message}"
            return
        }

        if (examples.empty) {
            println "   [INFO] Aucun noeud ${SOURCE_TYPE} trouve."
            return
        }

        println "   ${examples.size()} noeud(s) ${SOURCE_TYPE} analyse(s)."
        grandTotalExamples += examples.size()

        // Un noeud versionne refuse toute ecriture sans checkout prealable
        // (VersionException). Sans effet sur un noeud non versionable.
        def ensureCheckedOut = { node ->
            try {
                if (node.isNodeType("mix:versionable") && !node.isCheckedOut()) {
                    session.workspace.versionManager.checkout(node.path)
                }
            } catch (Exception ignored) {
                /* non versionable ou registry indisponible : rien a faire */
            }
        }

        def readString = { node, String name ->
            try {
                return node.hasProperty(name) ? node.getProperty(name).string : ""
            } catch (Exception ignored) {
                return ""
            }
        }

        def readLong = { node, String name, long fallback ->
            try {
                return node.hasProperty(name) ? node.getProperty(name).long : fallback
            } catch (Exception ignored) {
                return fallback
            }
        }

        def clamp = { long value, long min, long max -> Math.max(min, Math.min(max, value)) }

        // Remonte au jnt:page englobant.
        def findPage = { node ->
            def current = node
            while (current != null) {
                try {
                    if (current.isNodeType("jnt:page")) return current
                    if (current.path == "/") return null
                    current = current.parent
                } catch (Exception ignored) {
                    return null
                }
            }
            return null
        }

        // Une page peut porter plusieurs exemples (anomalie) : on ne migre que le
        // premier rencontre et on liste les autres pour arbitrage manuel.
        Set<String> pagesSeen = new HashSet<String>()
        int migrated = 0
        int cleaned = 0

        examples.each { example ->

            def examplePath
            try { examplePath = example.path } catch (Exception ignored) { examplePath = "(chemin illisible)" }

            def page = findPage(example)
            if (page == null) {
                orphanExamples << "${workspace}:${examplePath}"
                println "   [WARN] Aucune page englobante pour ${examplePath} — ignore."
                return
            }

            String pagePath = page.path

            if (!pagesSeen.add(pagePath)) {
                pagesWithSeveralExamples << "${workspace}:${pagePath}"
                println "   [WARN] ${pagePath} porte PLUSIEURS exemples representatifs."
                println "          Deja migre depuis un autre bloc — ${examplePath} ignore."
                return
            }

            // Idempotence : une page deja renseignee n'est jamais reecrite.
            boolean alreadyDone = false
            try {
                alreadyDone = page.isNodeType(TARGET_MIXIN) && readString(page, "simProduct") != ""
            } catch (Exception ignored) {
                alreadyDone = false
            }
            if (alreadyDone) {
                println "   [SKIP] ${pagePath} — deja migre (simProduct = \"${readString(page, 'simProduct')}\")."
                return
            }

            String product = readString(example, "product")
            if (product != "" && !VALID_PRODUCTS.contains(product)) {
                println "   [WARN] ${examplePath} — product=\"${product}\" hors choicelist, non repris."
                product = ""
            }

            String sourceId = readString(example, "sourceId")
            String scaleCode = readString(example, "scaleCode")
            long amount = clamp(readLong(example, "amount", DEFAULT_AMOUNT), AMOUNT_MIN, AMOUNT_MAX)
            long duration = clamp(readLong(example, "dueNumber", DEFAULT_DURATION), DURATION_MIN, DURATION_MAX)

            /*
             * PARAMETRES INCOMPLETS -> ON N'AJOUTE PAS LE MIXIN.
             *
             * Le mixin signifie « cette page a une simulation ». Sans type de credit ni sourceId,
             * elle n'en a pas : la poser quand meme publierait une page portant le marqueur d'une
             * simulation qui ne peut pas s'executer. Le panneau d'audit la signalerait en edition,
             * mais en live elle rendrait ses jetons bruts, sans erreur — le pire des deux mondes.
             *
             * Ces pages sont listees en fin de rapport : le contributeur activera l'option
             * lui-meme et saisira les deux champs d'un coup. Les autres parametres (montant,
             * duree, bareme) n'ont aucun sens sans produit, il n'y a donc rien a preserver.
             */
            if (product == "" || sourceId == "") {
                pagesWithoutProduct << "${workspace}:${pagePath}"
                println "   [SKIP] ${pagePath} — ${product == '' ? 'type de credit' : 'sourceId'} absent sur ${examplePath}"
                println "          mixin NON pose : a activer manuellement depuis les Options de la page."
                return
            }

            println "   [${DRY_RUN ? 'WOULD' : 'DO'}] ${pagePath}"
            println "        depuis      ${examplePath}"
            println "        simProduct  ${product}"
            println "        simSourceId ${sourceId}"
            println "        simAmount   ${amount}"
            println "        simDuration ${duration}"
            println "        simScaleCode ${scaleCode == '' ? '(vide)' : scaleCode}"

            if (DRY_RUN) {
                migrated++
                return
            }

            try {
                ensureCheckedOut(page)
                if (!page.isNodeType(TARGET_MIXIN)) page.addMixin(TARGET_MIXIN)

                // Produit et sourceId sont garantis non vides ici (cf. le garde ci-dessus) :
                // c'est ce qui permet au save de passer le validateur de completude.
                page.setProperty("simProduct", product)
                page.setProperty("simSourceId", sourceId)
                if (scaleCode != "") page.setProperty("simScaleCode", scaleCode)
                page.setProperty("simAmount", amount)
                page.setProperty("simDuration", duration)

                /*
                 * NETTOYAGE DU COMPOSANT — indispensable, pas cosmetique.
                 *
                 * `amount`, `dueNumber` et `scaleCode` disparaissent de la definition de
                 * `sofnt:representativeExample`. Un noeud qui les porterait encore aurait des
                 * proprietes NON DECLAREES : Jahia tolere la lecture, mais leve une
                 * ConstraintViolationException a la premiere sauvegarde ou publication du noeud.
                 * Le contributeur decouvrirait la panne en essayant de publier.
                 *
                 * `product` et `sourceId` restent DECLARES (mixin sofmix:simulatorCta, partage par
                 * six types) : on les efface quand meme pour que le CTA lise la page comme le
                 * tableau, au lieu de garder une valeur qui pourrait diverger des Options.
                 */
                ensureCheckedOut(example)
                ["amount", "dueNumber", "scaleCode", "product", "sourceId"].each { prop ->
                    if (example.hasProperty(prop)) {
                        example.getProperty(prop).remove()
                        cleaned++
                    }
                }

                session.save()
                migrated++
            } catch (Exception e) {
                // Un echec ne doit pas interrompre le lot : on journalise et on
                // continue, le rapport final liste ce qui reste a traiter.
                failures << "${workspace}:${pagePath} — ${e.message}"
                println "   [FAIL] ${pagePath} : ${e.message}"
                try { session.refresh(false) } catch (Exception ignored) { }
            }
        }

        grandTotalPagesMigrated += migrated
        grandTotalPropsCleaned += cleaned
        println "   -> ${migrated} page(s) ${DRY_RUN ? 'a migrer' : 'migrees'} dans '${workspace}'."
    }
}

println "\n" + "=" * 72
println " RAPPORT"
println "=" * 72
println " Exemples analyses        : ${grandTotalExamples}"
println " Pages ${DRY_RUN ? 'a migrer' : 'migrees'}           : ${grandTotalPagesMigrated}"
println " Proprietes nettoyees     : ${grandTotalPropsCleaned} (amount, dueNumber, scaleCode, product, sourceId)"

if (!pagesWithoutProduct.empty) {
    println "\n [A RESSAISIR] ${pagesWithoutProduct.size()} page(s) aux parametres incomplets."
    println " Le mixin n'a PAS ete pose : type de credit ou sourceId manquant sur l'exemple"
    println " d'origine. La simulation est inactive sur ces pages tant qu'un contributeur"
    println " n'active pas l'option et ne saisit pas les deux champs"
    println " (Options de la page -> Simulation (exemple representatif))."
    pagesWithoutProduct.unique().each { println "   - ${it}" }
}

if (!pagesWithSeveralExamples.empty) {
    println "\n [ANOMALIE] ${pagesWithSeveralExamples.size()} page(s) portant plusieurs exemples."
    println " Un seul exemple par page est desormais la regle. Seul le premier a ete"
    println " repris : verifier et supprimer les blocs surnumeraires."
    pagesWithSeveralExamples.unique().each { println "   - ${it}" }
}

if (!orphanExamples.empty) {
    println "\n [ANOMALIE] ${orphanExamples.size()} exemple(s) sans page englobante."
    orphanExamples.each { println "   - ${it}" }
}

if (!failures.empty) {
    println "\n [ECHECS] ${failures.size()} page(s) non migree(s) :"
    failures.each { println "   - ${it}" }
}

println "\n " + (DRY_RUN
        ? "DRY RUN — aucune ecriture. Passer DRY_RUN = false pour appliquer."
        : "Termine. Vider les caches, puis verifier en edition avant de livrer le retrait des proprietes du composant.")
println "=" * 72
