import { SQLDatabase } from "encore.dev/storage/sqldb";

export default new SQLDatabase("crm", {
  migrations: "./migrations",
});