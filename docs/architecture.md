# Architecture

The Python marketplace backend runs a mock multi-agent pipeline:

1. task intake
2. task classification
3. routing
4. model execution
5. mock 0G storage writes
6. council evaluation
7. aggregation
8. final Web3-ready JSON output

Runtime execution is recorded in `outputs/runtime_trace.json`.
