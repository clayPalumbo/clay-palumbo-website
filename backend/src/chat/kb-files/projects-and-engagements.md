# Projects & Engagements

## Project: GenAI Architecture Assistant Platform (Energy Provider)

Role: Solution Architect and Hands-on Engineer  
Company: Energy client engagement for a leading U.S. energy provider (via Slalom Build)  
Dates: January 2024 – Present  
Team: 12-person cross-functional team (engineers, designers, data engineers, product)

### Problem and Context

For this GenAI Architecture Assistant Platform, the client needed a generative AI–powered system to help employees make architecture-aligned technology decisions and navigate a complex ecosystem of standards, systems, and services. The goal was to move from manual tribal knowledge and scattered documents to a single AI hub that could provide guided, policy-compliant answers and recommendations grounded in enterprise standards.

### High-Level Architecture

For the GenAI Architecture Assistant Platform, Clay designed a three-repository system:

- Frontend UI: Angular application for chat, search, and admin experiences.
- Backend API: NestJS / TypeScript application that orchestrates data access, agents, and business logic.
- Data Pipelines: Python-based AWS serverless stack powering ingestion, transformation, indexing, and analytics.

### Clay’s Responsibilities – Architecture

On the GenAI Architecture Assistant Platform, Clay was responsible for overall architecture:

- Designed the end-to-end architecture spanning Angular UI, NestJS backend, data pipelines, Amazon RDS (Postgres), and ElasticSearch.
- Defined the multi-agent and advanced retrieval-augmented generation (RAG) strategy using Amazon Bedrock and Bedrock Agent Core, including memory patterns and tool orchestration flows.
- Designed search and retrieval flows so AI agents could query both structured data (Postgres) and unstructured data (ElasticSearch) in a unified way.
- Architected multiple data pipelines for ingestion, transformation, and indexing into ElasticSearch, as well as pipelines for analytics and reporting integrations.

### Clay’s Responsibilities – Engineering

On the GenAI Architecture Assistant Platform, Clay contributed at the code level across frontend, backend, and data.

Frontend (Angular):

- Built and reviewed Angular components that power the chat interface, search views, and admin configuration screens.
- Used RxJS extensively for asynchronous workflows and streaming responses from the backend.
- Integrated the Angular UI with AWS Cognito for authentication and authorization.
- Defined communication patterns between the UI and backend via RESTful APIs with clear request and response contracts.

Backend (NestJS / TypeScript):

- Implemented and maintained a NestJS backend deployed on ECS Fargate behind an Application Load Balancer.
- Integrated the backend with Amazon ECR for container registry and Amazon RDS (Postgres) for transactional and relational data.
- Built RESTful endpoints that consumed upstream GraphQL services to aggregate and normalize data for both the UI and the AI agents.
- Implemented advanced RAG flows and tool-calling logic leveraging Amazon Bedrock and Bedrock Agent Core, including memory and context management patterns.
- Integrated Taliby for internet search, using it as a complementary signal to internal knowledge where appropriate and safe.

Data Pipelines:

- Built and maintained multiple data pipelines using AWS services such as S3, Lambda, Step Functions, SNS, EventBridge, and ElasticSearch.
- Implemented ingestion flows to keep ElasticSearch indices in sync with source-of-truth systems.
- Integrated with Power BI and helped define dataflows, semantic models, and reports to provide analytics on system usage, retrieval quality, and business value.

### Cloud and Platform Responsibilities

For the GenAI Architecture Assistant Platform, Clay owned key cloud and platform decisions:

- Deployed the Angular UI to S3 with a CloudFront distribution and Route 53 for DNS.
- Integrated AWS Cognito for authentication and user management.
- Architected ECS Fargate workloads with ALB routing, health checks, and observability around latency and error rates.
- Chose and configured Amazon RDS (Postgres) for relational storage and ElasticSearch for search and retrieval.
- Helped define IAM, networking, and environment strategies for development, test, and production environments.

### CI/CD and Infrastructure as Code

For the GenAI Architecture Assistant Platform, Clay led automation and infrastructure as code:

- Implemented fully automated CI/CD pipelines for the frontend, backend, and data pipelines using GitHub Actions.
- Used AWS CDK to provision and manage infrastructure across multiple environments, including application stacks, databases, ECS services, and supporting AWS resources.
- Ensured repeatable, auditable deployments and straightforward environment spin-up and tear-down, improving reliability and reducing manual operations work.

### Tech Stack for the GenAI Architecture Assistant Platform

Frontend:

- Angular (expert level)
- RxJS for asynchronous flows and streaming
- Deployed to AWS S3 and CloudFront
- Authentication via AWS Cognito

Backend:

- NestJS (TypeScript)
- Deployed on ECS Fargate behind an ALB
- Container images stored in Amazon ECR
- Amazon RDS (Postgres) for persistent data
- Integrations with REST and GraphQL upstream services

Data and Search:

- ElasticSearch as the search engine and RAG backing store
- S3, Lambda, Step Functions, SNS, and EventBridge for data pipelines
- Power BI for reporting and semantic models

GenAI:

- Amazon Bedrock for foundation models
- Bedrock Agent Core for tools, memory, and orchestration
- Advanced RAG patterns and tool orchestration across multiple agents
- Taliby for internet search, used as a supplemental signal

DevOps and Infrastructure:

- GitHub Actions CI/CD pipelines
- AWS CDK for infrastructure as code
- Multi-environment deployment strategy (development, test, production)

Self-Assessed Proficiency:

- TypeScript: Expert
- Angular: Expert
- Serverless patterns on AWS: Advanced
- Python for pipelines and backend services: Advanced

### Outcomes and Impact

On the GenAI Architecture Assistant Platform, Clay helped achieve:

- Moving the application from concept to production in under a year (from January to October).
- Providing a single AI hub for architecture guidance, enabling employees to quickly find architecture-aligned answers instead of searching scattered documentation.
- Establishing a reusable pattern for multi-agent orchestration, advanced RAG, and AI-driven decision support that can be extended to additional use cases and applications at the client.

### Story Snippets for Behavioral Answers

Debugging a complex system:

- On the GenAI Architecture Assistant Platform, Clay investigated end-to-end flows across Angular, NestJS, Postgres, ElasticSearch, and Bedrock when latency or retrieval issues appeared.
- He used observability tools on ECS Fargate tasks, ALB metrics, and application logs to isolate problematic containers and backend flows, then worked with the team to implement targeted fixes.

Handling ambiguity:

- The GenAI Architecture Assistant Platform started from a vague “AI for architecture decisions” idea.
- Clay collaborated with stakeholders to define concrete user journeys, capabilities, and constraints, then turned those into epics, stories, and architectural blueprints that guided the team from proof of concept to production.

Leading the team:

- On this project, Clay provided architectural direction while pairing with engineers on critical code paths and high-risk features.
- He set standards for API design, TypeScript quality, and pipeline structure, and worked closely with product and leadership to sequence work so value was delivered incrementally.

---

## Project: AI Center of Excellence – Skills, Assistants, and Intent Platform (Energy Provider)

Role: Solution Architect and Lead Engineer  
Company: Energy provider engagement for a large U.S. energy provider (via Slalom Build)  
Dates: April 2024 – December 2024  
Focus: Developer-focused AI Center of Excellence, internal AI platform, tools, and engines

### Problem and Context

For this AI Center of Excellence project, the client wanted more than a single chat-style application. They needed a developer-focused AI platform with shared engines, standards, and frameworks that any team could plug into. The goal was to make it easy for internal teams to:

- Connect their APIs to large language models in a secure, standardized way.
- Create reusable assistants and personas with consistent behavior.
- Build classifier and intent systems without custom one-off code.

### Clay’s Responsibilities – Architecture and Platforms

On the AI Center of Excellence, Clay co-designed the overall architecture for a suite of AI platform services:

- Skills Engine: framework to connect APIs to LLMs via OpenAPI specs, operating as a shared tool layer.
- Assistants Platform: internal “build-your-own-GPT” feature set for creating reusable personas and system instructions.
- Intent Engine: LLM-powered classifier-as-a-service that internal teams could configure and call.

Clay ensured that these engines integrated cleanly with the client’s internal chat-style AI application and existing platform services, so product teams could adopt the platform without rewriting their applications.

### Skills Engine (MCP-like framework, pre-MCP)

For the AI Center of Excellence, Clay helped lead development of the Skills Engine:

- Built a platform where teams could register standardized OpenAPI specifications and automatically expose those APIs as callable “skills” to LLMs.
- Implemented support for multiple authentication mechanisms, including OAuth, so users could sign in as themselves and have the LLM act on their behalf.
- Supported full CRUD semantics through GET, POST, PATCH, and other HTTP methods to enable rich tool usage.
- Designed the Skills Engine as a shared, reusable platform service consumed by the broader internal AI application.

### Assistants and Personas Platform

On the AI Center of Excellence, Clay led the Assistants initiative:

- Built functionality that allowed users to create tailored personas with system instructions, user instructions, tone, and guardrails.
- Exposed options for model selection across Bedrock and Azure OpenAI, along with controls such as temperature and other generation parameters.
- Enabled custom skill bindings from the Skills Engine so assistants could call the right tools safely.

Clay also built an internal agentic framework inspired by the ReAct (Reason–Act) pattern:

- Agents reasoned about the user’s query.
- Agents acted by calling tools and skills exposed by the Skills Engine.
- Agents then re-evaluated whether they had enough information to answer, leading to a consistent Reason–Act–Reason loop embedded into the platform.

### Unified Converse Interface

For the AI Center of Excellence, Clay designed and implemented a unified “converse” interface:

- Created a single API and abstraction layer that allowed users and services to talk to Amazon Bedrock models and OpenAI models via Azure OpenAI.
- Standardized input and output formats so product teams could interact with different models through one consistent interface.
- Anticipated patterns later seen in generic model router services, but implemented them internally before they were broadly available.

### Intent Engine (Classifier-as-a-Service)

On the AI Center of Excellence, Clay created an Intent Engine:

- Built a separate service that allowed product teams to define labels and intents, provide example training data, and use LLMs to classify arbitrary inputs.
- Exposed the Intent Engine as a service that teams could call for routing, triage, and workflow decisioning.
- Achieved adoption by more than ten internal teams, making the Intent Engine a shared building block for multiple applications.

### Engineering and Implementation Details

Backend and Engines:

- Core platform backend implemented with NestJS and Postgres, using Elastic or OpenSearch for search and retrieval.
- Deployed on ECS Fargate with multiple services in the cluster, including:
  - Real-time service using Socket.io.
  - AI APIs.
  - Core APIs serving configuration and metadata.
- Integrated with Amazon Bedrock and Azure OpenAI for model access.

Skills Engine and Intent Engine:

- Skills Engine and Intent Engine implemented in Python with FastAPI.
- Designed these engines as standalone platform services consumed by the main AI application and other services across the organization.

Frontend:

- Contributed to the Angular frontend, especially the configuration UIs for assistants, skills, and intents.
- Implemented real-time streaming UX with Socket.io to support conversational experiences and live updates.

### Tech Stack for the AI Center of Excellence

Frontend:

- Angular for UI and configuration experiences.
- Socket.io for streaming UI updates and real-time chat.

Backend and Engines:

- NestJS (TypeScript) with Postgres for core platform services.
- Elastic or OpenSearch for search and retrieval.
- Python and FastAPI for the Skills Engine and Intent Engine.

Cloud and Platform:

- ECS Fargate cluster hosting multiple services.
- Integrations with Amazon Bedrock and Azure OpenAI for model access.

Patterns:

- Agentic workflows using a ReAct-style Reason–Act–Reason loop.
- Shared, reusable platform services (skills, assistants, intents) instead of one-off application logic.

### Outcomes and Impact

On the AI Center of Excellence, Clay helped the client:

- Establish a developer-oriented AI Center of Excellence with reusable engines instead of isolated solutions.
- Enable internal teams to:
  - Plug their APIs into LLMs quickly via the Skills Engine.
  - Spin up tailored assistants without reinventing core agent logic.
  - Use the Intent Engine for classification and routing instead of building custom classifiers.

This AI Center of Excellence work laid much of the groundwork for the later GenAI platform that moved from concept to production, giving the client a strategic foundation for future AI use cases.
