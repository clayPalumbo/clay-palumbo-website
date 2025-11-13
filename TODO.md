# Clay Palumbo Portfolio - Implementation TODO

## ✅ Phase 1: Project Scaffolding
- [x] Initialize monorepo structure
- [x] Add shared config (ESLint, Prettier, TypeScript)
- [x] Create project root package.json with workspaces
- [ ] Initialize /infra, /frontend, /backend, /agent-runtime directories

## 🏗️ Phase 2: Infrastructure (AWS CDK)
- [ ] Create CDK project in /infra
- [ ] Define S3 bucket for frontend hosting
- [ ] Define CloudFront distribution with custom domain
- [ ] Define Route 53 A/AAAA alias records
- [ ] Request and configure ACM certificate (us-east-1)
- [ ] Define API Gateway HTTP API
- [ ] Define Lambda functions (chat + email)
- [ ] Define ECR repository for agent runtime
- [ ] Output API URLs and ARNs
- [ ] Add deployment scripts

## 🤖 Phase 3: Agent Runtime (Strands + Docker)
- [ ] Create Dockerfile
- [ ] Install Strands framework and dependencies
- [ ] Create Clay's profile/knowledge base (JSON/markdown)
- [ ] Define core agent with system prompt
- [ ] Implement classification tool (user type detection)
- [ ] Implement email tool (stubbed)
- [ ] Wire tools into Strands agent
- [ ] Create HTTP server for Lambda integration
- [ ] Build and test container locally
- [ ] Push to ECR

## 🔧 Phase 4: Backend (Lambda + API Gateway)
- [ ] Create TypeScript project in /backend
- [ ] Implement /api/chat/stream handler
  - [ ] Accept message history
  - [ ] Call agent runtime
  - [ ] Stream responses via SSE
- [ ] Implement /api/email/send handler
  - [ ] Accept email payload
  - [ ] Log and return stub response
- [ ] Configure environment variables
- [ ] Add unit tests
- [ ] Bundle for Lambda deployment

## 🎨 Phase 5: Frontend (React + Vite + Tailwind)
- [ ] Initialize Vite + React + TypeScript app
- [ ] Add Tailwind CSS configuration
- [ ] Implement chat UI components
  - [ ] Chat log with message bubbles
  - [ ] Input box with send button
  - [ ] Typing indicator
  - [ ] Streaming message rendering
- [ ] Implement API client for streaming
- [ ] Add audience classification display
- [ ] Create "Email Clay" modal
  - [ ] Form fields (name, email, subject, body)
  - [ ] Integration with /api/email/send
- [ ] Create hero/landing section
- [ ] Add suggested starter prompts
- [ ] Build and test locally
- [ ] Configure for production (API URLs)

## 🔗 Phase 6: Integration & Configuration
- [ ] Wire CloudFront to Route 53
- [ ] Verify HTTPS works
- [ ] Update frontend build config with API base URL
- [ ] Test end-to-end flow
  - [ ] Frontend → API Gateway → Lambda → Agent → LLM → Stream back
- [ ] Test classification tool
- [ ] Test email stub

## 📚 Phase 7: Documentation
- [ ] Create README.md
  - [ ] Architecture overview
  - [ ] Local development setup
  - [ ] Deployment instructions
  - [ ] Extension guide
- [ ] Create AGENT_DESIGN.md
  - [ ] Agent behavior description
  - [ ] Tools documentation
  - [ ] Prompting strategy
  - [ ] Audience tailoring approach
- [ ] Add inline code comments
- [ ] Create deployment runbook

## 🚀 Phase 8: Deployment & Testing
- [ ] Deploy infrastructure (CDK)
- [ ] Build and push agent container
- [ ] Deploy Lambda functions
- [ ] Build and deploy frontend to S3
- [ ] Invalidate CloudFront cache
- [ ] End-to-end smoke test
- [ ] Performance testing
- [ ] Security review

## 🔮 Future Enhancements (Post-MVP)
- [ ] Real SES email integration
- [ ] Session persistence (DynamoDB)
- [ ] Analytics and metrics
- [ ] Multi-turn conversation improvements
- [ ] Projects showcase integration
- [ ] Resume/CV download
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring and alerting
- [ ] Rate limiting
- [ ] Authentication (optional)
