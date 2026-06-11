export type FrameSize = {
  width: number;
  height: number;
};

export type PendingReplaceState = {
  file: File;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string | null;
};

export type OptimizePreviewState = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  bytes: number;
};

export type ConvertPreviewState = {
  blob: Blob;
  url: string;
  bytes: number;
};
