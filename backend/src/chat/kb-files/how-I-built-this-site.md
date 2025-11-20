## Project: Personal AI Resume Site (claypalumbo.com)

- Role: Full-Stack Engineer & Architect
- Purpose: Interactive “Digital Clay” that acts as a conversational resume and portfolio.

### Overview

Built a personal AI-powered resume site over a weekend using AWS and modern frontend tooling. The site lets visitors chat with an AI version of Clay that can answer questions about his experience, projects, skills, and background.

### Frontend

- Framework: **React** with **Vite** for fast dev/build tooling.
- Styling: **Tailwind CSS** for a modern, minimalist UI.
- Hosting:
  - Static build deployed to **Amazon S3**.
  - Fronted by **CloudFront** as a CDN for global performance.
  - Custom domain registered and managed via **Route 53**.
- Development:
  - Leveraged **Claude Code** and multiple **MCP servers** (e.g., Context7) to rapidly scaffold components, iterate on UX, and wire up API integrations.

### Backend & AI

- Architecture: Fully **serverless** backend.
- Entry point: **API Gateway** exposing HTTP endpoints for the frontend.
- Compute: Multiple **AWS Lambda** functions that:
  - Orchestrate conversations with the LLM.
  - Stream responses back to the frontend for a real-time chat experience.
- AI:
  - Uses **Amazon Bedrock** as the model platform.
  - Currently powered by **Anthropic Claude Sonnet 4.5**.
  - Integrates **AWS Knowledge Bases** to provide RAG-style responses grounded in Clay’s resume, projects, and custom documentation.

### Infrastructure & Automation

- **AWS CDK** used as Infrastructure as Code:
  - Defines S3 buckets, CloudFront distribution, Route 53 records, API Gateway, Lambdas, and Bedrock integrations.
  - Enables repeatable, one-command deployments and environment updates.

### Highlights

- Demonstrates end-to-end ownership of a modern, AI-enabled web application:
  - Frontend UX, backend APIs, streaming, and infra.
- Serves as a live example of Clay’s approach to:
  - RAG and knowledge bases
  - Serverless patterns
  - Production-ready AI experiences on AWS.
