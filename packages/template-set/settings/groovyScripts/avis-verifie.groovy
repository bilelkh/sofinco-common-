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

/**
 * Returns (creating if needed) a content folder under the given parent.
 */
def getOrCreateContentFolder = { parent, name, title ->
    if (parent.hasNode(name)) {
        return [node: parent.getNode(name), created: false]
    }
    def folder = parent.addNode(name, "jnt:contentFolder")
    folder.addMixin("mix:title")
    folder.addMixin("jmix:i18n")
    def trans = getOrCreateTranslationNode(folder, "fr")
    trans.setProperty("jcr:title", title)
    return [node: folder, created: true]
}

def session = JCRSessionFactory.getInstance().getCurrentSystemSession("default", Locale.FRENCH, null)
try {
    if (session.nodeExists(contentsPath)) {
        def contentsNode = session.getNode(contentsPath)
        def needsSave = false

        // 1. Verification/Creation du dossier "config" sous /contents
        def configFolderResult = getOrCreateContentFolder(contentsNode, "config", "Configurations")
        def configFolder = configFolderResult.node
        if (configFolderResult.created) {
            println "[OK] Cr\u00e9ation du dossier 'config'."
            needsSave = true
        }

        // 2. Verification/Creation du dossier "avis-verifies" sous /contents/config
        def avisFolderResult = getOrCreateContentFolder(configFolder, "avis-verifies", "Avis V\u00e9rifi\u00e9s")
        def avisFolder = avisFolderResult.node
        if (avisFolderResult.created) {
            println "[OK] Cr\u00e9ation du dossier 'avis-verifies'."
            needsSave = true
        }

        // 3. Verification/Creation du noeud de configuration "config" (spnt:configVerifedReview)
        if (!avisFolder.hasNode("config")) {
            def configNode = avisFolder.addNode("config", "spnt:configVerifedReview")

            // Proprietes obligatoires - a adapter selon l'environnement
            configNode.setProperty("url", "https://cl.avis-verifies.com")
            configNode.setProperty("webSiteUrl", "https://cl.avis-verifies.com/fr/cache/SITE_ID/AAAAAA/AAAAAA-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json")
            configNode.setProperty("productUrl", "https://cl.avis-verifies.com/fr/cache/SITE_ID/AAAAAA/AAAAAA-xxxx-xxxx-xxxx-xxxxxxxxxxxx_{0}.json")
            configNode.setProperty("webSiteStatUrl", "https://cl.avis-verifies.com/fr/cache/SITE_ID/AAAAAA/AAAAAA-xxxx-xxxx-xxxx-xxxxxxxxxxxx_stat.txt")
            configNode.setProperty("minNbCharacters", 40L)
            configNode.setProperty("labelPath", "/sites/${siteKey}/contents/config/avis-verifies/labels")

            println "[OK] Cr\u00e9ation du noeud 'config' (spnt:configVerifedReview)."
            needsSave = true
        }

        // 4. Sauvegarde de la session si des modifications ont eu lieu
        if (needsSave) {
            session.save()
            println "[SUCCES] La configuration Avis V\u00e9rifi\u00e9s a \u00e9t\u00e9 enregistr\u00e9e dans la base !"
        } else {
            println "[INFO] La configuration Avis V\u00e9rifi\u00e9s existe d\u00e9j\u00e0. Aucune action requise."
        }

    } else {
        println "[ERREUR] Le chemin ${contentsPath} n'existe pas. V\u00e9rifiez la cl\u00e9 du site."
    }
} catch (RepositoryException e) {
    println "[ERREUR JCR] " + e.getMessage()
}
