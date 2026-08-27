import org.jahia.api.Constants
import org.jahia.services.content.JCRTemplate
import java.util.Locale

// --- CONFIGURATION ---
def siteKey = "sofinco"
def pageName = "footer"
def templateName = "footer"
def logoPath = "/sites/${siteKey}/files/logo.png"
// ---------------------

JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, { session ->
    
    def sitePath = "/sites/" + siteKey
    if (!session.nodeExists(sitePath)) {
        println "❌ Le site ${siteKey} n'existe pas."
        return null
    }
    
    def siteNode = session.getNode(sitePath)
    
    // 1. Création de la page "footer"
    if (!siteNode.hasNode(pageName)) {
        println "⏳ Création de la page Footer et de ses composants..."
        
        def pageNode = siteNode.addNode(pageName, "jnt:page")
        
        // Propriétés de base
        pageNode.setProperty("j:templateName", templateName)
        
        // --- Traduction (UTF-8 et i18n) ---
        def frLocale = new Locale("fr")
        def translationNode = pageNode.getOrCreateI18N(frLocale)
        translationNode.setProperty("jcr:title", "Configuration Footer")
        
        // --- Nœud Zone (footerArea) ---
        def areaNode = pageNode.addNode("footerArea", "jnt:contentList")
        areaNode.addMixin("jmix:isAreaList")
        
        // --- Nœud Composant (mon-footer) ---
        def footerComponent = areaNode.addNode("mon-footer", "sofnt:footer")
        
        // --- Résolution de l'UUID pour l'image ---
        if (session.nodeExists(logoPath)) {
            def logoNode = session.getNode(logoPath)
            def logoUuid = logoNode.getIdentifier()
            footerComponent.setProperty("mainLogo", logoUuid)
            println "✅ Logo lié avec succès (UUID: ${logoUuid})"
        } else {
            println "⚠️ L'image ${logoPath} est introuvable. Le champ 'mainLogo' est vide."
        }
        
        session.save()
        println "✅ Structure générée avec succès : ${pageNode.getPath()}"
        
    } else {
        println "⏩ La page '${pageName}' existe déjà. Aucune action."
    }
    
    return null
})
