import { api, APIError } from "encore.dev/api";
import { molecularDB } from "./db";
import { snapshotImages } from "./storage";
import type { Snapshot } from "./types";

export interface CreateSnapshotRequest {
  molecule_id: number;
  name: string;
  description?: string;
  camera_position: any;
  visualization_settings: any;
  image_data?: string; // base64 encoded image
}

export interface GetSnapshotsParams {
  molecule_id: number;
}

export interface GetSnapshotsResponse {
  snapshots: Snapshot[];
}

// Creates a snapshot of the current visualization state.
export const createSnapshot = api<CreateSnapshotRequest, Snapshot>(
  { expose: true, method: "POST", path: "/molecules/:molecule_id/snapshots" },
  async (req) => {
    // Verify molecule exists
    const molecule = await molecularDB.queryRow`
      SELECT id FROM molecules WHERE id = ${req.molecule_id}
    `;

    if (!molecule) {
      throw APIError.notFound("molecule not found");
    }

    let imageFileName: string | null = null;

    // Upload image to object storage if provided
    if (req.image_data) {
      try {
        // Convert base64 to buffer
        const base64Data = req.image_data.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        
        imageFileName = `snapshot_${req.molecule_id}_${Date.now()}.png`;
        await snapshotImages.upload(imageFileName, imageBuffer, {
          contentType: "image/png",
        });
      } catch (error) {
        console.error("Failed to upload snapshot image:", error);
        // Continue without image if upload fails
      }
    }

    const snapshot = await molecularDB.queryRow<Snapshot>`
      INSERT INTO snapshots (
        molecule_id, name, description, camera_position, 
        visualization_settings, image_data
      ) VALUES (
        ${req.molecule_id}, ${req.name}, ${req.description || null},
        ${JSON.stringify(req.camera_position)}, 
        ${JSON.stringify(req.visualization_settings)},
        ${imageFileName}
      )
      RETURNING *
    `;

    if (!snapshot) {
      throw APIError.internal("failed to create snapshot");
    }

    return snapshot;
  }
);

// Retrieves all snapshots for a molecule.
export const getSnapshots = api<GetSnapshotsParams, GetSnapshotsResponse>(
  { expose: true, method: "GET", path: "/molecules/:molecule_id/snapshots" },
  async ({ molecule_id }) => {
    const snapshots = await molecularDB.queryAll<Snapshot>`
      SELECT * FROM snapshots 
      WHERE molecule_id = ${molecule_id}
      ORDER BY created_at DESC
    `;

    return { snapshots };
  }
);

export interface GetSnapshotImageParams {
  id: number;
}

export interface GetSnapshotImageResponse {
  image_url: string;
}

// Generates a signed URL for downloading a snapshot image.
export const getSnapshotImage = api<GetSnapshotImageParams, GetSnapshotImageResponse>(
  { expose: true, method: "GET", path: "/snapshots/:id/image" },
  async ({ id }) => {
    const snapshot = await molecularDB.queryRow<Snapshot>`
      SELECT image_data FROM snapshots WHERE id = ${id}
    `;

    if (!snapshot || !snapshot.image_data) {
      throw APIError.notFound("snapshot image not found");
    }

    try {
      const signedUrl = await snapshotImages.signedDownloadUrl(snapshot.image_data, {
        ttl: 3600, // 1 hour
      });

      return { image_url: signedUrl.url };
    } catch (error) {
      throw APIError.internal("failed to generate signed URL");
    }
  }
);

export interface DeleteSnapshotParams {
  id: number;
}

// Deletes a snapshot and its associated image.
export const deleteSnapshot = api<DeleteSnapshotParams, void>(
  { expose: true, method: "DELETE", path: "/snapshots/:id" },
  async ({ id }) => {
    const snapshot = await molecularDB.queryRow<Snapshot>`
      SELECT image_data FROM snapshots WHERE id = ${id}
    `;

    if (!snapshot) {
      throw APIError.notFound("snapshot not found");
    }

    // Delete image from storage if it exists
    if (snapshot.image_data) {
      try {
        await snapshotImages.remove(snapshot.image_data);
      } catch (error) {
        console.error("Failed to delete snapshot image:", error);
        // Continue with snapshot deletion even if image deletion fails
      }
    }

    await molecularDB.exec`
      DELETE FROM snapshots WHERE id = ${id}
    `;
  }
);
