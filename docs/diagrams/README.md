# UML Diagrams

System analysis models for UniDocs (PED 741, Assignment 3). Requirements they trace to: [System Requirements Specification](../specifications.md).

All diagrams are text-based [Mermaid](https://mermaid.js.org/) and render directly on GitHub.

## Behavioral models — [`behavioral/`](behavioral/)

| Diagram | Content |
| --- | --- |
| [Use case diagram](behavioral/use-case-diagram.md) | 6 human and 3 system actors, 15 use cases with `«include»` / `«extend»`, tabular specifications |
| [Activity diagram](behavioral/activity-diagram.md) | Submit a certificate request (UC-03) in three swimlanes, one per layer |
| [State machine diagrams](behavioral/state-machine-diagram.md) | Lifecycles with guards: (1) certificate request, (2) document, (3) session |

## Structural and data-flow models — [`structural/`](structural/)

| Diagram | Content |
| --- | --- |
| [CRC cards](structural/crc-cards.md) | Class–Responsibility–Collaborator cards for backend entities, business rules, services, guards and providers |
| [Class diagrams](structural/class-diagram.md) | (1) Domain model with typed attributes and multiplicities, (2) service layer with visibility and method signatures |
| [Sequence diagrams](structural/sequence-diagram.md) | HTTP message flow with `alt` / `else` error paths: (1) approve the current workflow step, (2) public QR verification |

## Related

- [Database ERD (Crow's Foot)](../database-erd.md) — Assignment 2
- [Architecture](../architecture.md), [API](../api-documentation.md), [Approval workflow](../approval-workflow.md)
