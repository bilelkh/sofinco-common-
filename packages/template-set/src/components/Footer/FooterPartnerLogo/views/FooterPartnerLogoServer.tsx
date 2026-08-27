import type { FooterPartnerLogoPropsServer } from "../footerPartnerLogo.types";
import { FooterPartnerLogo } from "./FooterPartnerLogo";
import classes from "./footerPartnerLogo.module.css";

export function FooterPartnerLogoServer(props: FooterPartnerLogoPropsServer) {
  return (
    <div className={classes.wrapperEditMode}>
      <FooterPartnerLogo {...props} />
    </div>
  );
}
