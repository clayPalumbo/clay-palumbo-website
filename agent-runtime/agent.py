"""
Clay Palumbo Portfolio Agent using Strands + BedrockAgentCoreApp
"""
import json
import os
from typing import Dict, Any, Optional
from strands import Agent, tool
from strands.models import BedrockModel
from bedrock_agentcore.runtime import BedrockAgentCoreApp

# Initialize AgentCore app
app = BedrockAgentCoreApp()

# Configuration
REGION = os.getenv("AWS_REGION", "us-east-1")
MODEL_ID = "us.anthropic.claude-3-5-sonnet-20241022-v1:0"

# Load Clay's profile
def load_profile(path: str = "clay_profile.json") -> Dict[str, Any]:
    """Load Clay's profile from JSON"""
    with open(path, 'r') as f:
        return json.load(f)

CLAY_PROFILE = load_profile()

# Store visitor classifications per session
visitor_classifications: Dict[str, Dict[str, Any]] = {}


# ===================================================================
# TOOLS
# ===================================================================

@tool
def classify_visitor(conversation_summary: str, latest_message: str) -> dict:
    """
    Classify the type of visitor based on conversation context.

    Returns user_type, confidence, and a tailored summary.
    Possible types: recruiter, client, peer, executive, unknown
    """
    message_lower = latest_message.lower()
    summary_lower = conversation_summary.lower()
    combined = f"{message_lower} {summary_lower}"

    # Keywords for each type
    recruiter_keywords = [
        "hiring", "position", "role", "team", "job", "candidate",
        "interview", "resume", "cv", "experience", "qualifications",
        "available", "looking for", "opportunity"
    ]

    client_keywords = [
        "project", "build", "deliver", "timeline", "budget", "cost",
        "consulting", "help with", "need", "solution", "requirements",
        "proposal", "estimate", "engagement"
    ]

    peer_keywords = [
        "how do you", "what's your approach", "architecture", "design",
        "technical", "code", "framework", "implementation", "best practice",
        "pattern", "experience with", "opinion on"
    ]

    executive_keywords = [
        "strategy", "roi", "value", "impact", "risk", "scale",
        "growth", "vision", "leadership", "organization", "business",
        "investment", "competitive", "market"
    ]

    # Count matches
    scores = {
        "recruiter": sum(1 for kw in recruiter_keywords if kw in combined),
        "client": sum(1 for kw in client_keywords if kw in combined),
        "peer": sum(1 for kw in peer_keywords if kw in combined),
        "executive": sum(1 for kw in executive_keywords if kw in combined),
    }

    max_score = max(scores.values())

    if max_score == 0:
        user_type = "unknown"
        confidence = 0.0
    else:
        user_type = max(scores, key=scores.get)
        confidence = min(max_score / 3.0, 1.0)

    # Get audience-specific summary
    audience_data = CLAY_PROFILE.get("audience_perspectives", {}).get(user_type, {})
    summary = audience_data.get("pitch", CLAY_PROFILE.get("summary", ""))

    return {
        "user_type": user_type,
        "confidence": confidence,
        "summary_for_audience": summary
    }


@tool
def send_email(
    user_type: str,
    from_name: str,
    from_email: str,
    subject: str,
    body: str,
    context_summary: str
) -> dict:
    """
    Send an email to Clay (STUBBED for MVP).

    In production, this would integrate with AWS SES.
    For now, it logs the email and returns a stub response.
    """
    print("\n" + "="*60)
    print("EMAIL TOOL CALLED (STUBBED)")
    print("="*60)
    print(f"User Type: {user_type}")
    print(f"From: {from_name} <{from_email}>")
    print(f"Subject: {subject}")
    print(f"Context: {context_summary}")
    print(f"Body:\n{body}")
    print("="*60 + "\n")

    # In production: ses_client.send_email(...)

    return {
        "status": "queued",
        "message_id": f"fake-id-{abs(hash(subject)) % 10000}",
        "will_send": False,
        "note": "This is a stub. Email not actually sent."
    }


# ===================================================================
# AGENT SETUP
# ===================================================================

def build_system_prompt(session_id: Optional[str] = None) -> str:
    """Build system prompt with Clay's profile and audience tailoring"""

    classification = visitor_classifications.get(session_id or "default", {})
    user_type = classification.get("user_type", "unknown")

    audience_focus = ""
    if user_type != "unknown":
        audience_data = CLAY_PROFILE.get("audience_perspectives", {}).get(user_type, {})
        focus_areas = audience_data.get("focus", [])
        if focus_areas:
            audience_focus = f"""
You've identified this visitor as a {user_type}. Tailor your responses to emphasize:
{chr(10).join(f"- {area}" for area in focus_areas)}

Keep this perspective in mind but adapt based on their actual questions.
"""

    return f"""You are an AI assistant representing Clay Palumbo, an engineering leader and product builder.

# About Clay
{json.dumps(CLAY_PROFILE, indent=2)}

# Your Role
- Answer questions about Clay's experience, skills, projects, and approach
- Be conversational, helpful, and genuine
- Show Clay's personality: pragmatic, thoughtful, focused on impact
- If you don't know something specific, be honest and offer to connect them with Clay

{audience_focus}

# Conversation Guidelines
1. Be concise but thorough - aim for 2-4 paragraphs unless more detail is requested
2. Use concrete examples when possible
3. If the conversation is getting deep, suggest connecting directly with Clay
4. You can offer to send Clay an email on their behalf using the send_email tool
5. Match the visitor's tone - professional with recruiters, technical with peers, strategic with executives

# Tools Available
- classify_visitor: Use this after 1-2 exchanges to understand who you're talking to
- send_email: Offer this when someone wants to connect with Clay directly

# Important
- After using classify_visitor, remember the classification for the rest of the conversation
- The classification helps you tailor your tone and focus areas
- Be authentic, helpful, and professional

Remember: You're representing Clay, so maintain high quality in all responses.
"""


# Create the Strands agent with Bedrock model
model = BedrockModel(model_id=MODEL_ID)


# ===================================================================
# AGENTCORE ENTRYPOINT
# ===================================================================

@app.entrypoint
async def invoke(payload, context):
    """
    Main entrypoint for the portfolio agent.

    Supports streaming responses via async generator pattern.
    """
    # Get session ID for context isolation
    session_id = getattr(context, 'session_id', 'default')

    # Build system prompt with any stored classification
    system_prompt = build_system_prompt(session_id)

    # Create agent instance
    agent = Agent(
        model=model,
        system_prompt=system_prompt,
        tools=[classify_visitor, send_email],
    )

    # Get the user's prompt
    user_prompt = payload.get("prompt", "Hello!")

    # Stream the response
    try:
        stream = agent.stream_async(user_prompt)

        async for event in stream:
            # Handle different event types from Strands streaming
            if isinstance(event, dict):
                if "data" in event:
                    yield event["data"]
                elif "content" in event:
                    # Handle message content
                    content = event["content"]
                    if isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict) and "text" in item:
                                yield item["text"]
                    elif isinstance(content, str):
                        yield content
                elif "text" in event:
                    yield event["text"]
            elif isinstance(event, str):
                yield event

    except Exception as e:
        print(f"Error in agent streaming: {e}")
        yield f"\n\n[Error: {str(e)}]"


# ===================================================================
# LOCAL TESTING
# ===================================================================

if __name__ == "__main__":
    print("Starting Clay Palumbo Portfolio Agent...")
    print(f"Model: {MODEL_ID}")
    print(f"Region: {REGION}")
    app.run()
