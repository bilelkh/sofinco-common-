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

    // Le dossier site-settings est normalement créé par init-site-settings.groovy ;
    // on le sécurise ici pour que ce script reste exécutable seul.
    def settingsFolder
    if (!contentsNode.hasNode("site-settings")) {
        settingsFolder = contentsNode.addNode("site-settings", "jnt:contentFolder")
        settingsFolder.addMixin("mix:title")
        settingsFolder.addMixin("jmix:i18n")
        settingsFolder.setProperty("jcr:title", "Paramètres du site")
        println "[OK] Création du dossier 'site-settings'."
    } else {
        settingsFolder = contentsNode.getNode("site-settings")
    }

    if (!settingsFolder.hasNode("image-weight-policy")) {
        def policy = settingsFolder.addNode("image-weight-policy", "sofnt:imageWeightPolicy")
        policy.setProperty("jcr:title", "Politique de poids des images")

        // Ordre = priorité d'évaluation. matchTokens laissés VIDES : inheritDefaults=true
        // fait hériter les tokens par défaut de chaque catégorie. La règle 'default' = filet.
        def r1 = policy.addNode("regle-icones-logos", "sofnt:imageWeightRule")
        r1.setProperty("category", "icon-logo")
        r1.setProperty("inheritDefaults", true)
        r1.setProperty("maxSizeKb", 50L)

        def r2 = policy.addNode("regle-mobile", "sofnt:imageWeightRule")
        r2.setProperty("category", "mobile")
        r2.setProperty("inheritDefaults", true)
        r2.setProperty("maxSizeKb", 100L)

        def r3 = policy.addNode("regle-tablette", "sofnt:imageWeightRule")
        r3.setProperty("category", "tablet")
        r3.setProperty("inheritDefaults", true)
        r3.setProperty("maxSizeKb", 500L)

        def r4 = policy.addNode("regle-defaut", "sofnt:imageWeightRule")
        r4.setProperty("category", "default")
        r4.setProperty("inheritDefaults", true)
        r4.setProperty("maxSizeKb", 1024L)

        session.save()
        println "[SUCCÈS] Noeud 'image-weight-policy' créé avec 4 règles."
    } else {
        println "[INFO] 'image-weight-policy' existe déjà. Aucune action requise."
    }

} catch (RepositoryException e) {
    println "[ERREUR JCR] Une erreur est survenue : " + e.getMessage()
}
