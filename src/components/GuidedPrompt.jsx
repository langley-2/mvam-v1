const PROMPTS = {
  requirements: ['Frame the problem', 'Who are you building for? Pick the most important user journey, clarify constraints, and explain what success looks like.'],
  architecture: ['Tell the system’s story', 'Walk through a request from start to finish. Why did you choose this design, and what would make you choose differently?'],
  decisions: ['Defend a tradeoff', 'Choose one decision you would discuss in an interview. Compare two options and explain what you gain and give up.'],
  scalingCost: ['Change the scale', 'What breaks at ten times the traffic? Estimate one bottleneck or cost and explain your first response. State your assumptions.'],
  diagrams: ['Draw, then talk it through', 'A clear diagram is a great starting point. Trace a request and explain one failure path. Separate component cards and extra diagrams are optional.'],
  codeStructure: ['Connect design to code', 'Where would a new feature live? Explain one boundary, how you would test it, and what you would keep independent.'],
  raidLog: ['Surface the unknowns', 'Name a risk and an assumption you would check with the interviewer. How would you reduce uncertainty?'],
  learningsProof: ['Show how you learn', 'Describe a failure or experiment: what happened, what evidence you gathered, and what you would change. A hypothetical test plan is a useful start.'],
  links: ['Choose your evidence', 'Add a reference you can explain in your own words. How did it influence your choices, and where might its advice not apply?'],
}

export default function GuidedPrompt({ sectionId, onNext }) {
  const [title, prompt] = PROMPTS[sectionId] || ['Practise your explanation', 'What would you want an interviewer to understand here? Explain your reasoning and one tradeoff in whatever format helps.']
  return (
    <aside className="guided-prompt" aria-label="Interview practice prompt">
      <div>
        <span className="guided-eyebrow">Interview practice</span>
        <h2>{title}</h2>
        <p>{prompt}</p>
        <small>Notes, bullets and sketches are welcome. Ask Archie for coaching when you’re ready.</small>
      </div>
      <button className="btn-secondary" onClick={onNext}>Next section →</button>
    </aside>
  )
}
