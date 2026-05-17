const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'cv.db');

const DEFAULT_CV = {
  personal: {
    name: 'Alex Morgan',
    title: 'Full Stack Developer',
    email: 'alex.morgan@email.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexmorgan',
    github: 'github.com/alexmorgan',
    portfolio: 'alexmorgan.dev',
  },
  summary:
    'Results-driven Full Stack Developer with 5+ years of experience designing and building scalable web applications. Proficient in JavaScript, TypeScript, and Python with strong expertise in React, Node.js, and cloud infrastructure. Proven track record of delivering high-performance solutions that improve user experience and operational efficiency. Adept at collaborating in Agile teams and translating complex technical requirements into robust, maintainable code.',
  techTags:
    'JavaScript, TypeScript, Python, React, Node.js, Next.js, PostgreSQL, MongoDB, Docker, AWS, REST APIs, GraphQL, Git, CI/CD',
  languages: 'English | Native\nSpanish | Intermediate',
  experience: [
    {
      role: 'Senior Full Stack Developer',
      company: 'TechNova Solutions',
      location: 'San Francisco, CA',
      from: 'Jan 2022',
      to: 'Present',
      bullets:
        'Architected and delivered a customer-facing SaaS platform serving 50,000+ users, reducing page load time by 40%.\nLed a team of 4 engineers to migrate a monolithic application to a microservices architecture using Docker and Kubernetes.\nDesigned RESTful and GraphQL APIs integrated with third-party payment and analytics services.\nImplemented CI/CD pipelines using GitHub Actions and AWS CodePipeline, reducing deployment time from 2 hours to 12 minutes.',
    },
    {
      role: 'Full Stack Developer',
      company: 'Bright Digital Agency',
      location: 'Austin, TX',
      from: 'Jun 2020',
      to: 'Dec 2021',
      bullets:
        'Developed and maintained 10+ client web applications using React, Node.js, and PostgreSQL.\nOptimised database queries and introduced Redis caching, resulting in a 60% reduction in API response times.\nCollaborated closely with UI/UX designers to implement pixel-perfect, accessible interfaces meeting WCAG 2.1 AA standards.',
    },
    {
      role: 'Junior Web Developer',
      company: 'StartupHub Inc.',
      location: 'Remote',
      from: 'Aug 2019',
      to: 'May 2020',
      bullets:
        'Built and iterated on MVP features for an early-stage SaaS product using Vue.js and Django REST Framework.\nWrote unit and integration tests achieving 85% code coverage, contributing to a 30% reduction in production bugs.',
    },
  ],
  projects: [
    {
      name: 'Real-Time Collaboration Tool',
      tech: 'React · Node.js · Socket.io · MongoDB',
      desc: 'Built a Figma-inspired real-time whiteboard application supporting 100+ concurrent users with operational transformation for conflict resolution and sub-100ms latency.',
    },
    {
      name: 'AI-Powered Code Review Bot',
      tech: 'Python · FastAPI · OpenAI API · GitHub Actions',
      desc: 'Developed an automated code review GitHub bot that flags security vulnerabilities and style violations, adopted by 15+ open-source repositories.',
    },
  ],
  education: [
    {
      degree: 'B.Sc. Computer Science',
      school: 'University of California, Berkeley',
      year: '2015 – 2019 · GPA: 3.8 / 4.0',
    },
  ],
  skillBars: [
    { name: 'Frontend Development', level: 92 },
    { name: 'Backend Development', level: 85 },
    { name: 'Database Design', level: 80 },
    { name: 'DevOps & Cloud', level: 72 },
    { name: 'System Design', level: 78 },
  ],
  certifications: [
    { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services · 2023' },
    { name: 'Google Professional Cloud Developer', issuer: 'Google · 2022' },
    { name: 'MongoDB Certified Developer', issuer: 'MongoDB · 2021' },
  ],
};

let db;

function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS cv (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const row = db.prepare('SELECT data FROM cv WHERE id = 1').get();
  if (!row) {
    db.prepare('INSERT INTO cv (id, data) VALUES (1, ?)').run(JSON.stringify(DEFAULT_CV));
  }
}

function getCv() {
  const row = db.prepare('SELECT data, updated_at FROM cv WHERE id = 1').get();
  if (!row) {
    return { data: DEFAULT_CV, updatedAt: null };
  }
  return {
    data: JSON.parse(row.data),
    updatedAt: row.updated_at,
  };
}

function saveCv(data) {
  const json = JSON.stringify(data);
  db.prepare(`
    INSERT INTO cv (id, data, updated_at)
    VALUES (1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `).run(json);
  return getCv();
}

module.exports = { initDb, getCv, saveCv, DEFAULT_CV };
