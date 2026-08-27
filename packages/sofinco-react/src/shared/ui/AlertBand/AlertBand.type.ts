export type AlertBandProps = {
  message: string;
  variant?: "info" | "warning" | "error" | "success" | "sanitary";
  className?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: React.CSSProperties;
};
