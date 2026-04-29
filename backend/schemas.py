from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class TaskPayload(BaseModel):
    task_id: str = Field(..., description="Unique task identifier")
    task_text: str = Field(..., description="User-provided task description")
    metadata: Optional[dict] = Field(default_factory=dict, description="Optional task metadata")


class ClassificationResult(BaseModel):
    task_id: str
    task_type: Literal["coding", "analysis", "creative", "qa", "other"]
    difficulty: Literal["low", "medium", "high"]
    priority: Literal["fast", "balanced", "high_quality"]


class RoutingDecision(BaseModel):
    task_id: str
    selected_agent_ids: List[str]
    routing_reason: str


class ModelOutput(BaseModel):
    task_id: str
    agent_id: str
    agent_label: str
    output_text: str
    confidence: float
    latency_ms: int
    cost_estimate: float
    output_uri: str
    output_hash: str


class StorageRecord(BaseModel):
    record_id: str
    uri: str
    content_hash: str
    payload: dict
    storage_type: Literal["0g", "mock"]


class EvaluationScore(BaseModel):
    task_id: str
    agent_id: str
    correctness: float
    reasoning: float
    efficiency: float
    safety: float
    adversarial_robustness: float


class AggregatedResult(BaseModel):
    task_id: str
    agent_id: str
    final_score: int
    correctness: float
    reasoning: float
    efficiency: float
    safety: float
    adversarial_robustness: float
    evaluation_uri: str
    evaluation_hash: str


class FinalIntegrationPayload(BaseModel):
    taskId: str
    taskType: Literal["coding", "analysis", "creative", "qa", "other"]
    agents: List[dict]
    winner: dict
    totalReward: str
