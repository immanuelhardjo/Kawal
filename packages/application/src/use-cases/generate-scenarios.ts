import { ApplicationError, NotFound } from '../errors.js';
import type { ProjectedScenario, ScenarioPort } from '../ports/ai-ports.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import {
  detectEditorialTone,
  stripEditorialTone,
} from './editorial-tone-filter.js';

/**
 * Spec: ai-assistance / "Scenario generation",
 *       event-timeline / "Branch View near case end".
 *
 * Callable only when case state is `verdict` or `appeal`. Output is
 * ephemeral — never persisted to dossier tables.
 */
export interface GenerateScenariosDeps {
  readonly cases: CaseRepo;
  readonly scenarios: ScenarioPort;
}

export class GenerateScenarios {
  constructor(private readonly deps: GenerateScenariosDeps) {}

  async execute(input: {
    userId: string;
    caseId: string;
  }): Promise<readonly ProjectedScenario[]> {
    const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!ownedCase) throw new NotFound('Case', input.caseId);
    if (ownedCase.status !== 'verdict' && ownedCase.status !== 'appeal') {
      throw new ApplicationError(
        'scenarios_not_eligible',
        'Scenarios are only available when the case is in verdict or appeal state',
        { status: ownedCase.status },
      );
    }
    const produce = () =>
      this.deps.scenarios.generate({ userId: input.userId, caseId: input.caseId });
    const first = await produce();
    if (first.flatMap((s) => [s.titleBahasa, s.rationaleBahasa, ...s.nextStepsBahasa]).every(
      (t) => detectEditorialTone(t).length === 0,
    )) {
      return first;
    }
    const second = await produce();
    return second.map((scenario) => ({
      titleBahasa: stripEditorialTone(scenario.titleBahasa).safe,
      rationaleBahasa: stripEditorialTone(scenario.rationaleBahasa).safe,
      nextStepsBahasa: scenario.nextStepsBahasa.map((s) => stripEditorialTone(s).safe),
    }));
  }
}
