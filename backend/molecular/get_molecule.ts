import { api, APIError } from "encore.dev/api";
import { molecularDB } from "./db";
import type { Molecule } from "./types";

export interface GetMoleculeParams {
  id: number;
}

// Retrieves a molecule by ID.
export const getMolecule = api<GetMoleculeParams, Molecule>(
  { expose: true, method: "GET", path: "/molecules/:id" },
  async ({ id }) => {
    const molecule = await molecularDB.queryRow<Molecule>`
      SELECT * FROM molecules WHERE id = ${id}
    `;

    if (!molecule) {
      throw APIError.notFound("molecule not found");
    }

    return molecule;
  }
);
