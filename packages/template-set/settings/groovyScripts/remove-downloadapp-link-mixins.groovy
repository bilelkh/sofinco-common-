/*
 * remove-downloadapp-link-mixins.groovy
 * ------------------------------------
 * NON DESTRUCTIF pour la contribution utile — nettoie sur les noeuds
 * `sofnt:navMenu` les mixins et proprietes du CTA « Telecharger l'app » qui ne
 * sont plus declares dans le CND, en PRESERVANT le libelle du bouton
 * (`downloadAppLabel`).
 *
 * Contexte
 * --------
 * Le CTA « Telecharger l'app » ne contribue plus AUCUNE destination : les URLs
 * App Store / Play Store et la page de repli viennent toutes de la config de
 * site `sofnt:qrAppSettings` (noeud `qr-app-settings`). Le CND perd donc :
 *   - les mixins `sofmix:downloadAppInternal` et `sofmix:downloadAppExternal`
 *     (couple interne XOR externe via jmix:dynamicFieldset),
 *   - les proprietes `downloadAppLinkType` (portee par `sofmix:downloadApp`),
 *     `downloadAppInternalNode`, `downloadAppExternalUrl`, `downloadAppTarget`.
 * Seul `downloadAppLabel` survit — il migre des deux mixins fieldset vers
 * `sofmix:downloadApp`, que `sofnt:navMenu` etend toujours. Meme nom, meme type
 * (string, non i18n) : la valeur deja stockee reste valide.
 *
 * Pourquoi ce script est necessaire
 * ---------------------------------
 * Retirer un type du CND ne retire pas son nom de `jcr:mixinTypes` sur les
 * noeuds existants, ni les valeurs deja stockees. Sans nettoyage :
 *   - les noeuds `sofnt:navMenu` de DEV / UAT / PROD referencent des mixins
 *     absents du registry -> erreurs au chargement du noeud et dans
 *     content-editor sur le header,
 *   - les proprietes orphelines polluent les exports et peuvent faire echouer
 *     un futur enregistrement de CND.
 *
 * Ordre d'execution imperatif
 * ---------------------------
 *   1. Deployer le template-set (CND ou `downloadAppLabel` est porte par
 *      `sofmix:downloadApp`)   <-- A FAIRE EN PREMIER, contrairement a
 *      remove-hero-imageAlt.groovy
 *   2. Lancer ce script avec DRY_RUN = true  -> verifier les logs
 *   3. Relancer avec DRY_RUN = false         -> ecritures reelles
 *   4. Outils -> Caches -> Vider tous
 *   5. Verifier en edition que le NavMenu n'expose plus que « Texte du bouton »
 *
 * /!\ POURQUOI LE CND D'ABORD /!\
 * `removeMixin("sofmix:downloadAppInternal")` supprime au passage les
 * proprietes que ce mixin definissait — dont `downloadAppLabel`. Si le nouveau
 * CND est deja deploye, `downloadAppLabel` reste couvert par
 * `sofmix:downloadApp` et survit a la suppression. Sinon il serait perdu : le
 * script releve donc la valeur AVANT et la repose APRES en filet de securite,
 * en journalisant l'echec eventuel pour permettre une ressaisie manuelle.
 *
 * `isNodeType()` / `getMixinNodeTypes()` interrogent le registry et levent une
 * NoSuchNodeTypeException sur un type desenregistre : on lit donc `jcr:mixinTypes`
 * comme de simples chaines.
 */

import org.jahia.services.content.JCRTemplate
import javax.jcr.query.Query
import java.util.Locale

final boolean DRY_RUN = true

final String NODE_TYPE = "sofnt:navMenu"
final String KEEP_PROPERTY = "downloadAppLabel"

// Mixins fieldset supprimes du CND.
final List<String> OBSOLETE_MIXINS = [
        "sofmix:downloadAppInternal",
        "sofmix:downloadAppExternal",
]

// Proprietes supprimees du CND. `downloadAppLinkType` etait portee par
// `sofmix:downloadApp` lui-meme (le discriminant du dynamicFieldset), les
// autres par les deux mixins ci-dessus — on les retire explicitement au cas ou
// une valeur orpheline subsisterait apres le removeMixin.
final List<String> OBSOLETE_PROPERTIES = [
        "downloadAppLinkType",
        "downloadAppInternalNode",
        "downloadAppExternalUrl",
        "downloadAppTarget",
]

// `default` = espace d'edition, `live` = contenu publie.
// Les deux doivent etre nettoyes : un mixin orphelin reste en live casserait le
// rendu du header publie.
final List<String> WORKSPACES = ["default", "live"]

println "=" * 60
println " NavMenu - nettoyage des mixins/proprietes 'Telecharger l'app'"
println " Mode      : ${DRY_RUN ? 'DRY RUN (aucune ecriture)' : 'APPLY (ecritures reelles)'}"
println " Type      : ${NODE_TYPE}"
println " Mixins    : ${OBSOLETE_MIXINS.join(', ')}"
println " Proprietes: ${OBSOLETE_PROPERTIES.join(', ')}"
println " Preserve  : ${KEEP_PROPERTY}"
println " Workspaces: ${WORKSPACES.join(', ')}"
println "=" * 60

int grandTotalNodes = 0
int grandTotalMixins = 0
int grandTotalProps = 0
List<String> lostLabels = []

WORKSPACES.each { workspace ->

    println "\n--- Workspace '${workspace}' ---"

    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, workspace, Locale.FRENCH) { session ->

        def nodes
        try {
            nodes = session.workspace.queryManager
                    .createQuery("SELECT * FROM [${NODE_TYPE}]", Query.JCR_SQL2)
                    .execute().nodes.toList()
        } catch (Exception e) {
            println "   [SKIP] Requete impossible sur ${NODE_TYPE} : ${e.message}"
            return
        }

        if (nodes.empty) {
            println "   [INFO] Aucun noeud ${NODE_TYPE} trouve."
            return
        }

        println "   ${nodes.size()} noeud(s) ${NODE_TYPE} analyse(s)."

        int touched = 0
        int mixinsRemoved = 0
        int propsRemoved = 0

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

        nodes.each { navMenu ->

            def path
            try { path = navMenu.path } catch (Exception ignored) { path = "(chemin illisible)" }

            // Lecture des mixins comme chaines : `getMixinNodeTypes()` resout
            // chaque nom dans le registry et echouerait sur un type desenregistre.
            List<String> mixinNames = []
            try {
                if (navMenu.hasProperty("jcr:mixinTypes")) {
                    mixinNames = navMenu.getProperty("jcr:mixinTypes").values.collect { it.string }
                }
            } catch (Exception e) {
                println "   [SKIP] jcr:mixinTypes illisible sur ${path} : ${e.message}"
                return
            }

            List<String> toRemove = OBSOLETE_MIXINS.findAll { mixinNames.contains(it) }
            List<String> propsPresent = OBSOLETE_PROPERTIES.findAll { navMenu.hasProperty(it) }

            if (toRemove.empty && propsPresent.empty) return

            touched++

            // Releve du libelle AVANT toute suppression : `removeMixin` emporte
            // les proprietes que le mixin definissait.
            String keptLabel = null
            try {
                if (navMenu.hasProperty(KEEP_PROPERTY)) {
                    keptLabel = navMenu.getProperty(KEEP_PROPERTY).string
                }
            } catch (Exception ignored) {
                /* propriete illisible : on n'a rien a preserver */
            }

            println "   [${DRY_RUN ? 'WOULD' : 'DO'}] ${path}"
            if (keptLabel != null) println "        ${KEEP_PROPERTY} = \"${keptLabel}\" (a preserver)"
            toRemove.each { println "        mixin      ${it}" }
            propsPresent.each { prop ->
                def value = "(illisible)"
                try { value = navMenu.getProperty(prop).string } catch (Exception ignored) { }
                println "        propriete  ${prop} = \"${value}\""
            }

            if (DRY_RUN) {
                mixinsRemoved += toRemove.size()
                propsRemoved += propsPresent.size()
                return
            }

            ensureCheckedOut(navMenu)

            propsPresent.each { prop ->
                try {
                    navMenu.getProperty(prop).remove()
                    propsRemoved++
                } catch (Exception e) {
                    println "        ECHEC propriete ${prop} : ${e.message}"
                }
            }

            toRemove.each { mixin ->
                try {
                    navMenu.removeMixin(mixin)
                    mixinsRemoved++
                } catch (Exception e) {
                    // Cas typique : le type a deja ete desenregistre du registry,
                    // `removeMixin` ne sait plus le resoudre. Le nom reste alors
                    // dans jcr:mixinTypes -> a traiter via un export/import du
                    // noeud, ou en redeployant temporairement le CND precedent.
                    println "        ECHEC mixin ${mixin} : ${e.message}"
                }
            }

            // Filet de securite : si le libelle a disparu avec le mixin (CND non
            // encore deploye), on le repose. Echoue tant que `sofmix:downloadApp`
            // ne declare pas `downloadAppLabel` -> on journalise pour ressaisie.
            if (keptLabel != null && !navMenu.hasProperty(KEEP_PROPERTY)) {
                try {
                    navMenu.setProperty(KEEP_PROPERTY, keptLabel)
                    println "        [OK] ${KEEP_PROPERTY} repose."
                } catch (Exception e) {
                    println "        PERDU ${KEEP_PROPERTY} = \"${keptLabel}\" : ${e.message}"
                    lostLabels << "${workspace} ${path} -> \"${keptLabel}\""
                }
            }
        }

        if (touched == 0) {
            println "   [OK] Aucun noeud ne porte encore ces mixins/proprietes."
        } else if (!DRY_RUN) {
            session.save()
            println "   [OK] ${touched} noeud(s) nettoye(s) et persiste(s) " +
                    "(${mixinsRemoved} mixin(s), ${propsRemoved} propriete(s))."
        } else {
            println "   [DRY RUN] ${touched} noeud(s) seraient nettoye(s) " +
                    "(${mixinsRemoved} mixin(s), ${propsRemoved} propriete(s)) - pas de save()."
        }

        grandTotalNodes += touched
        grandTotalMixins += mixinsRemoved
        grandTotalProps += propsRemoved
    }
}

println "\n" + "=" * 60
println " Termine."
println " Noeuds ${NODE_TYPE} concernes : ${grandTotalNodes}"
println " Mixins    ${DRY_RUN ? 'a supprimer' : 'supprimes'} : ${grandTotalMixins}"
println " Proprietes ${DRY_RUN ? 'a supprimer' : 'supprimees'} : ${grandTotalProps}"
if (!lostLabels.empty) {
    println ""
    println " /!\\ LIBELLES PERDUS - a ressaisir en edition :"
    lostLabels.each { println "   - ${it}" }
}
if (!DRY_RUN) {
    println ""
    println " PROCHAINES ETAPES :"
    println "   1. Outils -> Caches -> Vider tous"
    println "   2. Verifier en edition que le NavMenu n'expose plus que 'Texte du bouton'"
    println "   3. Verifier le bouton 'Telecharger l'app' du menu mobile en live"
} else {
    println ""
    println " DRY_RUN = false pour appliquer reellement."
}
println "=" * 60
