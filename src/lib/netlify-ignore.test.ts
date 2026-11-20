import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/** Netlify « ignore » : sortie 0 = pas de mise en ligne, 1 = mise en ligne. */
const script = path.resolve(__dirname, "../../scripts/netlify-ignore.sh");
const repo = mkdtempSync(path.join(tmpdir(), "netlify-ignore-"));
const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "ignore" });
git("init", "-q");
git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "--allow-empty", "-q", "-m", "init");

function run(message: string | null, env: Record<string, string> = {}) {
  if (message !== null) git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "--allow-empty", "-q", "-m", message);
  return spawnSync("bash", [script], { cwd: repo, env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv, encoding: "utf8" }).status;
}

afterAll(() => rmSync(repo, { recursive: true, force: true }));

describe("mises en ligne de la préproduction uniquement sur demande", () => {
  it("une modification ordinaire n'est PAS mise en ligne", () => {
    expect(run("lecteur : correction")).toBe(0);
  });
  it("la mention [deploy:preprod] dans le commit déclenche la mise en ligne", () => {
    expect(run("préprod : nouvelle version [deploy:preprod]")).toBe(1);
  });
  it("un lien de déclenchement Netlify (build hook) déclenche la mise en ligne", () => {
    expect(run("modification ordinaire", { INCOMING_HOOK_TITLE: "Mise en ligne manuelle" })).toBe(1);
  });
  it("en cas d'erreur (dépôt illisible) : pas de mise en ligne", () => {
    const status = spawnSync("bash", [script], { cwd: tmpdir(), env: { PATH: process.env.PATH ?? "", COMMIT_REF: "inexistant" } as unknown as NodeJS.ProcessEnv, encoding: "utf8" }).status;
    expect(status).toBe(0);
  });
});
