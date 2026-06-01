import './App.css'

function App() {
  return (
    <main className="portfolio-page">
      <section className="hero-section">
        <p className="eyebrow">Senior Software Engineer · UI Lead</p>
        <h1>Richard Bryan Gutierrez</h1>
        <p className="hero-copy">
          Front-end and full-stack engineer with experience building scalable,
          secure, and user-focused applications for enterprise cybersecurity platforms.
        </p>

        <div className="hero-actions">
          <a href="mailto:your-email@example.com">Contact Me</a>
          <a href="#experience" className="secondary-link">View Experience</a>
        </div>
      </section>

      <section className="content-section" id="experience">
        <h2>Experience</h2>
        <p>
          UI Lead and Senior Software Engineer with hands-on experience in Angular,
          React, Node.js, REST APIs, SQL, reusable component systems, code reviews,
          mentoring, and end-to-end feature development.
        </p>
      </section>

      <section className="content-section">
        <h2>Core Skills</h2>
        <div className="skills-grid">
          <span>Angular</span>
          <span>React</span>
          <span>TypeScript</span>
          <span>Node.js</span>
          <span>REST APIs</span>
          <span>SQL</span>
          <span>LESS / CSS</span>
          <span>GitHub</span>
        </div>
      </section>
    </main>
  )
}

export default App