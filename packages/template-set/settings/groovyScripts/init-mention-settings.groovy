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

        if (!contentsNode.hasNode("site-settings")) {
            settingsFolder = contentsNode.addNode("site-settings", "jnt:contentFolder")

            settingsFolder.addMixin("mix:title")
            settingsFolder.addMixin("jmix:i18n")

            def trans = getOrCreateTranslationNode(settingsFolder, "fr")
            trans.setProperty("jcr:title", "Param\u00e8tres du site")

            println "[OK] Creation du dossier 'site-settings' (Param\u00e8tres du site)."
            needsSave = true
        } else {
            settingsFolder = contentsNode.getNode("site-settings")
        }

        if (!settingsFolder.hasNode("mention-settings")) {
            def mentionConfig = settingsFolder.addNode("mention-settings", "sofnt:mentionSettings")

            def trans = getOrCreateTranslationNode(mentionConfig, "fr")
            trans.setProperty("jcr:title", "Mention l\u00e9gale / Sanitaire")
            trans.setProperty("message", "Un cr\u00e9dit vous engage et doit \u00eatre rembours\u00e9. V\u00e9rifiez vos capacit\u00e9s de remboursement avant de vous engager.")

            println "[OK] Creation de 'mention-settings'."
            needsSave = true
        }

        if (needsSave) {
            session.save()
            println "[SUCCES] Les nouvelles configurations ont ete enregistrees dans la base !"
        } else {
            println "[INFO] Toutes les configurations existent deja. Aucune action requise."
        }

    } else {
        println "[ERREUR] Le chemin ${contentsPath} n'existe pas. Verifiez la cle du site."
    }
} catch (RepositoryException e) {
    println "[ERREUR JCR] " + e.getMessage()
}
