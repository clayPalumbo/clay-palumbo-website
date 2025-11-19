
export default function About() {
  const highlights = [
    { label: "Role", value: "Software Architect / Technical Lead @ Slalom" },
    { label: "Focus", value: "Full-Stack, Distributed Systems, Generative AI" },
    { label: "Cloud", value: "AWS (Certified Solutions Architect), Azure" },
    { label: "Architecture", value: "Microservices, Serverless, Event-Driven Systems" },
    { label: "Languages & Frameworks", value: "TypeScript, Python, Java, React, Angular, Node.js" },
    { label: "Database & Data Systems", value: "PostgreSQL, DynamoDB, MongoDB, ElasticSearch" },
  ];

  return (
    <section id="about" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-12 tracking-tight">
          About Clay
        </h2>

        <div className="grid md:grid-cols-[2fr,1fr] gap-8 md:gap-12">
          {/* Narrative Column */}
          <div className="space-y-6">
            <p className="text-[15px] md:text-[16px] leading-relaxed text-gray-300 max-w-[65ch]">
              I'm a Software Architect and hands-on Full Stack Engineer focused on building intelligent, scalable systems, especially in the generative AI space. I bring a balance of deep technical execution and architectural leadership, having led the design and implementation of cloud-native platforms end to end.
            </p>

            <p className="text-[15px] md:text-[16px] leading-relaxed text-gray-300 max-w-[65ch]">
              Recently, I led a 12-person cross-functional team to deliver a multi-agent AI platform for a major U.S. energy provider - owning both the architecture and a large share of the core engineering work. I designed and implemented key services, data flows, and integrations, combining large-scale data pipelines, advanced retrieval-augmented generation, and AI agent orchestration workflows that put LLMs into real, production use for thousands of enterprise users.
            </p>

            <p className="text-[15px] md:text-[16px] leading-relaxed text-gray-300 max-w-[65ch]">
              My background spans frontend and backend engineering, data systems, and cloud architecture (AWS certified). I care about reliable, maintainable software that actually ships - whether I'm defining a roadmap, mentoring engineers, or writing the critical lines of code myself. My goal is always the same: turn complex problems into scalable, AI-driven products that deliver clear business value.
            </p>

            <p className="text-[15px] md:text-[16px] leading-relaxed text-gray-300 max-w-[65ch]">
              Clay specializes in full-stack development (JavaScript/TypeScript, React, Angular, Node.js, Python, Java), distributed systems, and cloud architecture across AWS and Azure. He has led cross-functional teams to build multi-agent generative AI platforms, advanced RAG pipelines, and data-intensive applications that support large enterprise user bases.
            </p>
          </div>

          {/* Highlights Column */}
          <div className="space-y-3">
            {highlights.map((item, index) => (
              <div
                key={index}
                className="glass-panel rounded-xl p-4 border border-white/[0.08]"
              >
                <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 font-medium">
                  {item.label}
                </div>
                <div className="text-[13px] text-gray-300 leading-snug">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
