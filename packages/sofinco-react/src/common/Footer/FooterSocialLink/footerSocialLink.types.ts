export type SocialNetworkType = 
  | "facebook" 
  | "linkedin" 
  | "youtube" 
  | "x" 
  | "instagram" 
  | "tiktok";

export interface FooterSocialLinkProps {
  id: string;
  network: SocialNetworkType;
  url: string;
}
