import { engineIdsFor, engineQuestion, adjustForPolicy } from "./engine-questions.js";

// Question-provider seam. The session engine asks for the next eligible item; cartridges never
// choose curriculum. Since MathQuest 0.10.0 every code-generated question comes from the Math
// Engine. Teacher-authored custom items are served as written.
export function provideQuestion({ modules, student, assignment }) {
  if (!assignment) return null;
  if (assignment.prompt) return assignment; // Compatibility with pre-v0.4.2 rooms.
  if (assignment.source === "engine" || assignment.source === "preset") {
    // "preset" assignments come from rooms created before 0.10.0; their module ids map to engine items.
    const module = modules.find(m => m.id === assignment.moduleId) || { id: assignment.moduleId };
    const ids = engineIdsFor(module);
    if (!ids.length) return null;
    const seed = Number(assignment.seed) || 0;
    const baseId = ids[Math.abs(seed) % ids.length];
    const policy = assignment.difficultyOverride || student.difficultyPolicy || "session";
    const adjusted = adjustForPolicy(baseId, policy);
    const item = engineQuestion(adjusted.id, assignment.seed, {
      moduleId: module.id, moduleTitle: module.title || assignment.moduleTitle, policy, requestedId: baseId, linked: adjusted.linked
    });
    return item ? { ...item, seed: assignment.seed } : null;
  }
  const selected = modules.find(module => module.id === assignment.moduleId && module.source === "custom");
  const record = selected?.items?.[assignment.itemIndex];
  return record ? { ...record, id: `${record.id}-${assignment.seed}`, assignedDifficulty: "teacher-authored" } : null;
}
