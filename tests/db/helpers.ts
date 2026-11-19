import { Client } from "pg";
import { inject } from "vitest";

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: inject("dbUrl") });
  await client.connect();
  return client;
}

/** Exécute fn dans une transaction annulée à la fin : chaque test laisse la base intacte. */
export async function inRollback<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    return await fn();
  } finally {
    await client.query("ROLLBACK");
  }
}

export async function expectPgError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const actual = (error as { code?: string }).code;
    if (actual !== code) throw new Error(`Code d'erreur attendu ${code}, obtenu ${actual} : ${(error as Error).message}`);
    return;
  }
  throw new Error(`Une erreur ${code} était attendue, mais la requête a réussi`);
}
