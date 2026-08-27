/*
 * remove-hero-imageAlt.groovy
 * ---------------------------
 * NON DESTRUCTIF — supprime UNIQUEMENT la propriete `imageAlt` portee par le
 * mixin `sofmix:heroImage` sur les noeuds `sofnt:hero`. Toute la contribution
 * existante est conservee (titre, sous-titre, images, offre, CTA, arguments).
 *
 * Contexte
 * --------
 * Le visuel hero est un fond full-bleed decoratif : le `<picture>` est rendu
 * `aria-hidden="true"` avec `alt=""`, le message etant deja porte par le <h1>
 * et le sous-titre. Un texte alternatif contribue n'y serait jamais annonce.
 * `imageAlt` est donc retire du CND et le hero est decoratif par contrat.
 *
 * Pourquoi ce script est necessaire
 * ---------------------------------
 * Retirer une propriete du CND ne supprime pas les valeurs deja stockees en JCR.
 * Ces valeurs orphelines peuvent :
 *   - faire echouer l'enregistrement du nouveau CND au redeploiement,
 *   - rester indefiniment en base et polluer les exports.
 * On nettoie donc AVANT de deployer le CND sans `imageAlt`.
 *
 * /!\ DIFFERENCE MAJEURE avec remove-appShowcase-desktopImage.groovy /!\
 * `imageAlt` est declare `i18n` : la valeur n'est PAS portee par le noeud
 * `sofnt:hero` lui-meme mais par ses enfants `j:translation_<lang>` de type
 * `jnt:translation`, une par langue contribuee. Un `heroNode.hasProperty(...)`
 * renverrait donc systematiquement false et le script conclurait a tort qu'il
 * n'y a rien a nettoyer. On traverse les translations, pas le noeud parent.
 * (Le noeud parent est tout de meme inspecte en filet de securite, au cas ou
 * une valeur non localisee y trainerait — import historique, contribution
 * anterieure au passage en i18n.)
 *
 * Ordre d'execution imperatif
 * ---------------------------
 *   1. Lancer ce script avec DRY_RUN = true  -> verifier les logs
 *   2. Relancer avec DRY_RUN = false         -> suppression reelle
 *   3. Outils -> Caches -> Vider tous
 *   4. Deployer le template-set (CND sans `imageAlt`)
 *
 * Si le CND est deploye AVANT ce script, la propriete devient invisible du
 * registry et le script ne pourra plus la cibler proprement.
 */

import org.jahia.services.content.JCRTemplate
import javax.jcr.query.Query
import java.util.Locale

final boolean DRY_RUN = true

final String NODE_TYPE     = "sofnt:hero"
final String PROPERTY      = "imageAlt"
final String TRANSLATION_NT = "jnt:translation"

// `default` = espace d'edition, `live` = contenu publie.
// Les deux doivent etre nettoyes : une propriete orpheline restee en live
// bloquerait le redeploiement du CND.
final List<String> WORKSPACES = ["default", "live"]

println "=" * 60
println " Hero - suppression de la propriete i18n '${PROPERTY}'"
println " Mode      : ${DRY_RUN ? 'DRY RUN (aucune ecriture)' : 'APPLY (ecritures reelles)'}"
println " Type      : ${NODE_TYPE} (via translations ${TRANSLATION_NT})"
println " Workspaces: ${WORKSPACES.join(', ')}"
println "=" * 60

int grandTotalFound = 0
int grandTotalRemoved = 0

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

        int found = 0
        int removed = 0

        // Retire PROPERTY du noeud passe (translation ou hero) et journalise
        // l'ancienne valeur, indispensable pour reconstituer la contribution
        // en cas de rollback.
        def purge = { holder, String heroPath, String label ->

            if (!holder.hasProperty(PROPERTY)) return 0

            def oldValue = "(illisible)"
            try {
                oldValue = holder.getProperty(PROPERTY).string
            } catch (Exception e) {
                oldValue = "(lecture impossible : ${e.message})"
            }

            println "   [${DRY_RUN ? 'WOULD' : 'DO'}] ${heroPath}"
            println "        ${label} ${PROPERTY} = \"${oldValue}\""

            if (DRY_RUN) return 0

            try {
                // checkout obligatoire si le noeud est versionne, sinon
                // remove() leve une VersionException. Sur une propriete i18n
                // c'est le noeud de contenu parent qui porte mix:versionable,
                // pas la translation : on checkout les deux par securite.
                [holder, holder.parent].each { target ->
                    try {
                        if (target.isNodeType("mix:versionable") && !target.isCheckedOut()) {
                            session.workspace.versionManager.checkout(target.path)
                        }
                    } catch (Exception ignored) {
                        /* noeud non versionable ou parent inaccessible : rien a faire */
                    }
                }
                holder.getProperty(PROPERTY).remove()
                return 1
            } catch (Exception e) {
                println "        ECHEC : ${e.message}"
                return 0
            }
        }

        nodes.each { heroNode ->

            def heroPath
            try { heroPath = heroNode.path } catch (Exception ignored) { heroPath = "(chemin illisible)" }

            // 1. Cas nominal : les translations i18n, une par langue contribuee.
            def children
            try {
                children = heroNode.nodes
            } catch (Exception e) {
                println "   [SKIP] Enfants illisibles sur ${heroPath} : ${e.message}"
                return
            }

            while (children.hasNext()) {
                def child = children.nextNode()

                boolean isTranslation = false
                try { isTranslation = child.isNodeType(TRANSLATION_NT) } catch (Exception ignored) { }
                if (!isTranslation) continue

                if (!child.hasProperty(PROPERTY)) continue

                def lang = "?"
                try { lang = child.getProperty("jcr:language").string } catch (Exception ignored) { }

                found++
                removed += purge(child, heroPath, "[${lang}]")
            }

            // 2. Filet de securite : valeur non localisee restee sur le noeud
            //    de contenu lui-meme (import historique, contribution anterieure
            //    au passage de la propriete en i18n).
            if (heroNode.hasProperty(PROPERTY)) {
                found++
                removed += purge(heroNode, heroPath, "[non-i18n]")
            }
        }

        if (found == 0) {
            println "   [OK] Aucun noeud ne porte encore '${PROPERTY}'."
        } else if (!DRY_RUN) {
            session.save()
            println "   [OK] ${removed}/${found} propriete(s) supprimee(s) et persistee(s)."
        } else {
            println "   [DRY RUN] ${found} propriete(s) seraient supprimee(s) — pas de save()."
        }

        grandTotalFound += found
        grandTotalRemoved += removed
    }
}

println "\n" + "=" * 60
println " Termine."
println " Proprietes '${PROPERTY}' trouvees : ${grandTotalFound}"
if (!DRY_RUN) {
    println " Proprietes supprimees             : ${grandTotalRemoved}"
    println ""
    println " PROCHAINES ETAPES :"
    println "   1. Outils -> Caches -> Vider tous"
    println "   2. Deployer le template-set (CND sans '${PROPERTY}')"
    println "   3. Verifier en edition que le hero n'expose plus de texte alternatif"
} else {
    println ""
    println " DRY_RUN = false pour appliquer reellement."
}
println "=" * 60
