from backend.schemas import ClassificationResult, RoutingDecision


class RouterAgent:
    agent_id = "router_agent_v1"

    def route(self, classification: ClassificationResult) -> RoutingDecision:
        if classification.priority == "fast":
            selected = [
                "fast_model_agent_v1",
                "balanced_model_agent_v1",
                "high_quality_model_agent_v1",
            ]
        elif classification.priority == "high_quality":
            selected = [
                "high_quality_model_agent_v1",
                "balanced_model_agent_v1",
                "fast_model_agent_v1",
            ]
        else:
            selected = [
                "balanced_model_agent_v1",
                "fast_model_agent_v1",
                "high_quality_model_agent_v1",
            ]

        return RoutingDecision(
            task_id=classification.task_id,
            selected_agent_ids=selected,
            routing_reason=f"Selected {selected} for priority {classification.priority}",
        )
