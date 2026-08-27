import org.jahia.services.content.JCRSessionFactory
import org.jahia.services.content.JCRNodeWrapper
import java.util.Locale

// ==========================================
// 1. CONFIGURATION DES CHEMINS (MIS À JOUR)
// ==========================================
def sitePath = "/sites/sofinco"
def targetPath = "${sitePath}/footer" // Dossier cible : /sites/sofinco/footer
def footerNodeName = "footer"         // Nom du nœud : footer (Donne le chemin final : /sites/sofinco/footer/footer)

def footerData = [
    mainLogo: "${sitePath}/files/logo_accent.svg",
    mainLogoAlt: "Sofinco",
    socialTitle: "SUIVEZ-NOUS",
    bottomSubtitle: "LÉGAL & UTILITAIRES",
    legalMention: "<p>SOFINCO est une marque de CA Consumer Finance, prêteur, SA au capital de 629 480 046 &euro;, 1 rue Victor Basch &ndash; CS 70001 &ndash; 91068 MASSY Cedex, 542 097 522 RCS Evry. Intermédiaire d'assurances inscrit &agrave; l'ORIAS sous le n&deg; 07 008 079 (<a href=\"http://www.orias.fr/\" target=\"_blank\">www.orias.fr</a>). Sofinco vous propose des offres de crédits, crédit consommation, rachat crédit et crédit renouvelable. Simulation de rachat crédit et crédit en ligne. &copy; CA Consumer Finance 2025</p>",
    
    categories: [
        [ name: "credit-a-la-consommation", title: "CRÉDIT À LA CONSOMMATION", links: ["Prêt personnel en ligne", "Crédit renouvelable", "Regroupement de crédits", "Rachat de crédits auto", "Rachat de prêt personnel", "Rachat de crédits travaux"] ],
        [ name: "cartes-et-paiements", title: "CARTES ET PAIEMENTS", links: ["Carte de crédit Sofinco", "Paiement en plusieurs fois", "Paiement différé", "Paiement en 3 fois", "Paiement en 4 fois"] ],
        [ name: "montants-de-pret", title: "MONTANTS DE PRÊT", links: ["Prêt 1 000 €", "Prêt 3 000 €", "Prêt 5 000 €", "Prêt 10 000 €"] ],
        [ name: "credits-projets", title: "CRÉDITS PROJETS", links: ["Prêt vacances", "Prêt camping-car", "Prêt caravane", "Prêt bateau"] ],
        [ name: "financement-d-un-vehicule", title: "FINANCEMENT D'UN VÉHICULE", links: ["Simulation prêt auto", "Taux crédit auto", "Crédit moto", "Crédit scooter"] ],
        [ name: "pret-travaux", title: "PRÊT TRAVAUX", links: ["Simulation prêt travaux", "Taux crédit travaux"] ],
        [ name: "conseils-et-guides", title: "CONSEILS ET GUIDES DU CRÉDIT", links: ["Guides du crédit conso", "FAQ crédit consommation", "Lexique du crédit", "Calcul du TAEG"] ],
        [ name: "a-propos-de-sofinco", title: "À PROPOS DE SOFINCO", links: ["Qui est Sofinco ?", "Sofinco s'engage", "Acteur responsable", "Avis Sofinco", "Agences Sofinco"] ]
    ],
    
    bottomLinks: [
        "Plan du site Sofinco", "Sécurité", "Mentions légales", "Charte des réclamations", "Contact Sofinco", "Accessibilité", "Utiq", "Politique des données personnelles", "Tarifs", "Découvrir notre groupe"
    ],
    
    socialLinks: [
        [network: "facebook", url: "#"],
        [network: "youtube", url: "#"],
        [network: "linkedin", url: "#"]
    ],
    
    partners: [
        [name: "luci", title: "LUCI", img: "${sitePath}/files/partenaires/logo-lucie.png"],
        [name: "best-workplace", title: "BEST WORKPLACE", img: "${sitePath}/files/partenaires/logo-bestworkplace-2025.png"],
        [name: "casa", title: "CASA", img: "${sitePath}/files/partenaires/logo-casa.png"]
    ]
]

// ==========================================
// 2. INITIALISATION & HELPERS SÉCURISÉS
// ==========================================
def session = JCRSessionFactory.getInstance().getCurrentUserSession("default", new Locale("fr"))

if (!session.nodeExists(targetPath)) {
    log.info("Le dossier parent ${targetPath} n'existe pas, création en cours...")
    def siteNode = session.getNode(sitePath)
    siteNode.addNode("footer", "jnt:contentList")
    session.save()
}

def parentNode = session.getNode(targetPath)

def getSafeUuid = { path ->
    if (session.nodeExists(path)) {
        return session.getNode(path).getIdentifier()
    }
    log.warn("⚠️ FICHIER IMAGE OU LIEN INTROUVABLE : ${path}")
    return null
}

def createFooterLink = { JCRNodeWrapper parent, String nodeName, String label ->
    // Utilise sofnt:footerLink car c'est la valeur définie dans ton mapping pour "sofnt:linkList"
    def linkNode = parent.addNode(nodeName, "sofnt:footerLink")
    linkNode.addMixin("sofmix:ctaInternal")
    linkNode.setProperty("ctaType", "internal")
    linkNode.setProperty("ctaTarget", "_self")
    
    def homeUuid = getSafeUuid("${sitePath}/home")
    if (homeUuid) {
        linkNode.setProperty("ctaInternalNode", homeUuid)
    }
    
    linkNode.setProperty("ctaLabel", label)
    return linkNode
}

def getOrCreateNode = { JCRNodeWrapper parent, String nodeName, String nodeType ->
    if (!parent.hasNode(nodeName)) {
        return parent.addNode(nodeName, nodeType)
    }
    return parent.getNode(nodeName)
}

// ==========================================
// 3. CRÉATION DU FOOTER
// ==========================================
log.info("--- Début de la création du Footer ---")

if (parentNode.hasNode(footerNodeName)) {
    log.info("Un ancien noeud footer existe déjà à cet emplacement, suppression...")
    parentNode.getNode(footerNodeName).remove()
    session.save()
}

def footer = parentNode.addNode(footerNodeName, "sofnt:footer")

def mainLogoUuid = getSafeUuid(footerData.mainLogo)
if (mainLogoUuid) {
    footer.setProperty("mainLogo", mainLogoUuid)
}
footer.setProperty("mainLogoAlt", footerData.mainLogoAlt)
footer.setProperty("socialTitle", footerData.socialTitle)
footer.setProperty("bottomSubtitle", footerData.bottomSubtitle)
footer.setProperty("legalMention", footerData.legalMention)

// ==========================================
// 4. RÉCUPÉRATION OU CRÉATION DES WRAPPERS
// ==========================================
def qrCodeNode = getOrCreateNode(footer, "qrCode", "sofnt:qrSticker")
qrCodeNode.setProperty("isActive", "true")

def avisClientsNode = getOrCreateNode(footer, "avisClients", "sofnt:avisClientsSticker")
avisClientsNode.setProperty("isActive", "true")

// MAJ des types de listes selon ton mapping
def categoriesWrapper = getOrCreateNode(footer, "categories", "sofnt:categoryLinkList")
def bottomLinksWrapper = getOrCreateNode(footer, "bottomLinks", "sofnt:linkList")
def socialLinksWrapper = getOrCreateNode(footer, "socialLinks", "sofnt:socialLinkList")
def partnersWrapper = getOrCreateNode(footer, "partners", "sofnt:partnerList")

// ==========================================
// 5. INJECTION DES DONNÉES DANS LES LISTES
// ==========================================

// ---> Catégories de liens
footerData.categories.each { cat ->
    // MAJ : Utilise sofnt:categoryLink au lieu de sofnt:footerCategory
    def catNode = categoriesWrapper.addNode(cat.name, "sofnt:categoryLink")
    catNode.setProperty("jcr:title", cat.title)
    cat.links.eachWithIndex { linkLabel, index ->
        createFooterLink(catNode, "lien-${index + 1}", linkLabel)
    }
}

// ---> Liens utiles du bas (Bottom Links)
footerData.bottomLinks.eachWithIndex { linkLabel, index ->
    createFooterLink(bottomLinksWrapper, "lien-legal-${index + 1}", linkLabel)
}

// ---> Liens Réseaux Sociaux
footerData.socialLinks.eachWithIndex { social, index ->
    // MAJ : Utilise sofnt:socialLink au lieu de sofnt:footerSocialLink
    def socialNode = socialLinksWrapper.addNode("reseau-${social.network}", "sofnt:socialLink")
    socialNode.setProperty("network", social.network)
    socialNode.setProperty("url", social.url)
}

// ---> Logos Partenaires
footerData.partners.each { partner ->
    // MAJ : Utilise sofnt:partner au lieu de sofnt:footerPartnerLogo
    def partnerNode = partnersWrapper.addNode(partner.name, "sofnt:partner")
    partnerNode.setProperty("jcr:title", partner.title)
    partnerNode.setProperty("logoAlt", partner.title)
    partnerNode.setProperty("linkUrl", "#")
    partnerNode.setProperty("openInNewTab", "true")
    
    def imgUuid = getSafeUuid(partner.img)
    if (imgUuid) {
        partnerNode.setProperty("logoImage", imgUuid)
    }
}

// ==========================================
// 6. SAUVEGARDE FINALE
// ==========================================
session.save()
log.info("✅ SUCCESS : Le nouveau modèle de footer a été importé avec succès à l'emplacement exact : ${footer.getPath()}")
