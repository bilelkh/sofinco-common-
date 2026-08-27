import org.jahia.services.content.JCRSessionFactory
import javax.jcr.RepositoryException
import java.util.Locale

def siteKey = "sofinco"
def contentsPath = "/sites/${siteKey}/contents"

def session = JCRSessionFactory.getInstance().getCurrentSystemSession("default", Locale.FRENCH, null)

try {
    if (!session.nodeExists(contentsPath)) {
        println "[ERREUR] Le chemin ${contentsPath} n'existe pas. Vérifiez la clé du site."
        return
    }

    def contentsNode = session.getNode(contentsPath)
    def needsSave = false

    def settingsFolder
    if (!contentsNode.hasNode("site-settings")) {
        settingsFolder = contentsNode.addNode("site-settings", "jnt:contentFolder")
        
        settingsFolder.addMixin("mix:title")
        settingsFolder.addMixin("jmix:i18n")

        settingsFolder.setProperty("jcr:title", "Paramètres du site")
        
        println "[OK] Création du dossier 'site-settings'."
        needsSave = true
    } else {
        settingsFolder = contentsNode.getNode("site-settings")
    }

    if (!settingsFolder.hasNode("qr-app-settings")) {
        def appConfig = settingsFolder.addNode("qr-app-settings", "sofnt:qrAppSettings")
        
        appConfig.setProperty("jcr:title", "Configuration Globale App")
        appConfig.setProperty("isGlobalAppActive", true)
        appConfig.setProperty("iosUrl", "https://apps.apple.com/fr/app/...")
        appConfig.setProperty("androidUrl", "https://play.google.com/store/apps/...")

        println "[OK] Création du noeud 'qr-app-settings'."
        needsSave = true
    }

    if (needsSave) {
        session.save()
        println "[SUCCÈS] Les nouvelles configurations ont été enregistrées dans le JCR !"
    } else {
        println "[INFO] Toutes les configurations existent déjà. Aucune action requise."
    }

} catch (RepositoryException e) {
    println "[ERREUR JCR] Une erreur est survenue : " + e.getMessage()
}