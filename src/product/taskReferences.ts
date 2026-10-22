import type { TeamRecipe, UsageAttemptView } from "./contract";

/** Published recipes hold explicit installation versions, never the current active version. */
export function referencedPackVersions(recipe: TeamRecipe, packId: string): string[] {
  const values = recipe.steps.flatMap(step =>
    step.target.kind === "pack" && step.target.pack_id === packId
      ? [step.target.version]
      : []);
  if (recipe.brain.kind === "local_brain_pack" && recipe.brain.pack_id === packId) {
    values.push(recipe.brain.version);
  }
  return [...new Set(values)];
}

/** These are actual executor attempts, not an inferred pinned plan or public model name. */
export function executedPackVersions(attempts: readonly UsageAttemptView[]): string[] {
  return [...new Set(
    attempts
      .filter(attempt => attempt.model.startsWith("tagma/") && attempt.model.includes("@"))
      .map(attempt => attempt.model)
  )];
}
