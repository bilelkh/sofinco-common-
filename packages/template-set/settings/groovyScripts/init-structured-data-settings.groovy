import org.jahia.services.content.JCRSessionFactory
import javax.jcr.RepositoryException
import java.util.Locale

/**
 * Cree le noeud de configuration des donnees structurees (JSON-LD) sous
 * /sites/<site>/contents/site-settings/structured-data-settings.
 *
 * Il alimente le noeud `Organization` du @graph emis dans le <head> de chaque page
 * (cf. src/lib/structuredData/organization.ts), auquel se rattachent `publisher`
 * (Article, VideoObject) et `provider` (LoanOrCredit) par `@id`.
 *
 * Idempotent : les valeurs deja saisies par un contributeur ne sont jamais ecrasees.
 * Seules les valeurs d'amorcage sont posees a la creation du noeud.
 */

def siteKey = "sofinco"
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
            println "[OK] Creation du dossier 'site-settings'."
            needsSave = true
        } else {
            settingsFolder = contentsNode.getNode("site-settings")
        }

        def config
        if (!settingsFolder.hasNode("structured-data-settings")) {
            config = settingsFolder.addNode("structured-data-settings", "sofnt:structuredDataSettings")

            def trans = getOrCreateTranslationNode(config, "fr")
            trans.setProperty("jcr:title", "Donn\u00e9es structur\u00e9es (SEO)")
            // Proprietes i18n : elles vivent sur le noeud de traduction, pas sur le noeud lui-meme.
            trans.setProperty("description", "Pr\u00eats \u00e0 la consommation : personnel, auto, travaux, cr\u00e9dit renouvelable et rachat de cr\u00e9dits.")
            trans.setProperty("streetAddress", "1 Rue Victor Basch")
            trans.setProperty("addressLocality", "Massy")
            trans.setProperty("articleAuthorName", "La R\u00e9daction Sofinco")

            config.setProperty("legalName", "Sofinco")
            config.setProperty("organizationUrl", "https://www.sofinco.fr")
            config.setProperty("founder", "Cr\u00e9dit Agricole Consumer Finance")
            config.setProperty("telephone", "+33-800-02-05-05")
            config.setProperty("contactType", "customer service")
            config.setProperty("postalCode", "91300")
            config.setProperty("addressCountry", "FR")
            config.setProperty("sameAs", [
                "https://www.facebook.com/SofincoCredit",
                "https://fr.linkedin.com/showcase/sofinco/",
                "https://www.youtube.com/channel/UC_B9rpSDs0u2aeFfAmWoYRw"
            ] as String[])

            println "[OK] Creation de 'structured-data-settings'."
            needsSave = true
        } else {
            config = settingsFolder.getNode("structured-data-settings")
            println "[INFO] La configuration 'structured-data-settings' existe deja."
        }

        // -----------------------------------------------------------------
        // Seuils de publication de la note client (Avis Verifies).
        // Poses APRES la creation du noeud : `autocreated` n'applique la valeur
        // par defaut qu'a la creation, un noeud deja livre ne les verrait donc
        // jamais apparaitre dans l'editeur.
        // -----------------------------------------------------------------
        if (!config.hasProperty("ratingMinValue")) {
            config.setProperty("ratingMinValue", 4.0d)
            println "[OK] Configuration 'ratingMinValue' -> 4.0."
            needsSave = true
        } else {
            println "[INFO] 'ratingMinValue' deja configure (${config.getProperty('ratingMinValue').getDouble()}), skip."
        }

        if (!config.hasProperty("ratingMinReviewCount")) {
            config.setProperty("ratingMinReviewCount", 50L)
            println "[OK] Configuration 'ratingMinReviewCount' -> 50."
            needsSave = true
        } else {
            println "[INFO] 'ratingMinReviewCount' deja configure (${config.getProperty('ratingMinReviewCount').getLong()}), skip."
        }

        if (needsSave) {
            session.save()
            println "[SUCCES] La configuration des donnees structurees a ete enregistree."
        } else {
            println "[INFO] Aucun changement a persister, tout est deja en place."
        }

    } else {
        println "[ERREUR] Le chemin ${contentsPath} n'existe pas. Verifiez la cle du site."
    }
} catch (RepositoryException e) {
    println "[ERREUR JCR] " + e.getMessage()
}
