from app.schemas.dataset import GraphDatasetPayload


def _dataset(name: str, nodes: list[dict], edges: list[dict]) -> GraphDatasetPayload:
    return GraphDatasetPayload(name=name, directed=False, nodes=nodes, edges=edges)


DATASET_LIBRARY = {
    "Cora Citation Network": _dataset(
        "Cora Citation Network",
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
    ),
    "PubMed": _dataset(
        "PubMed",
        nodes=[
            {"id": "p0", "label": 0, "features": [0.8, 0.2, 0.4, 0.6], "display": {"x": 8, "y": 42}},
            {"id": "p1", "label": 0, "features": [0.7, 0.3, 0.5, 0.5], "display": {"x": 18, "y": 16}},
            {"id": "p2", "label": 1, "features": [0.2, 0.9, 0.7, 0.2], "display": {"x": 33, "y": 12}},
            {"id": "p3", "label": 1, "features": [0.3, 0.8, 0.8, 0.3], "display": {"x": 48, "y": 22}},
            {"id": "p4", "label": 1, "features": [0.2, 0.7, 0.9, 0.4], "display": {"x": 62, "y": 10}},
            {"id": "p5", "label": 2, "features": [0.4, 0.4, 0.8, 0.8], "display": {"x": 78, "y": 20}},
            {"id": "p6", "label": 2, "features": [0.5, 0.3, 0.7, 0.9], "display": {"x": 90, "y": 40}},
            {"id": "p7", "label": 2, "features": [0.6, 0.2, 0.6, 0.7], "display": {"x": 82, "y": 66}},
            {"id": "p8", "label": 3, "features": [0.7, 0.7, 0.2, 0.2], "display": {"x": 62, "y": 80}},
            {"id": "p9", "label": 3, "features": [0.8, 0.8, 0.1, 0.3], "display": {"x": 42, "y": 86}},
            {"id": "p10", "label": 3, "features": [0.7, 0.6, 0.2, 0.4], "display": {"x": 20, "y": 76}},
            {"id": "p11", "label": 0, "features": [0.9, 0.4, 0.2, 0.6], "display": {"x": 10, "y": 58}},
        ],
        edges=[
            {"id": "pe0", "source": "p0", "target": "p1", "weight": 1},
            {"id": "pe1", "source": "p1", "target": "p2", "weight": 1},
            {"id": "pe2", "source": "p2", "target": "p3", "weight": 1},
            {"id": "pe3", "source": "p3", "target": "p4", "weight": 1},
            {"id": "pe4", "source": "p4", "target": "p5", "weight": 1},
            {"id": "pe5", "source": "p5", "target": "p6", "weight": 1},
            {"id": "pe6", "source": "p6", "target": "p7", "weight": 1},
            {"id": "pe7", "source": "p7", "target": "p8", "weight": 1},
            {"id": "pe8", "source": "p8", "target": "p9", "weight": 1},
            {"id": "pe9", "source": "p9", "target": "p10", "weight": 1},
            {"id": "pe10", "source": "p10", "target": "p11", "weight": 1},
            {"id": "pe11", "source": "p11", "target": "p0", "weight": 1},
            {"id": "pe12", "source": "p0", "target": "p3", "weight": 1},
            {"id": "pe13", "source": "p2", "target": "p5", "weight": 1},
            {"id": "pe14", "source": "p4", "target": "p7", "weight": 1},
            {"id": "pe15", "source": "p6", "target": "p9", "weight": 1},
            {"id": "pe16", "source": "p8", "target": "p11", "weight": 1},
            {"id": "pe17", "source": "p10", "target": "p1", "weight": 1},
        ],
    ),
    "Citeseer": _dataset(
        "Citeseer",
        nodes=[
            {"id": "c0", "label": 0, "features": [0.9, 0.2, 0.1, 0.8], "display": {"x": 12, "y": 18}},
            {"id": "c1", "label": 0, "features": [0.8, 0.3, 0.1, 0.7], "display": {"x": 28, "y": 10}},
            {"id": "c2", "label": 1, "features": [0.2, 0.8, 0.8, 0.2], "display": {"x": 46, "y": 18}},
            {"id": "c3", "label": 1, "features": [0.3, 0.7, 0.9, 0.2], "display": {"x": 64, "y": 12}},
            {"id": "c4", "label": 2, "features": [0.4, 0.5, 0.8, 0.7], "display": {"x": 80, "y": 22}},
            {"id": "c5", "label": 2, "features": [0.5, 0.4, 0.7, 0.8], "display": {"x": 84, "y": 48}},
            {"id": "c6", "label": 3, "features": [0.7, 0.6, 0.2, 0.3], "display": {"x": 68, "y": 72}},
            {"id": "c7", "label": 3, "features": [0.8, 0.7, 0.1, 0.2], "display": {"x": 44, "y": 82}},
            {"id": "c8", "label": 2, "features": [0.6, 0.3, 0.6, 0.8], "display": {"x": 22, "y": 74}},
            {"id": "c9", "label": 1, "features": [0.3, 0.8, 0.7, 0.4], "display": {"x": 10, "y": 48}},
        ],
        edges=[
            {"id": "ce0", "source": "c0", "target": "c1", "weight": 1},
            {"id": "ce1", "source": "c1", "target": "c2", "weight": 1},
            {"id": "ce2", "source": "c2", "target": "c3", "weight": 1},
            {"id": "ce3", "source": "c3", "target": "c4", "weight": 1},
            {"id": "ce4", "source": "c4", "target": "c5", "weight": 1},
            {"id": "ce5", "source": "c5", "target": "c6", "weight": 1},
            {"id": "ce6", "source": "c6", "target": "c7", "weight": 1},
            {"id": "ce7", "source": "c7", "target": "c8", "weight": 1},
            {"id": "ce8", "source": "c8", "target": "c9", "weight": 1},
            {"id": "ce9", "source": "c9", "target": "c0", "weight": 1},
            {"id": "ce10", "source": "c0", "target": "c4", "weight": 1},
            {"id": "ce11", "source": "c2", "target": "c7", "weight": 1},
            {"id": "ce12", "source": "c5", "target": "c9", "weight": 1},
            {"id": "ce13", "source": "c1", "target": "c8", "weight": 1},
        ],
    ),
}

AVAILABLE_DATASETS = [*DATASET_LIBRARY.keys(), "Custom JSON"]


def get_available_datasets() -> list[str]:
    return AVAILABLE_DATASETS.copy()


def get_dataset(dataset_name: str) -> GraphDatasetPayload:
    for name, dataset in DATASET_LIBRARY.items():
        if name.lower() == dataset_name.strip().lower():
            return dataset.model_copy(deep=True)
    raise ValueError("Dataset not found")


def get_default_dataset() -> GraphDatasetPayload:
    return get_dataset("Cora Citation Network")


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
