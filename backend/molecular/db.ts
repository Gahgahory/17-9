import { SQLDatabase } from "encore.dev/storage/sqldb";

export const molecularDB = new SQLDatabase("molecular", {
  migrations: "./migrations",
});
