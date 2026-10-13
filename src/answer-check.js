import { checkItem } from "./math.js";
import { checkEngineAnswer } from "./engine-questions.js";

// One answer check for every MathQuest item. Engine items are evaluated by the Math Engine;
// teacher-authored imports use MathQuest's import parser.
export function checkAnswerFor(item, input) {
  return item?.source === "math-engine" ? checkEngineAnswer(item, input) : checkItem(item, input);
}
