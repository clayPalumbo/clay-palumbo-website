# Tech Stack & Languages

This document captures Clay Palumbo’s technology stack, language proficiency, and how those skills map to real projects.

---

## Languages

### TypeScript
- Proficiency: Expert
- Primary Use:
  - Frontend applications with Angular and React
  - Backend services with NestJS and Node.js
  - Shared models and types across full-stack systems
- Example Projects:
  - GenAI Architecture Assistant Platform (Energy Provider) – Angular UI and NestJS backend
- Notes:
  - Drives type-safe APIs, domain models, and refactor-friendly codebases.
  - Frequently used to define contracts between frontend, backend, and AI orchestration layers.

### JavaScript
- Proficiency: Expert
- Primary Use:
  - Web applications (React, Angular)
  - Node.js services and tooling
- Example Projects:
  - Design system / marketing sites (React, Node.js)
  - Earlier frontend-heavy roles building high-traffic web experiences
- Notes:
  - Deep experience across browser environments, build tooling, and SPA architecture.
  - Don't really use at this point with preference of Typescript for type-saftey

### Python
- Proficiency: Advanced
- Primary Use:
  - Backend services and API layers
  - Data pipelines and automation
  - GenAI / RAG orchestration and integration with cloud services
- Example Projects:
  - GenAI Architecture Assistant Platform – data pipelines for Elastic, analytics, and AI workflows.
  - Backend RESTful services with FastAPI
- Notes:
  - Comfortable structuring Python codebases for maintainability and testability.

### SQL
- Proficiency: Advanced
- Primary Use:
  - Querying and modeling relational data in Postgres and other RDBMS
  - Reporting and analytics use cases
- Example Projects:
  - GenAI Architecture Assistant Platform – Postgres (Amazon RDS) for application and configuration data.
- Notes:
  - Designs schemas to support both transactional and analytics-oriented workloads.

### Java
- Proficiency: Intermediate–Advanced
- Primary Use:
  - Backend and platform services (earlier roles)
- Example Projects:
  - Healthcare provider application for a fortune 100 company
  - Enterprise financial and security-focused systems in prior positions.
- Notes:
  - Comfortable reading, extending, and integrating with existing Java services.

### GraphQL (Query Language)
- Proficiency: Advanced (consumer)
- Primary Use:
  - Consuming GraphQL APIs from backend services
  - Aggregating and reshaping data for RESTful frontends and AI agents
- Example Projects:
  - GenAI Architecture Assistant Platform – NestJS backend consuming upstream GraphQL endpoints and exposing REST APIs.

### Other / Supporting Languages & Markup
- HTML, CSS/SCSS: Expert for UI development and component libraries.
- JSON/YAML: Heavy use for configuration, IaC (CDK), API specs, and orchestration.
- Bash/CLI: Regularly used for dev tooling, automation, and environment management.

---

## Frameworks & Libraries

### Frontend

#### Angular
- Proficiency: Expert
- Usage:
  - Primary SPA framework for complex enterprise applications.
  - Heavy use of RxJS for stateful async workflows and stream-based UI patterns.
- Example Projects:
  - GenAI Architecture Assistant Platform – main UI in Angular.
- Notes:
  - Comfortable designing module structure, routing, shared component libraries, and architecting large Angular apps.

#### React
- Proficiency: Advanced
- Usage:
  - Frontend experiences and design systems, especially marketing and high-traffic sites.
- Example Projects:
  - Component libraries and web properties serving hundreds of thousands of monthly visitors.
- Notes:
  - Familiar with hooks, context, and design-system driven development.

#### RxJS
- Proficiency: Advanced
- Usage:
  - Stream-based state and async orchestration in Angular apps.
- Example Projects:
  - GenAI Architecture Assistant Platform – UI side async flows, API calls, and state handling.

#### Other Frontend Tools
- HTML, CSS, SCSS, modern build pipelines (Webpack/Vite/angular.json & friends).
- UI libraries and design system approaches.

---

### Backend

#### NestJS (Node.js / TypeScript)
- Proficiency: Advanced–Expert
- Usage:
  - Structuring backend services with modular architecture, dependency injection, and clear domain boundaries.
- Example Projects:
  - GenAI Architecture Assistant Platform – core backend, REST APIs, integrations with GraphQL, Bedrock, Elastic, and Postgres.

#### Node.js
- Proficiency: Advanced
- Usage:
  - REST APIs, microservices, utility services, and integration layers.
- Example Projects:
  - Multiple backend services in client projects and internal tools.

#### FastAPI (Python)
- Proficiency: Advanced
- Usage:
  - Lightweight API services and GenAI-adjacent or data-heavy endpoints.
- Example Projects:
  - AI and data-focused proof-of-concepts and services.

---

## Cloud & Infrastructure

### AWS
- Certification: AWS Certified Solutions Architect – Associate
- Proficiency: Advanced
- Core Services (hands-on use):
  - **Compute & Containers**: ECS Fargate, Lambda, Docker, ECR
  - **Storage & Networking**: S3, CloudFront, Route 53, VPC, ALB
  - **Auth & Security**: Cognito, IAM
  - **Data**: RDS (Postgres), S3-based data lakes
  - **Integration & Orchestration**: Step Functions, EventBridge, SNS
- Example Projects:
  - GenAI Architecture Assistant Platform – full stack on AWS with ECS Fargate, RDS, Elastic, Bedrock, and serverless data pipelines.

### Azure
- Proficiency: Intermediate–Advanced
- Usage:
  - Cloud hosting, application services, and integration for prior client engagements.

---

## Data & Search

### Relational Databases
- Postgres (Amazon RDS)
  - Proficiency: Advanced
  - Usage: Application data, configuration, and analytics support.
- Other RDBMS experience from earlier roles (e.g., SQL Server / other enterprise RDBMS).

### Search & Retrieval
- ElasticSearch
  - Proficiency: Advanced
  - Usage:
    - Backing search engine for GenAI and RAG workflows.
    - Indexing structured + unstructured data for fast retrieval.
- Vector / RAG-style retrieval
  - Proficiency: Advanced
  - Usage:
    - Designing RAG pipelines and retrieval patterns for multi-agent systems.

### Analytics & Reporting
- Power BI
  - Proficiency: Intermediate
  - Usage:
    - Building dataflows, semantic models, and reports tied into application usage and value measurement.

---

## GenAI & AI Platforms

### Amazon Bedrock
- Proficiency: Advanced
- Usage:
  - Foundation models for chat and reasoning.
  - Underlying infrastructure for multi-agent and RAG systems.

### Bedrock Agent Core
- Proficiency: Advanced
- Usage:
  - Multi-agent orchestration, tool execution, and conversational memory.
  - Designing tools and memory strategies for complex workflows.

### RAG & Orchestration
- Proficiency: Advanced
- Patterns:
  - Advanced RAG that goes beyond “single call to a vector store”:
    - Multi-step plans
    - Tool calling
    - Combining Elastic search with model reasoning and external APIs
  - Retrieval across large corpora (1M+ records) with strong success rates.

### External Search Integration
- Talivy (internet search integration)
  - Proficiency: Intermediate–Advanced
  - Usage:
    - Augmenting internal knowledge with web search for broader context where allowed.

---

### Real-Time & Streaming (Socket.io)

- Built real-time, event-driven application features using **Socket.io** on Node.js.
- Designed bi-directional streaming APIs for live updates, status tracking, and collaborative workflows.
- Implemented message routing, client session management, and reconnection logic for high-availability use cases.
- Integrated WebSocket streams with backend services and database persistence layers.
- Experience optimizing payload structure and emission frequency to reduce bandwidth cost and improve perceived latency.
- Used in production systems where users required immediate feedback without page refresh or polling.


## DevOps, CI/CD & Infrastructure as Code

### CI/CD
- GitHub Actions
  - Proficiency: Advanced
  - Usage:
    - Fully automated pipelines for multi-repo applications (frontend, backend, data pipelines).
    - Build, test, deploy across dev/test/prod environments.
- Bitbucket Pipelines
  - Proficiency: Advanced
  - Usage:
    - CI/CD in earlier projects and teams.

### Infrastructure as Code
- AWS CDK
  - Proficiency: Advanced
  - Usage:
    - Provisioning and managing infrastructure for ECS services, Lambdas, RDS, networking, and supporting AWS resources.
- Terraform
  - Proficiency: Intermediate–Advanced
  - Usage:
    - Environment provisioning and cloud resource management in prior engagements.

### Containers & Tooling
- Docker
  - Proficiency: Advanced
  - Usage:
    - Containerizing apps and agents.
    - Collaborating with platform teams on ECS Fargate deployments.

---

## Other Tools & Platforms

### WordPress
- Proficiency: Advanced
- Usage:
  - Building and customizing content-driven sites.
  - Integrating with broader digital experiences when needed.

### Design & Collaboration
- Figma, design systems, and working closely with UX/UI teams.
- Jira, Confluence, and other agile tooling for backlog and documentation.

---

## Skills-to-Project Index (Initial)

> This section will grow as more projects are added.

- **GenAI Architecture Assistant Platform (Energy Provider)**
  - Languages:
    - TypeScript (Expert) – Angular UI, NestJS backend
    - Python (Advanced) – data pipelines and supporting services
    - SQL (Advanced) – Postgres (RDS)
    - JavaScript – general ecosystem and tooling
  - Frameworks:
    - Angular, RxJS, NestJS, Node.js
  - Cloud:
    - AWS: S3, CloudFront, Route 53, Cognito, ECS Fargate, ECR, RDS (Postgres), Lambda, Step Functions, SNS, EventBridge
  - Data & Search:
    - ElasticSearch, Postgres, S3-based pipelines
  - GenAI:
    - Amazon Bedrock, Bedrock Agent Core, advanced RAG patterns, Talivy search integration
  - DevOps:
    - GitHub Actions, AWS CDK, Docker

