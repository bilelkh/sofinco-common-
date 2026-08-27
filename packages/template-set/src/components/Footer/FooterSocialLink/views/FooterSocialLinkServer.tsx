import type { FooterSocialLinkPropsServer } from "../footerSocialLink.types";
import { getSocialIcon } from "sofinco-react";
import classes from "./footerSocialLink.module.css";

export function FooterSocialLinkServer(props: FooterSocialLinkPropsServer) {
  return (
    <div className={classes.socialLink}>
      {getSocialIcon(props.network)}
    </div>
  );
}
