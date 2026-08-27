// Re-exports the footnote scroll handler as a minified IIFE string, ready to inline in
// Layout.tsx's <head>. Mirrors how `trackingBootstrap` is exposed from `tracking.ts`.
import footnoteBootstrap from "./footnote-bootstrap.ts?inline-script";

export { footnoteBootstrap };
