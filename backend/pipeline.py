from backend.agents.balanced_model_agent import BalancedModelAgent
from backend.agents.classifier import TaskClassifierAgent
from backend.agents.fast_model_agent import FastModelAgent
from backend.agents.high_quality_model_agent import HighQualityModelAgent
from backend.agents.router import RouterAgent
from backend.agents.storage_agent import StorageAgent
from backend.agents.task_intake import TaskIntakeAgent
from backend.council.adversarial_critic import AdversarialCritic
from backend.council.correctness_judge import CorrectnessJudge
from backend.council.efficiency_judge import EfficiencyJudge
from backend.council.final_aggregator import FinalAggregator
from backend.council.reasoning_judge import ReasoningJudge
from backend.council.safety_judge import SafetyJudge
from backend.schemas import EvaluationScore, FinalIntegrationPayload, TaskPayload
from backend.utils.hashing import compute_hash
from backend.utils.runtime_logger import RuntimeLogger


class MarketplacePipeline:
    # ENS names and wallets must match setup.ts / registerAgents.ts (hardhat accounts).
    # account[0] = deployer, account[1] = 0x70997970..., account[2] = 0x3C44Cd...
    agent_ens = {
        "fast_model_agent_v1": "agent1.agentry.eth",
        "balanced_model_agent_v1": "agent2.agentry.eth",
        "high_quality_model_agent_v1": "agent3.agentry.eth",
    }

    agent_wallets = {
        # These must match the wallets registered in setup.ts.
        # account[0] (deployer) is set at runtime; using hardhat defaults for [1] and [2].
        "fast_model_agent_v1": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "balanced_model_agent_v1": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "high_quality_model_agent_v1": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    }

    def __init__(self):
        self.task_intake = TaskIntakeAgent()
        self.classifier = TaskClassifierAgent()
        self.router = RouterAgent()
        self.fast_model = FastModelAgent()
        self.balanced_model = BalancedModelAgent()
        self.high_quality_model = HighQualityModelAgent()
        self.storage = StorageAgent()
        self.correctness_judge = CorrectnessJudge()
        self.reasoning_judge = ReasoningJudge()
        self.efficiency_judge = EfficiencyJudge()
        self.safety_judge = SafetyJudge()
        self.adversarial_critic = AdversarialCritic()
        self.aggregator = FinalAggregator()
        self.runtime_logger = RuntimeLogger()

    def _log_before(self, step: str, agent_id: str, details: dict | None = None) -> None:
        self.runtime_logger.log_step(step, agent_id, "started", details or {})

    def _log_success(self, step: str, agent_id: str, details: dict | None = None) -> None:
        self.runtime_logger.log_step(step, agent_id, "success", details or {})

    def _log_error(self, step: str, agent_id: str, error: Exception) -> None:
        self.runtime_logger.log_step(step, agent_id, "error", {"errorMessage": str(error)})

    def run(self, task_text: str, task_id: str = "task_001") -> FinalIntegrationPayload:
        self.runtime_logger.reset()

        try:
            task_payload = TaskPayload(task_id=task_id, task_text=task_text)
            self._log_before("task_intake", self.task_intake.agent_id, {"taskId": task_id})
            intake_result = self.task_intake.process(task_payload)
            self._log_success("task_intake", self.task_intake.agent_id, {"taskId": task_id})
        except Exception as error:
            self._log_error("task_intake", self.task_intake.agent_id, error)
            raise

        try:
            self._log_before("task_classification", self.classifier.agent_id, {"taskId": task_id})
            classification = self.classifier.classify(intake_result)
            self._log_success(
                "task_classification",
                self.classifier.agent_id,
                {
                    "taskId": task_id,
                    "taskType": classification.task_type,
                    "difficulty": classification.difficulty,
                    "priority": classification.priority,
                },
            )
        except Exception as error:
            self._log_error("task_classification", self.classifier.agent_id, error)
            raise

        try:
            self._log_before("routing", self.router.agent_id, {"taskId": task_id})
            routing = self.router.route(classification)
            self._log_success(
                "routing",
                self.router.agent_id,
                {
                    "taskId": task_id,
                    "selectedAgentIds": routing.selected_agent_ids,
                    "routingReason": routing.routing_reason,
                },
            )
        except Exception as error:
            self._log_error("routing", self.router.agent_id, error)
            raise

        model_outputs = []
        for agent_id in routing.selected_agent_ids:
            try:
                self._log_before("model_execution", agent_id, {"taskId": task_id})
                if agent_id == self.fast_model.agent_id:
                    output = self.fast_model.execute(intake_result)
                elif agent_id == self.balanced_model.agent_id:
                    output = self.balanced_model.execute(intake_result)
                elif agent_id == self.high_quality_model.agent_id:
                    output = self.high_quality_model.execute(intake_result)
                else:
                    raise ValueError(f"Unknown model agent: {agent_id}")
                model_outputs.append(output)
                self._log_success(
                    "model_execution",
                    agent_id,
                    {
                        "taskId": task_id,
                        "latencyMs": output.latency_ms,
                        "costEstimate": output.cost_estimate,
                        "outputHash": output.output_hash,
                    },
                )
            except Exception as error:
                self._log_error("model_execution", agent_id, error)
                raise

        output_records = []
        for output in model_outputs:
            try:
                self._log_before(
                    "storage_write",
                    self.storage.agent_id,
                    {"taskId": task_id, "sourceAgentId": output.agent_id},
                )
                record = self.storage.store(output.model_dump())
                output_records.append(record)
                self._log_success(
                    "storage_write",
                    self.storage.agent_id,
                    {
                        "taskId": task_id,
                        "sourceAgentId": output.agent_id,
                        "outputURI": record.uri,
                        "contentHash": record.content_hash,
                    },
                )
            except Exception as error:
                self._log_error("storage_write", self.storage.agent_id, error)
                raise

        evaluations = []
        for output in model_outputs:
            correctness = self._evaluate_judge("correctness_judge", self.correctness_judge, output, task_id)
            reasoning = self._evaluate_judge("reasoning_judge", self.reasoning_judge, output, task_id)
            efficiency = self._evaluate_judge("efficiency_judge", self.efficiency_judge, output, task_id)
            safety = self._evaluate_judge("safety_judge", self.safety_judge, output, task_id)
            adversarial = self._evaluate_judge("adversarial_critic", self.adversarial_critic, output, task_id)
            evaluations.append(
                EvaluationScore(
                    task_id=output.task_id,
                    agent_id=output.agent_id,
                    correctness=correctness,
                    reasoning=reasoning,
                    efficiency=efficiency,
                    safety=safety,
                    adversarial_robustness=adversarial,
                )
            )

        aggregated_results = []
        for score, output in zip(evaluations, model_outputs):
            try:
                self._log_before(
                    "aggregation",
                    self.aggregator.agent_id,
                    {"taskId": task_id, "sourceAgentId": output.agent_id},
                )
                result = self.aggregator.aggregate(score, output)
                aggregated_results.append(result)
                self._log_success(
                    "aggregation",
                    self.aggregator.agent_id,
                    {
                        "taskId": task_id,
                        "sourceAgentId": output.agent_id,
                        "finalScore": result.final_score,
                    },
                )
            except Exception as error:
                self._log_error("aggregation", self.aggregator.agent_id, error)
                raise

        try:
            self._log_before("final_output", self.aggregator.agent_id, {"taskId": task_id})
            winner = max(aggregated_results, key=lambda item: item.final_score)
            agent_payloads = []
            for output, result, record in zip(model_outputs, aggregated_results, output_records):
                agent_payloads.append(
                    {
                        "agentId": output.agent_id,
                        "agentEns": self.agent_ens[output.agent_id],
                        "agentWallet": self.agent_wallets[output.agent_id],
                        "outputURI": record.uri,
                        "evaluationURI": result.evaluation_uri,
                        "outputHash": output.output_hash,
                        "evaluationHash": compute_hash(result.model_dump()),
                        "finalScore": result.final_score,
                        "latencyMs": output.latency_ms,
                        "costEstimate": output.cost_estimate,
                    }
                )

            final_payload = FinalIntegrationPayload(
                taskId=task_id,
                taskType=classification.task_type,
                agents=agent_payloads,
                winner={
                    "agentId": winner.agent_id,
                    "agentWallet": self.agent_wallets[winner.agent_id],
                    "finalScore": winner.final_score,
                },
                totalReward="1000000000000000000",
            )
            self._log_success(
                "final_output",
                self.aggregator.agent_id,
                {
                    "taskId": task_id,
                    "winnerAgentId": winner.agent_id,
                    "winnerFinalScore": winner.final_score,
                    "agentCount": len(agent_payloads),
                },
            )
        except Exception as error:
            self._log_error("final_output", self.aggregator.agent_id, error)
            raise

        return final_payload

    def _evaluate_judge(self, step: str, judge, output, task_id: str) -> float:
        try:
            self._log_before(
                step,
                judge.agent_id,
                {"taskId": task_id, "sourceAgentId": output.agent_id},
            )
            score = judge.evaluate(output)
            self._log_success(
                step,
                judge.agent_id,
                {"taskId": task_id, "sourceAgentId": output.agent_id, "score": score},
            )
            return score
        except Exception as error:
            self._log_error(step, judge.agent_id, error)
            raise
