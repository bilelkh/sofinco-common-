/*
 * init-simulator-vars.groovy
 * --------------------------
 * ADDITIF ET IDEMPOTENT — cree la configuration de site
 * `contents/site-settings/simulator-vars` et l'amorce avec les variables de
 * simulation connues, telles que proposees dans le menu « Variables simulateur »
 * de l'editeur de texte.
 *
 * A quoi sert cette config
 * ------------------------
 * Elle pilote la PRESENTATION des variables cote contribution : libelle affiche,
 * aide, ordre, activation. Elle est lue par le plugin CKEditor
 * `sofincoSimulatorVars`, JAMAIS par le rendu serveur — une erreur de
 * contribution ne peut donc degrader que le menu d'edition, jamais la page
 * publiee.
 *
 * `token` est en SAISIE LIBRE
 * ---------------------------
 * La contrainte reelle n'est pas une liste declaree quelque part, c'est « le
 * bridge Java sait-il calculer cette valeur ». `buildInsuranceVarMap`
 * (src/lib/insuranceVars.ts) reprend TOUTES les cles renvoyees par le bridge :
 * ajouter une variable ne demande donc qu'un seul changement, cote Java.
 *
 * Contrepartie : un jeton invente reste affiche brut sur la page. Le filet est
 * le panneau d'audit, qui signale en mode edition tout jeton non resolu.
 * Ce script pose les variables GARANTIES des DEUX familles :
 *   - quinze de SIMULATION : le resultat d'un exemple calcule pour la page ;
 *   - onze de CAMPAGNE     : les bornes de l'offre, qui ne dependent que de la provenance.
 * L'editeur les presente sous DEUX BOUTONS distincts, un par famille.
 *
 * Execution
 * ---------
 *   1. Deployer le template-set qui declare `sofnt:simulatorVarsSettings`
 *   2. Lancer avec DRY_RUN = true   -> verifier les logs
 *   3. Relancer avec DRY_RUN = false
 *   4. Outils -> Caches -> Vider tous
 *   5. Verifier dans un richtext « mention d'assurance » que
 *      les DEUX boutons sont presents : « Variables simulateur » (15 entrees) et
 *      « Variables campagne » (11 entrees)
 *
 * IDEMPOTENCE
 * -----------
 * Une variable deja presente (meme `token`) n'est JAMAIS reecrite : un libelle
 * ajuste par le metier survit a un rejeu du script. Seules les variables
 * manquantes sont creees.
 */

import org.jahia.services.content.JCRTemplate
import java.util.Locale

final boolean DRY_RUN = false

// Cle du site cible — meme convention que les autres scripts d'initialisation du dossier.
final String SITE_KEY = "sofinco"

final String SETTINGS_TYPE = "sofnt:simulatorVarsSettings"
final String VAR_TYPE = "sofnt:simulatorVar"
final String SETTINGS_PARENT = "contents/site-settings"
final String SETTINGS_NAME = "simulator-vars"

// Langue de la session, donc langue dans laquelle les libelles i18n sont ecrits.
// `token` n'est PAS i18n : c'est un identifiant technique, ecrit une seule fois.
final Locale LOCALE = Locale.FRENCH

/*
 * Variables GARANTIES — alignees sur INSURANCE_VAR_TOKENS (src/lib/insuranceVars.ts).
 * L'ordre de cette liste devient l'ordre du menu ; il va du plus utilise au
 * moins utilise dans les mentions d'assurance.
 *
 * SOURCE 100% ASCII, SYMBOLE EURO CONSTRUIT PAR CODE POINT.
 *
 * Ces libelles ne restent pas dans le fichier : ils sont ECRITS en `jcr:title` et deviennent le
 * menu que voit le contributeur. Un caractere non-ASCII ecrit litteralement dependrait ici de
 * deux encodages qui doivent concorder - celui du fichier et celui avec lequel le moteur Groovy
 * le lit au demarrage. Ce script etant execute automatiquement a chaque deploiement, une
 * discordance ne produirait pas une erreur mais un menu durablement illisible, ecrit tel quel
 * dans le depot et propage a toutes les instances.
 *
 * Construire le symbole depuis son code point rend le resultat independant de l'encodage du
 * fichier source. Le reste de la liste est desaccentue pour la meme raison, et les tirets sont
 * des traits d'union ASCII.
 */
final String EUR = new String(Character.toChars(0x20AC))

final List<Map<String, String>> VARS = [
        // --- Communs ---------------------------------------------------------------------
        [token: "exampleAmount",           label: "Montant emprunte - exemple (${EUR})"],
        [token: "dueNumber",               label: "Nombre d'echeances"],
        [token: "dueNumberMinusOne",       label: "Nombre d'echeances moins une (N-1)"],
        // --- Hors assurance : disponibles meme sans assurance facultative -----------------
        [token: "taeg",                    label: "TAEG - Taux Annuel Effectif Global (%)"],
        [token: "debitRate",               label: "Taux debiteur (%)"],
        [token: "monthlyWithoutInsurance", label: "Mensualite hors assurance (${EUR})"],
        [token: "lastWithoutInsurance",    label: "Derniere mensualite hors assurance (${EUR})"],
        [token: "totalWithoutInsurance",   label: "Montant total du hors assurance (${EUR})"],
        // --- Assurance emprunteur ---------------------------------------------------------
        [token: "taea",                    label: "TAEA - Taux Annuel Effectif de l'Assurance (%)"],
        [token: "monthlyAmount",           label: "Prime mensuelle d'assurance (${EUR})"],
        [token: "firstMonthlyAmount",      label: "Premiere prime d'assurance - la plus elevee (${EUR})"],
        [token: "totalInsuranceCost",      label: "Cout total de l'assurance (${EUR})"],
        [token: "monthlyWithInsurance",    label: "Mensualite avec assurance (${EUR})"],
        [token: "lastWithInsurance",       label: "Derniere mensualite avec assurance (${EUR})"],
        [token: "totalWithInsurance",      label: "Montant total du avec assurance (${EUR})"],
].collect { [token: it.token as String, label: it.label as String, family: "simulation"] }

/*
 * Variables de CAMPAGNE — bornes de l'offre, renvoyees par
 * GET /revolvingSimulation/v3/partners/{partnerId}/campaigns/{sourceId}.
 *
 * Elles ne dependent QUE de la provenance de la page : ni type de credit, ni montant, ni duree.
 * C'est ce qui permet a une mention d'annoncer « un TAEG fixe de 4,4 % a 15,65 % » sans que le
 * marketing ait a ressaisir ces bornes a chaque revision de bareme.
 *
 * `id`, `type` et `label` sont renvoyes par l'API mais volontairement absents : les deux premiers
 * sont techniques, et `label` est un nom bien trop generique pour un espace de jetons partage.
 *
 * Les durees sont des NOMBRES NUS : la mention ecrit « de {minDuration} a {maxDuration} mois »,
 * le mot appartient a la phrase du contributeur.
 */
final List<Map<String, String>> CAMPAIGN_VARS = [
        // --- Bornes de montant -------------------------------------------------------------
        [token: "minAmount",                    label: "Montant minimum de l'offre (${EUR})"],
        [token: "maxAmount",                    label: "Montant maximum de l'offre (${EUR})"],
        // --- Bornes de duree ---------------------------------------------------------------
        [token: "minDuration",                  label: "Duree minimum (nombre de mois)"],
        [token: "maxDuration",                  label: "Duree maximum (nombre de mois)"],
        // --- Bornes de taux ----------------------------------------------------------------
        [token: "minAnnualGlobalEffectiveRate", label: "TAEG minimum (%)"],
        [token: "maxAnnualGlobalEffectiveRate", label: "TAEG maximum (%)"],
        [token: "minAnnualDebitRate",           label: "Taux debiteur minimum (%)"],
        [token: "maxAnnualDebitRate",           label: "Taux debiteur maximum (%)"],
        [token: "promoGlobalEffectiveRate",     label: "TAEG promotionnel (%)"],
        // --- Validite commerciale ----------------------------------------------------------
        [token: "startDate",                    label: "Debut de validite de l'offre"],
        [token: "endDate",                      label: "Fin de validite de l'offre"],
].collect { [token: it.token as String, label: it.label as String, family: "campagne"] }

// `default` uniquement : une config de site se publie depuis jContent comme
// n'importe quel contenu. L'ecrire directement en `live` produirait un etat
// non reproductible depuis l'espace d'edition.
final String WORKSPACE = "default"

println "=" * 72
println " Amorcage de la configuration des variables du simulateur"
println " Mode      : ${DRY_RUN ? 'DRY RUN (aucune ecriture)' : 'APPLY (ecritures reelles)'}"
println " Site      : /sites/${SITE_KEY}"
println " Noeud     : ${SETTINGS_PARENT}/${SETTINGS_NAME} (${SETTINGS_TYPE})"
println " Variables : ${VARS.size()} simulation + ${CAMPAIGN_VARS.size()} campagne"
println " Workspace : ${WORKSPACE}"
println "=" * 72

JCRTemplate.instance.doExecuteWithSystemSessionAsUser(null, WORKSPACE, LOCALE) { session ->

    // Site UNIQUE, comme tous les scripts d'initialisation de ce dossier
    // (init-site-settings, init-mention-settings, init-simulator-settings...).
    // Balayer tous les jnt:virtualsite toucherait aussi les sites de recette ou de demo
    // presents sur la meme instance.
    def sites
    if (!session.nodeExists("/sites/${SITE_KEY}")) {
        println "   [ERREUR] /sites/${SITE_KEY} n'existe pas. Verifiez la cle du site."
        return
    }
    sites = [session.getNode("/sites/${SITE_KEY}")]

    sites.each { site ->

        println "\n--- Site '${site.name}' ---"

        // Un noeud versionne refuse toute ecriture sans checkout prealable.
        def ensureCheckedOut = { node ->
            try {
                if (node.isNodeType("mix:versionable") && !node.isCheckedOut()) {
                    session.workspace.versionManager.checkout(node.path)
                }
            } catch (Exception ignored) {
                /* non versionable : rien a faire */
            }
        }

        // Cree l'arborescence contents/site-settings si elle n'existe pas encore.
        def ensurePath = { parent, String relPath ->
            def current = parent
            relPath.split("/").each { segment ->
                if (current.hasNode(segment)) {
                    current = current.getNode(segment)
                } else {
                    if (DRY_RUN) {
                        println "   [WOULD] creer ${current.path}/${segment} (jnt:contentFolder)"
                        return
                    }
                    ensureCheckedOut(current)
                    current = current.addNode(segment, "jnt:contentFolder")
                }
            }
            return current
        }

        def settingsParent
        try {
            settingsParent = ensurePath(site, SETTINGS_PARENT)
        } catch (Exception e) {
            println "   [FAIL] ${SETTINGS_PARENT} inaccessible : ${e.message}"
            return
        }

        if (settingsParent == null || (DRY_RUN && !site.hasNode(SETTINGS_PARENT))) {
            println "   [WOULD] creer ${SETTINGS_PARENT}/${SETTINGS_NAME} puis ${VARS.size() + CAMPAIGN_VARS.size()} variable(s)."
            return
        }

        // Noeud de configuration.
        def settings
        try {
            if (settingsParent.hasNode(SETTINGS_NAME)) {
                settings = settingsParent.getNode(SETTINGS_NAME)
                println "   [SKIP] ${settings.path} existe deja."
            } else if (DRY_RUN) {
                println "   [WOULD] creer ${settingsParent.path}/${SETTINGS_NAME} (${SETTINGS_TYPE})"
                settings = null
            } else {
                ensureCheckedOut(settingsParent)
                settings = settingsParent.addNode(SETTINGS_NAME, SETTINGS_TYPE)
                settings.setProperty("jcr:title", "Variables du simulateur")
                println "   [DO]   cree ${settings.path}"
            }
        } catch (Exception e) {
            println "   [FAIL] Creation de ${SETTINGS_NAME} : ${e.message}"
            return
        }

        // Variables existantes, indexees par token : c'est lui l'identite, pas le
        // nom du noeud — un libelle renomme ne doit pas provoquer de doublon.
        Set<String> existingTokens = new HashSet<String>()
        if (settings != null) {
            try {
                def it = settings.nodes
                while (it.hasNext()) {
                    def child = it.nextNode()
                    if (child.isNodeType(VAR_TYPE) && child.hasProperty("token")) {
                        existingTokens.add(child.getProperty("token").string)
                    }
                }
            } catch (Exception ignored) {
                /* noeud tout juste cree : aucun enfant */
            }
        }

        int created = 0
        int skipped = 0

        (VARS + CAMPAIGN_VARS).eachWithIndex { variable, index ->

            String token = variable.token

            if (existingTokens.contains(token)) {
                skipped++
                println "   [SKIP] ${token} — deja configure, libelle preserve."
                return
            }

            if (DRY_RUN || settings == null) {
                created++
                println "   [WOULD] ${token} -> \"${variable.label}\""
                return
            }

            try {
                ensureCheckedOut(settings)
                // Nom de noeud derive du token : lisible dans l'arbre jContent et
                // stable, alors qu'un nom auto-genere ne dirait rien.
                String nodeName = "var-" + token.replaceAll(/[^A-Za-z0-9]/, "-").toLowerCase()
                def node = settings.addNode(nodeName, VAR_TYPE)

                node.setProperty("token", token)
                node.setProperty("enabled", true)
                node.setProperty("family", variable.family)

                /*
                 * `jcr:title` EST le libelle affiche dans le menu - il n'y a plus de propriete
                 * `label` distincte, elle faisait double emploi. L'aide est fondue dans le
                 * titre, cf. la liste VARS.
                 *
                 * UNE SEULE ECRITURE, PAS UNE BOUCLE SUR LES LANGUES. La propriete est i18n, donc
                 * ecrite dans la langue de la SESSION - ici LOCALE, fixee a l'ouverture.
                 * Boucler sans rouvrir de session par langue donnerait l'illusion d'une
                 * traduction tout en ecrivant le meme texte francais dans chaque langue.
                 * Ajouter une langue au menu suppose donc d'ouvrir une session par langue,
                 * et surtout de disposer des libelles traduits - ce qui n'est pas le cas.
                 */
                node.setProperty("jcr:title", variable.label)

                session.save()
                created++
                println "   [DO]   ${token} -> \"${variable.label}\""
            } catch (Exception e) {
                // Un echec ne doit pas interrompre le lot.
                println "   [FAIL] ${token} : ${e.message}"
                try { session.refresh(false) } catch (Exception ignored) { }
            }
        }

        println "   -> ${created} variable(s) ${DRY_RUN ? 'a creer' : 'creee(s)'}, ${skipped} conservee(s)."
    }
}

println "\n" + "=" * 72
println (DRY_RUN
        ? " DRY RUN — aucune ecriture. Passer DRY_RUN = false pour appliquer."
        : " Termine. Vider les caches, PUBLIER la config de site depuis jContent,\n" +
          " puis verifier le menu « Variables simulateur » dans une mention d'assurance.")
println "=" * 72
