import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ModelViewerAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  "ios-src"?: string;
  alt?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "ar-placement"?: "floor" | "wall";
  "ar-scale"?: "auto" | "fixed";
  "camera-controls"?: boolean | "";
  "touch-action"?: string;
  "shadow-intensity"?: string;
  exposure?: string;
  "environment-image"?: string;
  "tone-mapping"?: string;
  poster?: string;
  reveal?: string;
  "interaction-prompt"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttrs;
    }
  }
}

export type ModelViewerElement = HTMLElement & {
  canActivateAR: boolean;
  activateAR: () => Promise<void>;
  toBlob: (opts?: { mimeType?: string; qualityArgument?: number; idealAspect?: boolean }) => Promise<Blob>;
};
