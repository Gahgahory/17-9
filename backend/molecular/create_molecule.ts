import { api, APIError } from "encore.dev/api";
import { molecularDB } from "./db";
import type { Molecule } from "./types";

export interface CreateMoleculeRequest {
  name: string;
  formula?: string;
  smiles?: string;
  inchi?: string;
  inchi_key?: string;
  molecular_weight?: number;
  structure_data?: any;
  pdb_id?: string;
}

// Creates a new molecule entry.
export const createMolecule = api<CreateMoleculeRequest, Molecule>(
  { expose: true, method: "POST", path: "/molecules" },
  async (req) => {
    // Validate required fields
    if (!req.name.trim()) {
      throw APIError.invalidArgument("molecule name is required");
    }

    const molecule = await molecularDB.queryRow<Molecule>`
      INSERT INTO molecules (
        name, formula, smiles, inchi, inchi_key, 
        molecular_weight, structure_data, pdb_id, updated_at
      ) VALUES (
        ${req.name}, ${req.formula || null}, ${req.smiles || null}, 
        ${req.inchi || null}, ${req.inchi_key || null},
        ${req.molecular_weight || null}, ${JSON.stringify(req.structure_data) || null}, 
        ${req.pdb_id || null}, NOW()
      )
      RETURNING *
    `;

    if (!molecule) {
      throw APIError.internal("failed to create molecule");
    }

    return molecule;
  }
);
