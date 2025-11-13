# Agent Design - Clay Palumbo Portfolio

This document describes the design, behavior, and implementation of the AI agent powering claypalumbo.com.

## Overview

The agent is built using **Strands** (AI agent framework) running on **AWS Bedrock AgentCore**. It's designed to be a conversational interface to Clay's professional background, adapting its responses based on the type of visitor.

## Architecture

### Technology Stack

- **Framework**: Strands AI Agents
- **Runtime**: AWS Bedrock AgentCore
- **Model**: Claude 3.5 Sonnet (via Bedrock)
- **Deployment**: Docker container in AWS ECR
- **Language**: Python 3.11+

### Components

```
┌─────────────────────────────────────┐
│   Lambda (Chat Handler)             │
│   - Receives user messages          │
│   - Forwards to AgentCore           │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│   AWS Bedrock AgentCore             │
│   - Runtime environment             │
│   - Session management              │
│   - Observability                   │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│   Strands Agent (Docker)            │
│   ┌───────────────────────────────┐ │
│   │  System Prompt                │ │
│   │  - Clay's profile             │ │
│   │  - Behavior guidelines        │ │
│   │  - Audience adaptation        │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │  Tools                        │ │
│   │  - classify_visitor           │ │
│   │  - send_email                 │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │  Knowledge Base               │ │
│   │  - clay_profile.json          │ │
│   └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Agent Behavior

### Core Personality

The agent represents Clay with these characteristics:

- **Tone**: Conversational, helpful, genuine
- **Style**: Pragmatic, thoughtful, impact-focused
- **Approach**: Concrete examples, honest about limitations
- **Length**: Concise but thorough (2-4 paragraphs typical)

### Knowledge Base

The agent has access to Clay's profile via `clay_profile.json`:

```json
{
  "name": "Clay Palumbo",
  "experience": [...],
  "technologies": {...},
  "strengths": [...],
  "approach": {...},
  "audience_perspectives": {...},
  "projects_highlight": [...]
}
```

This profile is embedded in the system prompt, giving the agent full context about Clay's background.

## Audience Classification

One of the agent's key features is detecting and adapting to different visitor types.

### Visitor Types

1. **Recruiter**
   - Focus: Skills, experience, team fit, impact
   - Indicators: "hiring", "position", "role", "candidate", "resume"
   - Response style: Emphasize qualifications and outcomes

2. **Client**
   - Focus: Delivery, reliability, business outcomes
   - Indicators: "project", "consulting", "help with", "solution"
   - Response style: Emphasize value delivery and track record

3. **Peer** (Engineer/Technical)
   - Focus: Technical depth, architecture, practices
   - Indicators: "how do you", "architecture", "technical", "best practice"
   - Response style: Technical detail, honest tradeoffs

4. **Executive**
   - Focus: Strategy, value creation, organizational impact
   - Indicators: "strategy", "roi", "value", "impact", "leadership"
   - Response style: Big picture, business alignment

5. **Unknown**
   - Default when no clear classification
   - Response style: Balanced, probes to understand intent

### Classification Tool

```python
@tool
def classify_visitor(conversation_summary: str, latest_message: str) -> dict:
    """
    Analyzes conversation to determine visitor type.

    Returns:
    - user_type: One of the 5 types above
    - confidence: 0.0 to 1.0
    - summary_for_audience: Tailored pitch
    """
```

**Algorithm**:
1. Extract keywords from messages
2. Score each visitor type based on keyword matches
3. Select highest-scoring type
4. Calculate confidence based on match strength
5. Retrieve audience-specific summary from profile

**Usage**:
- Called automatically after 1-2 exchanges
- Classification stored for session
- System prompt updated with audience focus areas

### Adaptation Examples

**For Recruiter:**
> "Clay has scaled engineering teams from 5 to 50+ people, with a track record of retaining top talent and delivering high-impact features. His leadership style combines technical depth with clear communication, making him effective at both hands-on development and strategic planning."

**For Client:**
> "Clay specializes in delivering quality solutions on time. His approach combines deep technical expertise with business acumen - he'll help you solve complex problems while managing risk and ensuring reliable delivery."

**For Peer:**
> "Clay values clean code, simple solutions, and continuous improvement. He's pragmatic about technology choices, focusing on what actually works in production. Strong believer in developer experience and making the team more productive."

**For Executive:**
> "Clay thinks strategically about product, technology, and people. He's proven at aligning technical execution with business objectives, managing technical risk, and building organizations that scale."

## Tools

### 1. classify_visitor

**Purpose**: Detect visitor type and adapt responses

**Inputs**:
- `conversation_summary`: Brief summary of conversation
- `latest_message`: Most recent user message

**Outputs**:
- `user_type`: Detected type
- `confidence`: Confidence score (0-1)
- `summary_for_audience`: Tailored summary

**When Used**: After 1-2 exchanges, or when agent detects need

**Implementation**: Keyword-based heuristic (could be upgraded to LLM-based classification)

### 2. send_email

**Purpose**: Allow visitors to contact Clay directly

**Inputs**:
- `user_type`: Classification (for context)
- `from_name`: Visitor's name
- `from_email`: Visitor's email
- `subject`: Email subject
- `body`: Email body
- `context_summary`: Conversation summary

**Outputs**:
- `status`: "queued" or "failed"
- `message_id`: Unique identifier
- `will_send`: Boolean (false in MVP)
- `note`: Explanation

**Current State**: Stubbed - logs email and returns fake ID

**Future**: Will integrate with AWS SES to actually send emails

## System Prompt

The agent's system prompt includes:

1. **Identity**: "You are an AI assistant representing Clay Palumbo..."

2. **Knowledge**: Full profile JSON embedded

3. **Role Guidelines**:
   - Answer questions about experience/skills/projects
   - Be conversational and genuine
   - Use concrete examples
   - Offer to connect directly if needed

4. **Audience Adaptation** (if classified):
   - "You've identified this visitor as a [type]"
   - Focus areas for that audience
   - Reminder to stay flexible

5. **Tool Instructions**:
   - When to use classify_visitor
   - When to offer send_email
   - How to use tools effectively

6. **Quality Guidelines**:
   - Response length targets
   - Tone matching
   - Honesty about limitations

## Streaming

The agent supports streaming responses via AgentCore:

```python
@app.entrypoint
async def invoke(payload, context):
    # ... setup ...

    stream = agent.stream_async(user_prompt)

    async for event in stream:
        # Handle different event types
        if isinstance(event, dict):
            if "text" in event:
                yield event["text"]
        elif isinstance(event, str):
            yield event
```

This provides a better UX with tokens appearing as they're generated.

## Session Management

- **Session ID**: Generated on first message, persisted
- **Context**: Maintained by AgentCore runtime
- **Classification**: Stored per session, survives across messages
- **No Persistence**: MVP doesn't save conversations (could add DynamoDB)

## Prompting Strategy

### Initial Response (First Message)

- Warm, welcoming tone
- Offer to help with common questions
- Gently probe for visitor intent
- Suggest using classification tool

### Follow-Up Responses

- Reference previous context
- Adapt based on classification
- Provide concrete examples
- Offer deeper dive or direct connection

### Tool Usage

- **classify_visitor**: Use early, but not on first message
- **send_email**: Offer when:
  - Conversation goes deep
  - Visitor asks how to connect
  - Discussion suggests follow-up needed

## Example Conversation Flows

### Flow 1: Recruiter

```
User: "I'm looking for an engineering leader for my startup. Tell me about your experience."

Agent: [Uses classify_visitor tool]
       [Detects: recruiter, confidence: 0.8]

       "Thanks for your interest! I'm Clay's AI agent. I'd be happy to tell you about his background.

       Clay has extensive experience leading engineering teams and building products from 0 to 1. He's scaled teams from 5 to 50+ engineers while maintaining quality and velocity. His approach combines hands-on technical depth with strategic thinking - he can architect systems and write production code, but also set vision and mentor teams.

       Some highlights:
       - Built and scaled engineering orgs at [companies]
       - Deep expertise in AI/ML systems and agent frameworks
       - Track record of hiring and retaining top talent
       - Strong focus on developer experience and team productivity

       What aspects of his background would be most relevant for your role?"

User: "What's his technical stack?"

Agent: "Clay is a polyglot engineer with deep experience across multiple stacks:

       **Languages**: TypeScript, Python, Go, JavaScript, Java
       **Cloud**: AWS (deep expertise), GCP, Azure
       **AI/ML**: Anthropic Claude, OpenAI, LangChain, Strands, custom agent frameworks
       ...

       He's pragmatic about technology choices - focused on what works in production and what enables the team to move fast.

       Would you like me to put you in touch with Clay directly to discuss the role?"

User: "Yes, please"

Agent: [Uses send_email tool]
       "Great! I can help you reach out to Clay. Let me get some info..."
```

### Flow 2: Peer (Technical)

```
User: "What's your approach to building AI agent systems?"

Agent: [Uses classify_visitor tool]
       [Detects: peer, confidence: 0.7]

       "Clay takes a pragmatic approach to agent systems:

       1. **Start simple**: Get a basic loop working before adding complexity
       2. **Composable tools**: Build small, well-defined tools that do one thing well
       3. **Observability first**: Can't improve what you can't measure
       4. **Streaming**: Always stream responses for better UX
       5. **Production-ready**: Think about error handling, rate limits, costs from day 1

       He's a big fan of frameworks like Strands that provide structure without over-engineering. The key is balancing flexibility with guardrails.

       This site is actually built with Strands on AWS AgentCore - the agent you're talking to right now uses those patterns!"

User: "How do you handle tool reliability?"

Agent: "Good question! Clay's approach to tool reliability:

       **Design for failure**:
       - Every tool should have a clear error mode
       - Return structured errors the agent can understand
       - Never let a tool crash the whole agent

       **Timeouts and retries**:
       - Set reasonable timeouts (don't let tools hang)
       - Retry transient failures, but fail fast on permanent ones
       - Exponential backoff for rate limits

       **Testing**:
       - Unit test tools in isolation
       - Integration tests with real agent loops
       - Failure injection to test error handling

       **Monitoring**:
       - Log every tool invocation
       - Track success/failure rates
       - Alert on anomalies

       In production, he's found that **circuit breakers** are essential - if a tool is failing consistently, stop calling it and degrade gracefully."
```

## Testing Strategy

### Unit Tests

- Test tools in isolation
- Mock LLM responses
- Verify classification logic

### Integration Tests

- Full agent loops with real LLM
- Verify tool calling
- Check response quality

### Manual Testing

- Conversation flows for each audience type
- Edge cases (empty messages, very long messages)
- Tool invocation scenarios

## Monitoring & Observability

Via AgentCore:
- **Invocations**: Count, latency, errors
- **Tool Usage**: Which tools, success rates
- **Token Usage**: Cost tracking
- **Session Metrics**: Length, turns per session

Via CloudWatch:
- **Lambda Logs**: Request/response logs
- **Error Rates**: Failed invocations
- **Latency**: P50, P95, P99

## Future Enhancements

1. **Memory**: Persist conversations in DynamoDB
2. **Real Email**: Integrate AWS SES
3. **Better Classification**: Use LLM for visitor detection
4. **Multi-turn Planning**: Agent plans conversation flow
5. **Context Retrieval**: RAG over Clay's blog posts/projects
6. **Proactive Suggestions**: Agent suggests next topics
7. **Analytics**: Track common questions, optimize responses

## Performance Targets

- **Latency**: < 2s for first token
- **Throughput**: 100+ req/min
- **Availability**: 99.9%
- **Cost**: < $0.10 per conversation

## Security & Privacy

- **No PII Storage**: MVP doesn't persist conversations
- **Email Validation**: Basic checks on email addresses
- **Rate Limiting**: Via API Gateway
- **Input Sanitization**: No code execution in messages
- **Model Safety**: Claude has built-in safety features

## Maintenance

### Updating the Profile

1. Edit `clay_profile.json`
2. Rebuild Docker image
3. Push to ECR
4. AgentCore automatically picks up new version

### Tuning Responses

- Adjust system prompt in `agent.py`
- Modify classification thresholds
- Add/remove focus areas for each audience

### Adding Tools

1. Define tool with `@tool` decorator
2. Add to agent initialization
3. Document in system prompt
4. Test thoroughly

## Conclusion

This agent design balances:
- **Sophistication**: Smart audience detection and adaptation
- **Simplicity**: Clear, composable architecture
- **Production-Ready**: Built on enterprise-grade AgentCore
- **Extensibility**: Easy to add features and tools

The result is a conversational interface that genuinely represents Clay and provides value to visitors.
