import org.jahia.services.content.JCRSessionFactory
import javax.jcr.RepositoryException
import java.util.Locale

def siteKey = "sofinco"
def contentsPath = "/sites/${siteKey}/contents"

/**
 * Returns (creating if needed) the j:translation_<lang> child node used by Jahia
 * to store localized properties (jcr:title, etc.) for the given language.
 */
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
    if (session.nodeExists(contentsPath)) {
        def contentsNode = session.getNode(contentsPath)
        def settingsFolder
        def needsSave = false

        // 1. Verification/Creation du dossier site-settings
        if (!contentsNode.hasNode("site-settings")) {
            settingsFolder = contentsNode.addNode("site-settings", "jnt:contentFolder")
            settingsFolder.addMixin("mix:title")
            settingsFolder.addMixin("jmix:i18n")

            def trans = getOrCreateTranslationNode(settingsFolder, "fr")
            trans.setProperty("jcr:title", "Param\u00e8tres du site")

            println "[OK] Cr\u00e9ation du dossier 'site-settings'."
            needsSave = true
        } else {
            settingsFolder = contentsNode.getNode("site-settings")
        }

        // 2. Verification/Creation de la configuration Avis Clients
        if (!settingsFolder.hasNode("avis-clients-settings")) {
            def avisConfig = settingsFolder.addNode("avis-clients-settings", "sofnt:avisClientsSettings")

            // Ajout des proprietes non-internationalisees (Typage strict : double et long)
            avisConfig.setProperty("isGlobalActive", true)

            // Ajout des proprietes internationalisees (i18n)
            def trans = getOrCreateTranslationNode(avisConfig, "fr")
            trans.setProperty("jcr:title", "Configuration Avis V\u00e9rifi\u00e9s")
            trans.setProperty("avisTitle", "Avis V\u00e9rifi\u00e9s")

            println "[OK] Cr\u00e9ation de 'avis-clients-settings'."
            needsSave = true
        }

        // 3. Sauvegarde de la session si des modifications ont eu lieu
        if (needsSave) {
            session.save()
            println "[SUCCES] Les nouvelles configurations ont \u00e9t\u00e9 enregistr\u00e9es dans la base !"
        } else {
            println "[INFO] Toutes les configurations existent d\u00e9j\u00e0. Aucune action requise."
        }

    } else {
        println "[ERREUR] Le chemin ${contentsPath} n'existe pas. V\u00e9rifiez la cl\u00e9 du site."
    }
} catch (RepositoryException e) {
    println "[ERREUR JCR] " + e.getMessage()
}
