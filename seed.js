const Database = require("better-sqlite3");

const db = new Database("internships.db");

db.exec(`
CREATE TABLE IF NOT EXISTS internships (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    mode TEXT NOT NULL,
    location TEXT NOT NULL,
    skills TEXT NOT NULL,
    openings INTEGER NOT NULL
);
`);

const internships = [
    {
        id: "INT-101",
        title: "Frontend Intern",
        domain: "Full Stack Development",
        mode: "Remote",
        location: "India",
        skills: ["HTML", "CSS", "JavaScript"],
        openings: 3
    },
    {
        id: "INT-102",
        title: "Backend Intern",
        domain: "Full Stack Development",
        mode: "Hybrid",
        location: "Pune",
        skills: ["Node.js", "Express", "SQL"],
        openings: 2
    },
    {
        id: "INT-103",
        title: "UI/UX Intern",
        domain: "UI/UX",
        mode: "Remote",
        location: "India",
        skills: ["Figma", "Research", "Accessibility"],
        openings: 1
    },
    {
        id: "INT-104",
        title: "Data Analyst Intern",
        domain: "Data Analytics",
        mode: "On-site",
        location: "Bengaluru",
        skills: ["Excel", "SQL", "Python"],
        openings: 2
    },
    {
        id: "INT-105",
        title: "Security Operations Intern",
        domain: "Cyber Security",
        mode: "Remote",
        location: "India",
        skills: ["Linux", "Networking", "Security"],
        openings: 1
    }
];

const insert = db.prepare(`
    INSERT OR IGNORE INTO internships
    (id, title, domain, mode, location, skills, openings)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const internship of internships) {
    insert.run(
        internship.id,
        internship.title,
        internship.domain,
        internship.mode,
        internship.location,
        JSON.stringify(internship.skills),
        internship.openings
    );
}

console.log("Internship data added successfully!");

db.close();
