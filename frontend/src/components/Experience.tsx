export default function Experience() {
  const experiences = [
    {
      company: "Slalom Build",
      title: "Architect, Software Engineering",
      dates: "Nov 2020 – Present",
      location: "Charlotte, NC",
      bullets: [
        "Lead cross-functional teams (up to 12 people) to build generative AI–powered enterprise applications that guide technology decisions and enforce architecture standards.",
        "Architect and ship multi-agent, RAG-based AI platforms used across the enterprise, including an AI hub serving 75%+ of employees and supporting 125+ applications.",
        "Designed high-scale data pipelines and search systems enabling 96% retrieval success over 1M+ records.",
        "Boosted developer velocity by ~15% and mentored architects and senior engineers, raising the overall engineering bar.",
      ],
    },
    {
      company: "Empowered Benefits (an Aflac Company)",
      title: "Application Developer",
      dates: "May 2020 – Nov 2020",
      location: "Charlotte, NC",
      bullets: [
        "Built and maintained full-stack features in a cross-functional environment of designers, developers, and product owners.",
        "Developed and supported RESTful APIs and Angular components with strong documentation and testing.",
        "Led feature demos for partners and stakeholders.",
      ],
    },
    {
      company: "Union",
      title: "Frontend Developer",
      dates: "Nov 2019 – May 2020",
      location: "Charlotte, NC",
      bullets: [
        "Built web components and features for sites with 200k+ unique monthly visitors.",
        "Contributed to an internal UI library, creating reusable components that saved 150+ hours of development per month.",
        "Implemented cross-browser, cross-device frontend code using React, Node.js, HTML, CSS/SCSS, and JavaScript.",
      ],
    },
    {
      company: "Wells Fargo",
      title: "Application Systems Engineer",
      dates: "Feb 2019 – Nov 2019",
      location: "Charlotte, NC",
      bullets: [
        "Modernized and developed applications for the Cyber Security Innovations team.",
        "Built applications on the Cyber Intelligence platform using a mix of modern technologies.",
      ],
    },
    {
      company: "The IMAGINE Group",
      title: "Software Developer",
      dates: "Jan 2018 – Feb 2019",
      location: "Charlotte, NC",
      bullets: [
        "Helped design and develop user-facing web applications for a leading financial services client.",
        "Implemented core front-end features with a focus on usability and performance.",
      ],
    },
  ];

  return (
    <section id="experience" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-12 tracking-tight">
          Experience
        </h2>

        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <div
              key={index}
              className="glass-panel rounded-2xl p-6 md:p-8 border border-white/[0.08] hover:border-white/[0.12] transition-colors"
            >
              {/* Header */}
              <div className="mb-4">
                <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-2">
                  <h3 className="text-xl md:text-2xl font-semibold text-white">
                    {exp.company}
                  </h3>
                  <div className="text-sm text-gray-400">
                    {exp.dates}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="text-[15px] text-gray-300 font-medium">
                    {exp.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {exp.location}
                  </div>
                </div>
              </div>

              {/* Bullets */}
              <ul className="space-y-3">
                {exp.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex gap-3 text-[14px] md:text-[15px] leading-relaxed text-gray-300">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
