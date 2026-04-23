from app.schemas.dataset import GraphDatasetPayload

AVAILABLE_DATASETS = [
    "Cora Citation Network",
    "PubMed",
    "Citeseer",
    "Custom JSON",
]


def get_available_datasets() -> list[str]:
    return AVAILABLE_DATASETS.copy()


def get_default_dataset() -> GraphDatasetPayload:
    return GraphDatasetPayload(
        name="Cora Citation Network",
        directed=False,
        nodes=[
            {"id": "v0", "label": 0, "features": [0.9, 0.3, 0.2, 0.7], "display": {"x": 16, "y": 36}},
            {"id": "v1", "label": 0, "features": [0.8, 0.2, 0.1, 0.5], "display": {"x": 28, "y": 14}},
            {"id": "v2", "label": 1, "features": [0.1, 0.7, 0.8, 0.3], "display": {"x": 46, "y": 24}},
            {"id": "v3", "label": 1, "features": [0.2, 0.8, 0.9, 0.4], "display": {"x": 64, "y": 16}},
            {"id": "v4", "label": 2, "features": [0.4, 0.3, 0.8, 0.9], "display": {"x": 82, "y": 34}},
            {"id": "v5", "label": 2, "features": [0.5, 0.2, 0.7, 0.8], "display": {"x": 69, "y": 58}},
            {"id": "v6", "label": 3, "features": [0.7, 0.7, 0.3, 0.2], "display": {"x": 45, "y": 66}},
            {"id": "v7", "label": 3, "features": [0.8, 0.6, 0.2, 0.1], "display": {"x": 24, "y": 58}},
        ],
        edges=[
            {"id": "e0", "source": "v0", "target": "v1", "weight": 1},
            {"id": "e1", "source": "v0", "target": "v2", "weight": 1},
            {"id": "e2", "source": "v1", "target": "v2", "weight": 1},
            {"id": "e3", "source": "v2", "target": "v3", "weight": 1},
            {"id": "e4", "source": "v3", "target": "v4", "weight": 1},
            {"id": "e5", "source": "v4", "target": "v5", "weight": 1},
            {"id": "e6", "source": "v5", "target": "v6", "weight": 1},
            {"id": "e7", "source": "v6", "target": "v7", "weight": 1},
            {"id": "e8", "source": "v7", "target": "v0", "weight": 1},
            {"id": "e9", "source": "v2", "target": "v6", "weight": 1},
        ],
    )


def validate_dataset(payload: GraphDatasetPayload) -> GraphDatasetPayload:
    dataset_name = payload.name.strip()
    if not dataset_name:
        raise ValueError("Dataset name cannot be empty")
    if not payload.nodes:
        raise ValueError("Dataset must include at least one node")
    if any(not node.id.strip() for node in payload.nodes):
        raise ValueError("Every node must have a non-empty id")

    normalized_nodes = [node.model_copy(update={"id": node.id.strip()}) for node in payload.nodes]
    node_ids = {node.id for node in normalized_nodes}
    if len(node_ids) != len(normalized_nodes):
        raise ValueError("Node ids must be unique")

    normalized_edges = []
    for index, edge in enumerate(payload.edges):
        source = edge.source.strip()
        target = edge.target.strip()
        if source not in node_ids or target not in node_ids:
            raise ValueError("Every edge must reference existing node ids")
        normalized_edges.append(
            edge.model_copy(
                update={
                    "source": source,
                    "target": target,
                    "id": edge.id or f"e{index}",
                    "weight": 1.0 if edge.weight is None else edge.weight,
                }
            )
        )

    return payload.model_copy(
        update={
            "name": dataset_name,
            "nodes": normalized_nodes,
            "edges": normalized_edges,
        }
    )
