# UML Diagrams

System analysis models for UniDocs (PED 741, Assignment 3). Requirements they trace to: [System Requirements Specification](../specifications.md).

All diagrams are text-based [Mermaid](https://mermaid.js.org/) and render directly on GitHub.

## Behavioral models — [`behavioral/`](behavioral/)

| Diagram | Content |
| --- | --- |
| [Use case diagram](behavioral/use-case-diagram.md) | 6 actors, 10 use cases with `«include»` / `«extend»`, tabular specification of every use case |
| [Activity diagrams](behavioral/activity-diagram.md) | Swimlanes *Client UI · API Gateway · Backend/Database*: (1) submit a request, (2) approve, sign and issue |
| [State machine diagrams](behavioral/state-machine-diagram.md) | Lifecycles with guards: (1) certificate request, (2) document, (3) session |

## Structural and data-flow models — [`structural/`](structural/)

| Diagram | Content |
| --- | --- |
| [CRC cards](structural/crc-cards.md) | Class–Responsibility–Collaborator cards for the web client, guards, services and integration interfaces |
| [Class diagrams](structural/class-diagram.md) | (1) Domain model with typed attributes and multiplicities, (2) service layer with visibility and method signatures |
| [Sequence diagrams](structural/sequence-diagram.md) | HTTP message flow with `alt` / `else` error paths: (1) `POST /api/requests`, (2) approve a step, (3) public verification |

## Related

- [Database ERD (Crow's Foot)](../database-erd.md) — Assignment 2
- [Architecture](../architecture.md), [API](../api-documentation.md), [Approval workflow](../approval-workflow.md)
