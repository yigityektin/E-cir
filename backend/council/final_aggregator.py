from backend.schemas import AggregatedResult, EvaluationScore, ModelOutput


class FinalAggregator:
    agent_id = "final_aggregator_v1"

    def aggregate(self, score: EvaluationScore, output: ModelOutput) -> AggregatedResult:
        final_score = (
            0.40 * score.correctness
            + 0.20 * score.reasoning
            + 0.15 * score.efficiency
            + 0.15 * score.adversarial_robustness
            + 0.10 * score.safety
        )

        return AggregatedResult(
            task_id=score.task_id,
            agent_id=score.agent_id,
            final_score=round(final_score * 100),
            correctness=score.correctness,
            reasoning=score.reasoning,
            efficiency=score.efficiency,
            safety=score.safety,
            adversarial_robustness=score.adversarial_robustness,
            evaluation_uri=f"0g://mock/eval_{score.agent_id}",
            evaluation_hash=output.output_hash,
        )
