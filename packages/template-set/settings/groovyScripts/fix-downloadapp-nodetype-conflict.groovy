/*
 * fix-downloadapp-nodetype-conflict.groovy
 * ----------------------------------------
 * REPARE le NavMenu devenu illisible apres le refactor du CTA
 * « Telecharger l'app », puis nettoie les mixins/proprietes perimes.
 *
 * Symptome
 * --------
 *   javax.jcr.RepositoryException: Failed to build effective node type for node
 *   /sites/sofinco/menu/menu
 *   Caused by: NodeTypeConflictException: The property definition for
 *   '{}downloadAppLabel' in node type '{...mix/1.0}downloadApp' conflicts with
 *   node type '{...mix/1.0}downloadAppExternal': ambiguous property definition
 *
 * Cause
 * -----
 * `downloadAppLabel` a migre des mixins fieldset vers `sofmix:downloadApp`, et
 * `sofmix:downloadAppInternal` / `sofmix:downloadAppExternal` ont ete retires du
 * CND. Or :
 *   - retirer un type du CND ne le retire PAS du registry Jackrabbit : les deux
 *     mixins y restent enregistres, avec leur ancienne `downloadAppLabel` ;
 *   - le nom du mixin reste dans `jcr:mixinTypes` des noeuds existants.
 * Le noeud declare donc a la fois `sofmix:downloadApp` (via `sofnt:navMenu`) et
 * `sofmix:downloadAppExternal`, deux types SANS lien de sous-typage qui
 * declarent la meme propriete -> Jackrabbit refuse de fusionner leurs types
 * effectifs -> plus AUCUNE lecture du noeud n'est possible.
 *
 * Pourquoi `remove-downloadapp-link-mixins.groovy` ne suffit pas
 * -------------------------------------------------------------
 * Il attaque la DONNEE en premier, ce qui est impossible ici : dans Jackrabbit,
 * `ItemManager.itemExists()` resout la definition de la propriete, donc
 * construit le type effectif. `hasProperty()`, `getProperty()`, `isNodeType()`
 * et `removeMixin()` echouent tous sur ce noeud. Il faut reparer la DEFINITION
 * avant de pouvoir toucher a la donnee.
 *
 * Ce que fait ce script
 * ---------------------
 *   ETAPE 1 - registry Jackrabbit (global au repository, persiste dans
 *             custom_nodetypes) : reenregistre les types perimes AMPUTES des
 *             proprietes desormais portees par `sofmix:downloadApp`. Plus
 *             d'ambiguite -> le noeud redevient lisible. Le CND ne reecrasera
 *             pas cette correction puisque ces types n'y figurent plus.
 *   ETAPE 2 - noeuds (workspaces `default` ET `live`) : retire les mixins et
 *             proprietes perimes, en preservant `downloadAppLabel`.
 *   ETAPE 3 - optionnelle (UNREGISTER) : desenregistre completement les types
 *             perimes du registry Jackrabbit.
 *
 * Ordre d'execution
 * -----------------
 *   1. Deployer le template-set (CND ou `downloadAppLabel` est porte par
 *      `sofmix:downloadApp`)
 *   2. Lancer avec DRY_RUN = true   -> verifier les logs
 *   3. Relancer avec DRY_RUN = false
 *   4. Outils -> Caches -> Vider tous, puis recharger jContent
 *
 * /!\ Les ecritures passent par la session Jackrabbit BRUTE (aucune API Jahia
 * de haut niveau n'est utilisable tant que l'etape 1 n'a pas eu lieu). Les
 * listeners Jahia ne sont donc pas declenches : le flush des caches en fin de
 * script — et le rechargement de jContent — sont obligatoires.
 *
 * Une fois ce script passe, `remove-downloadapp-link-mixins.groovy` devient
 * sans objet (ce script fait son travail en plus de la reparation).
 */

import org.jahia.services.content.JCRTemplate
import org.apache.jackrabbit.spi.commons.name.NameFactoryImpl
import org.apache.jackrabbit.spi.commons.QNodeTypeDefinitionImpl
import org.apache.jackrabbit.spi.QPropertyDefinition
import javax.jcr.query.Query
import java.util.Locale

final boolean DRY_RUN = true

// Etape 3 : ne passer a true qu'apres un run OK sans aucun ECHEC a l'etape 2.
// Une fois la propriete en conflit retiree, laisser ces types enregistres est
// inoffensif ; les desenregistrer alors qu'un noeud non detecte (index perime)
// les reference encore rendrait ce noeud illisible a son tour.
final boolean UNREGISTER = false

// Namespace des mixins Sofinco (cf. settings/definitions.cnd).
final String NS = "http://www.sofinco.fr/jahia/mix/1.0"

// Types perimes, retires du CND mais toujours dans le registry Jackrabbit.
final List<String> STALE_LOCAL = ["downloadAppExternal", "downloadAppInternal"]

// Type survivant, qui porte desormais `downloadAppLabel`.
final String BASE_LOCAL = "downloadApp"

final String KEEP = "downloadAppLabel"

// Proprietes supprimees du CND, a purger des noeuds. Celles declarees par les
// mixins perimes partent avec `removeMixin`, mais une valeur orpheline peut
// subsister (ex. `downloadAppLinkType`, portee par `sofmix:downloadApp`).
final List<String> OBSOLETE_PROPS = [
        "downloadAppLinkType",
        "downloadAppInternalNode",
        "downloadAppExternalUrl",
        "downloadAppTarget",
]

// Chemins connus, joues meme si l'index ne les remonte pas.
final List<String> SEED_PATHS = ["/sites/sofinco/menu/menu"]

// `default` = espace d'edition, `live` = contenu publie. Les deux portent le
// mixin perime : un noeud casse en live casse le rendu du header publie.
final List<String> WORKSPACES = ["default", "live"]

final NameFactoryImpl NAME_FACTORY = NameFactoryImpl.instance
def qname = { String local -> NAME_FACTORY.create(NS, local) }

// La session Jahia n'expose pas le registry Jackrabbit : on descend au provider.
def rawSession = { session -> session.getProviderSession(session.getNode("/").provider) }

println "=" * 70
println " NavMenu - reparation du conflit '${KEEP}'"
println " Mode       : ${DRY_RUN ? 'DRY RUN (aucune ecriture)' : 'APPLY (ecritures reelles)'}"
println " Types      : ${STALE_LOCAL.collect { "sofmix:${it}" }.join(', ')}"
println " Preserve   : ${KEEP}"
println " Workspaces : ${WORKSPACES.join(', ')}"
println " Etape 3    : ${UNREGISTER ? 'desenregistrement ACTIF' : 'desenregistrement desactive'}"
println "=" * 70

List<String> repairedTypes = []
int totalNodes = 0
int totalMixins = 0
int totalProps = 0
List<String> lostLabels = []

// ===== ETAPE 1 - registry Jackrabbit (global au repository) =================

println "\n### ETAPE 1 - types perimes dans le registry Jackrabbit"

JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, "default", Locale.FRENCH) { session ->

    def ntReg = rawSession(session).workspace.nodeTypeManager.nodeTypeRegistry

    // Proprietes desormais portees par `sofmix:downloadApp` : ce sont
    // exactement celles a amputer des types perimes pour lever l'ambiguite.
    Set<String> owned = new LinkedHashSet<String>()
    try {
        ntReg.getNodeTypeDef(qname(BASE_LOCAL)).propertyDefs.each { owned << it.name.localName }
    } catch (Exception e) {
        println "   [WARN] sofmix:${BASE_LOCAL} introuvable dans Jackrabbit : ${e.message}"
    }
    if (owned.empty) owned << KEEP
    println "   Portees par sofmix:${BASE_LOCAL} : ${owned.join(', ')}"

    STALE_LOCAL.each { local ->

        def name = qname(local)
        if (!ntReg.isRegistered(name)) {
            println "   [OK]   sofmix:${local} : absent du registry, rien a faire."
            return
        }

        def typeDef = ntReg.getNodeTypeDef(name)
        List all = typeDef.propertyDefs.toList()
        List kept = all.findAll { !owned.contains(it.name.localName) }
        List dropped = all.findAll { owned.contains(it.name.localName) }.collect { it.name.localName }

        if (dropped.empty) {
            println "   [OK]   sofmix:${local} : aucune propriete en conflit."
            return
        }

        println "   [${DRY_RUN ? 'WOULD' : 'DO'}] sofmix:${local} : retrait de ${dropped.join(', ')}"
        if (DRY_RUN) {
            repairedTypes << "sofmix:${local}"
            return
        }

        try {
            // Redefinition a l'identique, moins les proprietes en conflit.
            def newDef = new QNodeTypeDefinitionImpl(
                    typeDef.name,
                    typeDef.supertypes,
                    typeDef.supportedMixinTypes,
                    typeDef.isMixin(),
                    typeDef.isAbstract(),
                    typeDef.isQueryable(),
                    typeDef.hasOrderableChildNodes(),
                    typeDef.primaryItemName,
                    kept as QPropertyDefinition[],
                    typeDef.childNodeDefs)
            ntReg.reregisterNodeType(newDef)
            repairedTypes << "sofmix:${local}"
            println "          [OK] type reenregistre."
        } catch (Exception e) {
            // Plan B si Jackrabbit refuse la modification : remettre
            // temporairement les deux mixins dans le CND du NavMenu SANS
            // `downloadAppLabel`, deployer, relancer ce script, puis les
            // retirer du CND et redeployer.
            println "          ECHEC reregisterNodeType : ${e.class.simpleName} - ${e.message}"
        }
    }
}

// ===== ETAPE 2 - nettoyage des noeuds ======================================

println "\n### ETAPE 2 - nettoyage des noeuds"

WORKSPACES.each { workspace ->

    println "\n--- Workspace '${workspace}' ---"

    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, workspace, Locale.FRENCH) { session ->

        // Tout passe par la session Jackrabbit : le registry Jahia ignore les
        // types perimes ("Unknown type") et ses wrappers rappellent isNodeType().
        def jr = rawSession(session)

        Set<String> paths = new LinkedHashSet<String>(SEED_PATHS)
        (STALE_LOCAL.collect { "sofmix:${it}" } + ["sofnt:navMenu"]).each { type ->
            try {
                jr.workspace.queryManager
                        .createQuery("SELECT * FROM [${type}]", Query.JCR_SQL2)
                        .execute().nodes.each { n ->
                            try { paths << n.path } catch (Exception ignored) { /* noeud illisible */ }
                        }
            } catch (Exception e) {
                println "   [INFO] requete [${type}] ignoree : ${e.message}"
            }
        }
        println "   ${paths.size()} chemin(s) candidat(s)."

        paths.each { path ->

            def node
            try {
                node = jr.getNode(path)
            } catch (Exception e) {
                println "   [SKIP] ${path} : ${e.message}"
                return
            }

            List<String> mixins = []
            try {
                if (node.hasProperty("jcr:mixinTypes")) {
                    mixins = node.getProperty("jcr:mixinTypes").values.collect { it.string }
                }
            } catch (Exception e) {
                // Symptome typique d'une etape 1 qui n'a pas abouti.
                println "   [SKIP] ${path} jcr:mixinTypes illisible : ${e.message}"
                return
            }

            List<String> toRemove = STALE_LOCAL.collect { "sofmix:${it}" }.findAll { mixins.contains(it) }
            List<String> propsPresent = OBSOLETE_PROPS.findAll {
                try { node.hasProperty(it) } catch (Exception ignored) { false }
            }
            if (toRemove.empty && propsPresent.empty) return

            // Releve du libelle AVANT toute suppression : `removeMixin` emporte
            // les proprietes que le mixin declarait encore.
            String label = null
            try {
                if (node.hasProperty(KEEP)) label = node.getProperty(KEEP).string
            } catch (Exception ignored) { /* rien a preserver */ }

            totalNodes++
            println "   [${DRY_RUN ? 'WOULD' : 'DO'}] ${path}"
            if (label != null) println "        ${KEEP} = \"${label}\" (a preserver)"
            toRemove.each { println "        mixin     ${it}" }
            propsPresent.each { prop ->
                def value = "(illisible)"
                try { value = node.getProperty(prop).string } catch (Exception ignored) { }
                println "        propriete ${prop} = \"${value}\""
            }

            if (DRY_RUN) {
                totalMixins += toRemove.size()
                totalProps += propsPresent.size()
                return
            }

            // Un noeud versionne refuse toute ecriture sans checkout prealable.
            // `isCheckedOut()` renvoie true sur un noeud non versionable : pas
            // besoin d'un isNodeType("mix:versionable") qui reconstruirait le
            // type effectif.
            try {
                if (!node.isCheckedOut()) jr.workspace.versionManager.checkout(path)
            } catch (Exception ignored) { /* non versionable */ }

            propsPresent.each { prop ->
                try {
                    node.getProperty(prop).remove()
                    totalProps++
                } catch (Exception e) {
                    println "        ECHEC propriete ${prop} : ${e.message}"
                }
            }

            toRemove.each { mixin ->
                try {
                    node.removeMixin(mixin)
                    totalMixins++
                } catch (Exception e) {
                    println "        ECHEC mixin ${mixin} : ${e.message}"
                }
            }

            // Filet de securite : `downloadAppLabel` doit rester couvert par
            // `sofmix:downloadApp`. Si elle a malgre tout disparu, on la repose.
            if (label != null && !node.hasProperty(KEEP)) {
                try {
                    node.setProperty(KEEP, label)
                    println "        [OK] ${KEEP} repose."
                } catch (Exception e) {
                    println "        PERDU ${KEEP} = \"${label}\" : ${e.message}"
                    lostLabels << "${workspace} ${path} -> \"${label}\""
                }
            }

            try {
                jr.save()
            } catch (Exception e) {
                println "        ECHEC save : ${e.message}"
            }
        }
    }
}

// ===== ETAPE 3 - desenregistrement (optionnel) =============================

if (UNREGISTER && !DRY_RUN) {
    println "\n### ETAPE 3 - desenregistrement des types perimes"
    JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, "default", Locale.FRENCH) { session ->
        def ntReg = rawSession(session).workspace.nodeTypeManager.nodeTypeRegistry
        STALE_LOCAL.each { local ->
            try {
                if (ntReg.isRegistered(qname(local))) {
                    ntReg.unregisterNodeType(qname(local))
                    println "   [OK] sofmix:${local} desenregistre."
                }
            } catch (Exception e) {
                println "   [INFO] sofmix:${local} conserve (encore reference ?) : ${e.message}"
            }
        }
    }
}

// ===== Bilan ===============================================================

if (!DRY_RUN) {
    try {
        org.jahia.services.cache.CacheHelper.flushOutputCaches()
        println "\n[OK] Caches de sortie vides."
    } catch (Exception e) {
        println "\n[INFO] Flush des caches a faire manuellement : ${e.message}"
    }
}

println "\n" + "=" * 70
println " Termine."
println " Types ${DRY_RUN ? 'a reparer' : 'repares'}      : ${repairedTypes.unique().join(', ') ?: '(aucun)'}"
println " Noeuds concernes       : ${totalNodes}"
println " Mixins ${DRY_RUN ? 'a supprimer' : 'supprimes'}    : ${totalMixins}"
println " Proprietes ${DRY_RUN ? 'a supprimer' : 'supprimees'} : ${totalProps}"
if (!lostLabels.empty) {
    println ""
    println " /!\\ LIBELLES PERDUS - a ressaisir en edition :"
    lostLabels.each { println "   - ${it}" }
}
println ""
if (DRY_RUN) {
    println " DRY_RUN = false pour appliquer reellement."
} else {
    println " PROCHAINES ETAPES :"
    println "   1. Outils -> Caches -> Vider tous"
    println "   2. Recharger jContent et ouvrir le NavMenu en edition"
    println "   3. Verifier le bouton 'Telecharger l'app' du menu mobile en live"
}
println "=" * 70
