import org.jahia.services.content.JCRSessionFactory
import javax.jcr.RepositoryException
import java.util.Locale

/*
 * init-simulator-settings.groovy — bootstrap minimal du simulateur Sofinco.
 *
 * RÔLE STRICT :
 *   1. Créer la page Jahia /sites/sofinco/home/parcours-simulateur (template simple) si absente
 *   2. Créer la page Jahia /sites/sofinco/home/parcours-simulateur-rac (template simple) si absente
 *   3. Créer le settings node /sites/sofinco/contents/site-settings/simulator-config si absent
 *   4. Configurer les 2 pickers du settings node vers les pages créées
 *
 * SCOPE NON COUVERT (à faire manuellement par l'équipe Sofinco APRÈS bootstrap) :
 *   - Ajouter le composant simulateur Vue.js DANS chaque page (area "main")
 *   - Valider/modifier le titre, le path, ou la position des pages si besoin
 *   - Modifier les pickers du settings node si les pages sont déplacées
 *
 * IDEMPOTENCY :
 *   - Toutes les créations sont protégées par `hasNode` / `hasProperty`
 *   - Réexécution = no-op, aucune duplication
 *   - Compatible re-déploiement
 *
 * SÉCURITÉ :
 *   - Si la config simulator-config est absente OU si une page picker est vide,
 *     le helper TS resolveSimulatorBasePath retombe sur /parcours-simulateur et
 *     /parcours-simulateur-rac hardcodés → zéro panne site-wide
 */

def siteKey = "sofinco"
def homePath = "/sites/${siteKey}/home"
def contentsPath = "/sites/${siteKey}/contents"

def getOrCreateTranslationNode = { parent, lang ->
    def transName = "j:translation_${lang}"
    if (parent.hasNode(transName)) {
        return parent.getNode(transName)
    }
    def trans = parent.addNode(transName, "jnt:translation")
    trans.setProperty("jcr:language", lang)
    return trans
}

def session = JCRSessionFactory.getInstance().getCurrentSystemSession("default", Locale.FRENCH, null)
try {
    def needsSave = false

    // ─────────────────────────────────────────────────────────────────────
    // 1+2. Création des 2 pages simulateur sous /home avec template `simple`
    // ─────────────────────────────────────────────────────────────────────
    if (!session.nodeExists(homePath)) {
        println "[ERREUR] ${homePath} n'existe pas. Le site n'est pas encore initialis\u00e9."
        return
    }
    def homeNode = session.getNode(homePath)

    // Page principale : /parcours-simulateur (PB, CR, Auto, etc.)
    def simPage
    if (!homeNode.hasNode("parcours-simulateur")) {
        simPage = homeNode.addNode("parcours-simulateur", "jnt:page")
        simPage.setProperty("j:templateName", "simple")
        simPage.setProperty("jcr:title", "Parcours Simulateur")
        def trans = getOrCreateTranslationNode(simPage, "fr")
        trans.setProperty("jcr:title", "Parcours Simulateur")
        println "[OK] Creation de la page '${homePath}/parcours-simulateur' (template simple)."
        needsSave = true
    } else {
        simPage = homeNode.getNode("parcours-simulateur")
        println "[INFO] Page '${homePath}/parcours-simulateur' deja presente, skip."
    }

    // Page RAC : /parcours-simulateur-rac (rachat de credit)
    def simRacPage
    if (!homeNode.hasNode("parcours-simulateur-rac")) {
        simRacPage = homeNode.addNode("parcours-simulateur-rac", "jnt:page")
        simRacPage.setProperty("j:templateName", "simple")
        simRacPage.setProperty("jcr:title", "Parcours Simulateur RAC")
        def trans = getOrCreateTranslationNode(simRacPage, "fr")
        trans.setProperty("jcr:title", "Parcours Simulateur RAC")
        println "[OK] Creation de la page '${homePath}/parcours-simulateur-rac' (template simple)."
        needsSave = true
    } else {
        simRacPage = homeNode.getNode("parcours-simulateur-rac")
        println "[INFO] Page '${homePath}/parcours-simulateur-rac' deja presente, skip."
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Création du settings node simulator-config sous /contents/site-settings
    // ─────────────────────────────────────────────────────────────────────
    if (!session.nodeExists(contentsPath)) {
        println "[ERREUR] ${contentsPath} n'existe pas. Le site n'est pas encore initialise."
        if (needsSave) session.save()
        return
    }
    def contentsNode = session.getNode(contentsPath)

    def settingsFolder
    if (!contentsNode.hasNode("site-settings")) {
        settingsFolder = contentsNode.addNode("site-settings", "jnt:contentFolder")
        settingsFolder.addMixin("mix:title")
        settingsFolder.addMixin("jmix:i18n")
        def trans = getOrCreateTranslationNode(settingsFolder, "fr")
        trans.setProperty("jcr:title", "Parametres du site")
        println "[OK] Creation du dossier 'site-settings'."
        needsSave = true
    } else {
        settingsFolder = contentsNode.getNode("site-settings")
    }

    def simulatorConfig
    if (!settingsFolder.hasNode("simulator-config")) {
        simulatorConfig = settingsFolder.addNode("simulator-config", "sofnt:simulatorConfig")
        def trans = getOrCreateTranslationNode(simulatorConfig, "fr")
        trans.setProperty("jcr:title", "Configuration Simulateur")
        println "[OK] Creation du node 'simulator-config' (sofnt:simulatorConfig)."
        needsSave = true
    } else {
        simulatorConfig = settingsFolder.getNode("simulator-config")
        println "[INFO] Node 'simulator-config' deja present, skip."
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. Configuration des pickers (weakreference vers les 2 pages)
    //    Uniquement si pas deja configures (preserve les overrides manuels)
    // ─────────────────────────────────────────────────────────────────────
    if (!simulatorConfig.hasProperty("simulatorBasePage")) {
        simulatorConfig.setProperty("simulatorBasePage", simPage.getIdentifier())
        println "[OK] Configuration picker 'simulatorBasePage' -> '${simPage.getPath()}'."
        needsSave = true
    } else {
        println "[INFO] Picker 'simulatorBasePage' deja configure, skip (preserve override)."
    }

    if (!simulatorConfig.hasProperty("simulatorRacBasePage")) {
        simulatorConfig.setProperty("simulatorRacBasePage", simRacPage.getIdentifier())
        println "[OK] Configuration picker 'simulatorRacBasePage' -> '${simRacPage.getPath()}'."
        needsSave = true
    } else {
        println "[INFO] Picker 'simulatorRacBasePage' deja configure, skip (preserve override)."
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. Bornes amountMin / amountMax (centralisees, partagees par tous les
    //    composants SimulatorCredit du site). Defaults : 150 / 999999.
    // ─────────────────────────────────────────────────────────────────────
    if (!simulatorConfig.hasProperty("amountMin")) {
        simulatorConfig.setProperty("amountMin", 150L)
        println "[OK] Configuration 'amountMin' -> 150."
        needsSave = true
    } else {
        println "[INFO] 'amountMin' deja configure (${simulatorConfig.getProperty('amountMin').getLong()}), skip."
    }

    if (!simulatorConfig.hasProperty("amountMax")) {
        simulatorConfig.setProperty("amountMax", 999999L)
        println "[OK] Configuration 'amountMax' -> 999999."
        needsSave = true
    } else {
        println "[INFO] 'amountMax' deja configure (${simulatorConfig.getProperty('amountMax').getLong()}), skip."
    }

    if (needsSave) {
        session.save()
        println "[SUCCES] Configuration simulator-config + 2 pages persistees."
        println ""
        println "[ACTION SUIVANTE - equipe Sofinco]"
        println "  Editez les 2 pages creees et ajoutez le composant simulateur Vue.js"
        println "  dans leur area 'main'. Sans contenu, les pages affichent une zone vide."
    } else {
        println "[INFO] Aucun changement a persister, tout est deja en place."
    }
} catch (RepositoryException e) {
    println "[ERREUR JCR] " + e.getMessage()
    e.printStackTrace()
}
