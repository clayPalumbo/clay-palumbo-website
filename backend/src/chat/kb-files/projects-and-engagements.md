# Projects & Engagements

## Project: GenAI Architecture Assistant Platform (Energy Provider)

- Role: Solution Architect & Hands-on Engineer
- Company: Slalom Build (for a leading U.S. energy provider)
- Dates: January 2024 – Present (approx. 11 months)
- Team: 12-person cross-functional team (engineers, designers, data engineers, product)

### Problem / Context

The client needed a generative AI–powered platform to help employees make architecture-aligned technology decisions and navigate a complex ecosystem of standards, systems, and services. The goal was to move from manual tribal knowledge and scattered docs to a single AI hub that could provide guided, policy-compliant answers and recommendations.

### High-Level Architecture

The system is organized into three main repositories:

1. Frontend UI (Angular)
2. Backend API (NestJS / TypeScript)
3. Data Pipelines (Python-based AWS serverless stack)

### Clay's Responsibilities

Architecture

- Designed the end-to-end architecture for the GenAI platform, spanning UI, backend, data pipelines, RDS, and ElasticSearch.
- Defined the multi-agent and advanced RAG strategy using Amazon Bedrock and Bedrock Agent Core, including memory patterns and tool orchestration.
- Designed search and retrieval flows so AI agents could query both structured data (Postgres) and unstructured data (ElasticSearch).
- Architected multiple data pipelines for ingestion, transformation, and indexing into Elastic, as well as analytics and reporting integrations.

Engineering

- Frontend:
  - Built and reviewed Angular components leveraging RxJS for asynchronous workflows.
  - Integrated the UI with AWS Cognito for authentication and authorization.
  - Defined communication patterns with the backend via RESTful APIs.
- Backend:
  - Implemented and maintained a NestJS (TypeScript) backend deployed on ECS Fargate behind an ALB.
  - Integrated with Amazon ECR for container registry and Amazon RDS (Postgres) for transactional and relational data.
  - Built RESTful endpoints while consuming upstream GraphQL services to aggregate and normalize data for the UI and agents.
  - Implemented advanced RAG flows and tool-calling logic leveraging Bedrock and Bedrock Agent Core, including memory and context management.
  - Integrated Taliby for internet search as a complementary signal to internal knowledge where appropriate.
- Data Pipelines:
  - Built and maintained multiple data pipelines using AWS services such as S3, Lambda, Step Functions, SNS, EventBridge, and Elastic.
  - Implemented ingestion flows to keep ElasticSearch indices up to date with source-of-truth systems.
  - Integrated with Power BI and helped define dataflows, semantic models, and reports to provide analytics on system usage and value.

Cloud & Platform

- Deployed the Angular UI to S3 with a CloudFront distribution and Route 53 for DNS.
- Integrated AWS Cognito for authentication.
- Architected ECS Fargate workloads with ALB routing and observability around latency and error rates.
- Leveraged Amazon RDS (Postgres) for relational storage and ElasticSearch for search & retrieval.
- Helped define IAM, networking, and environment strategies for dev, test, and prod.

CI/CD & Infrastructure as Code

- Implemented fully automated CI/CD pipelines for all three repositories using GitHub Actions.
- Used AWS CDK to provision and manage infrastructure across three environments, including application stacks, databases, ECS services, and supporting AWS resources.
- Ensured repeatable, auditable deployments and straightforward environment spin-up/tear-down.

### Tech Stack

- Frontend:
  - Angular (expert)
  - RxJS
  - Deployed to AWS S3 + CloudFront
  - Auth via AWS Cognito
- Backend:
  - NestJS (TypeScript)
  - Deployed on ECS Fargate behind an ALB
  - Container images in Amazon ECR
  - Amazon RDS (Postgres)
  - Integrations with REST and GraphQL upstream services
- Data & Search:
  - ElasticSearch as search engine and RAG backing store
  - S3, Lambda, Step Functions, SNS, EventBridge for pipelines
  - Power BI for reporting and semantic models
- GenAI:
  - Amazon Bedrock
  - Bedrock Agent Core for tools and memory
  - Advanced RAG patterns and tool orchestration
  - Taliby for internet search
- DevOps & Infra:
  - GitHub Actions CI/CD
  - AWS CDK for infrastructure as code
  - Multi-environment deployment strategy (e.g., dev/test/prod)
- Proficiency (self-assessed):
  - TypeScript: Expert
  - Angular: Expert
  - Serverless patterns on AWS: Advanced
  - Python (for pipelines and backend services): Advanced
  - WordPress: Advanced (separate skill, not directly used on this project but part of overall profile)

### Outcomes / Impact

- Took the application from concept to production in under a year (January to October).
- Provided a single AI hub for architecture guidance, allowing employees to quickly find architecture-aligned answers instead of navigating scattered documentation.
- Established a reusable pattern for multi-agent orchestration, advanced RAG, and AI-driven decision support that can be extended to additional use cases and applications at the client.

### Story Snippets (for behavioral answers)

- Debugging a complex system:
  - Investigated end-to-end flows across Angular, NestJS, Postgres, Elastic, and Bedrock when latency or retrieval issues appeared.
  - Used observability on ECS Fargate tasks and ALB metrics to isolate problematic containers and backend flows.
- Handling ambiguity:
  - Started from a vague “AI for architecture decisions” idea and collaborated with stakeholders to define concrete user journeys, capabilities, and constraints.
  - Turned those into epics, stories, and architectural blueprints that guided the team from POC to production.
- Leading the team:
  - Provided architectural direction while pairing with engineers on critical code paths.
  - Set standards for API design, TypeScript quality, and pipeline structure.
  - Worked closely with product and leadership to sequence work so value was delivered incrementally.

## Project: AI Center of Excellence – Skills, Assistants & Intent Platform (Energy Provider)

- Role: Solution Architect & Lead Engineer
- Company: Slalom Build (for a large U.S. energy provider)
- Dates: April 2024 – December 2024
- Focus: Developer-focused Center of Excellence, internal AI platform, tools and engines

### Problem / Context

The client wanted more than a single “ChatGPT-style” app – they needed a **developer-focused AI Center of Excellence**: shared engines, standards, and frameworks that any team could plug into. The goal was to make it easy for internal teams to:

- Connect their APIs to LLMs in a secure, standardized way  
- Create reusable assistants/personas with consistent behavior  
- Build classifier/intent systems without custom one-off code  

### Clay's Responsibilities

Architecture & Platforms

- Co-designed the overall architecture for a suite of AI platform services:
  - **Skills Engine** – framework to connect APIs to LLMs via OpenAPI specs
  - **Assistants** – internal “build-your-own-GPT” feature set
  - **Intent Engine** – LLM-powered classifier-as-a-service
- Ensured these engines integrated cleanly with the client’s internal chat-style AI application and existing platform services.

Skills Engine (MCP-like framework, pre-MCP)

- Helped **lead development of the Skills Engine**, a platform for connecting LLMs to internal and external APIs.
- Allowed teams to register a standardized **OpenAPI spec** and automatically expose that API as a callable “skill” to LLMs.
- Implemented support for **multiple authentication mechanisms** (including OAuth) so users could sign in as themselves and have the LLM act on their behalf.
- Supported full CRUD semantics via GET/POST/PATCH/etc. for rich tool use.
- Designed the Skills Engine as a shared, reusable platform service used by the broader internal AI application.

Assistants / Personas Platform

- Led the development of an **Assistants initiative** that let users create their own tailored personas, including:
  - System instructions, user instructions, and tone
  - Model selection (Bedrock and Azure OpenAI)
  - Temperature and other generation controls
  - Custom skill bindings from the Skills Engine
- Built an internal **agentic framework** from scratch, influenced by the ReAct (Reason–Act) pattern:
  - Models “reason” about the user’s query
  - “Act” by calling tools/skills
  - Then re-evaluate whether they have sufficient information to answer
- Embedded these patterns into the platform so agents behaved consistently across use cases.

Unified Converse Interface

- Designed and implemented a **unified “converse” interface** that allowed users and services to talk to:
  - All supported **Amazon Bedrock models**
  - **OpenAI models** via Azure OpenAI
- Standardized input/output formats so product teams could interact with different models through a single, consistent API.
- Anticipated patterns later seen in external tooling (e.g., generic model routers), but implemented internally before those were broadly available.

Intent Engine (Classifier-as-a-Service)

- Created an **Intent Engine** as a separate service that allowed product teams to build LLM-powered classifiers via a UI.
- Teams could define labels/intents and training examples; the service wrapped LLMs to return classifications for arbitrary inputs.
- Used by **10+ internal teams**, becoming a shared building block for routing, triage, and workflow decisioning.

Engineering & Implementation

- Backend:
  - Core platform backend built with **NestJS** and **Postgres**, leveraging **Elastic/OpenSearch** for search and retrieval.
  - Deployed on **ECS Fargate** with multiple services in the cluster:
    - Real-time service (Socket.io)
    - AI APIs
    - Core APIs
  - Integrated with both **Amazon Bedrock** and **Azure OpenAI**.
- Engines:
  - **Skills Engine** and **Intent Engine** implemented in **Python** with **FastAPI**.
  - Designed to run as standalone platform services consumed by the main application.
- Frontend:
  - Contributed to the **Angular** frontend, including configuration UIs for assistants, skills, and intents.
  - Implemented real-time streaming UX with **Socket.io** for conversational experiences.

### Tech Stack

- Frontend:
  - Angular
  - Socket.io for streaming UI updates
- Backend & Engines:
  - NestJS (TypeScript), Postgres
  - Elastic / OpenSearch
  - Python + FastAPI (Skills Engine, Intent Engine)
- Cloud & Platform:
  - ECS Fargate cluster with multiple services
  - Integrations with Amazon Bedrock and Azure OpenAI
- Patterns:
  - Agentic workflows using a ReAct-style Reason–Act–Reason loop
  - Shared, reusable platform services (skills, assistants, intents) rather than one-off app logic

### Outcomes / Impact

- Established a **developer-oriented AI Center of Excellence** with reusable engines instead of siloed solutions.
- Enabled internal teams to:
  - Plug their APIs into LLMs quickly via the Skills Engine
  - Spin up tailored assistants without reinventing core logic
  - Use the Intent Engine for classification and routing instead of building custom classifiers
- Laid much of the groundwork for the later GenAI platform that moved from concept to production the following year.
