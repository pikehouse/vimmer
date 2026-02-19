import { SCORE_PER_OBJECTIVE, TIME_BONUS_MAX, STAR_THRESHOLDS } from '../constants';
import type { LevelResult, LevelState } from '../types';

export class ScoreManager {
  calculateResult(
    levelId: string,
    state: LevelState,
    maxObjectives: number
  ): LevelResult {
    const completedObjectives = state.objectives.filter(o => o.completed).length;
    const objectiveScore = completedObjectives * SCORE_PER_OBJECTIVE;

    // Time bonus: higher if finished quickly
    let timeBonus = 0;
    if (state.timeLimit > 0) {
      const fractionRemaining = Math.max(0, state.timeRemaining / state.timeLimit);
      timeBonus = Math.round(fractionRemaining * TIME_BONUS_MAX);
    }

    const score = state.score + objectiveScore + timeBonus;
    const maxScore = maxObjectives * SCORE_PER_OBJECTIVE + TIME_BONUS_MAX;

    const ratio = maxScore > 0 ? score / maxScore : 0;
    let stars = 0;
    if (ratio >= STAR_THRESHOLDS[2]) stars = 3;
    else if (ratio >= STAR_THRESHOLDS[1]) stars = 2;
    else if (ratio >= STAR_THRESHOLDS[0]) stars = 1;

    const timeElapsed = state.timeLimit > 0
      ? state.timeLimit - state.timeRemaining
      : (Date.now() - state.startTime) / 1000;

    return {
      levelId,
      subLevel: state.subLevel,
      score,
      maxScore,
      stars,
      timeElapsed,
    };
  }
}
