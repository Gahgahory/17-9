import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { molecularDB } from "./db";
import type { Molecule } from "./types";

export interface ListMoleculesParams {
  limit?: Query<number>;
  offset?: Query<number>;
  search?: Query<string>;
}

export interface ListMoleculesResponse {
  molecules: Molecule[];
  total: number;
}

// Retrieves all molecules with optional filtering and pagination.
export const listMolecules = api<ListMoleculesParams, ListMoleculesResponse>(
  { expose: true, method: "GET", path: "/molecules" },
  async ({ limit = 50, offset = 0, search }) => {
    const searchPattern = search ? `%${search}%` : null;
    
    let whereClause = "";
    let searchParams: any[] = [];
    
    if (searchPattern) {
      whereClause = "WHERE name ILIKE $3 OR formula ILIKE $3 OR pdb_id ILIKE $3";
      searchParams = [searchPattern];
    }

    const molecules = await molecularDB.rawQueryAll<Molecule>(
      `SELECT * FROM molecules ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      limit, offset, ...searchParams
    );

    const countResult = await molecularDB.rawQueryRow<{ count: number }>(
      `SELECT COUNT(*) as count FROM molecules ${whereClause}`,
      ...searchParams
    );

    return {
      molecules,
      total: countResult?.count || 0,
    };
  }
);
