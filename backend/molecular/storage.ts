import { Bucket } from "encore.dev/storage/objects";

export const molecularStructures = new Bucket("molecular-structures", {
  public: false,
  versioned: true,
});

export const snapshotImages = new Bucket("snapshot-images", {
  public: false,
  versioned: false,
});
