import type { FooterPartnerLogoPropsServer } from "../footerPartnerLogo.types";
import classes from "./footerPartnerLogo.module.css";

export function FooterPartnerLogo({ 
  imageUrl, 
  altText, 
  disclaimer 
}: FooterPartnerLogoPropsServer) {
  
  const content = (
    <>
      <img 
        src={imageUrl} 
        alt={altText} 
        title={disclaimer} 
        className={classes.logo} 
      />
      {altText && <span className={classes.partnerTitle}>{altText}</span>}
    </>
  );

  return (
    <div className={classes.partnerWrapper}>
      {content}
    </div>
  );
}
