const express = require("express");
const Database = require("better-sqlite3");

const app = express();
app.use(express.json());

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

CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internship_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    portfolio_url TEXT,
    UNIQUE(internship_id, email)
);
`);

app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Internship API is running"
    });
});

app.get("/api/internships", (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const data = db.prepare(
        "SELECT * FROM internships LIMIT ? OFFSET ?"
    ).all(limit, offset);

    const total = db.prepare(
        "SELECT COUNT(*) AS count FROM internships"
    ).get().count;

    res.json({
        status: "success",
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

app.post("/api/internships", (req, res) => {
    const {
        id,
        title,
        domain,
        mode,
        location,
        skills,
        openings
    } = req.body;

    if (!id || !title || !domain || !mode || !location || !skills) {
        return res.status(400).json({
            status: "error",
            message: "Required fields are missing"
        });
    }

    try {
        db.prepare(`
            INSERT INTO internships
            (id, title, domain, mode, location, skills, openings)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            title,
            domain,
            mode,
            location,
            JSON.stringify(skills),
            openings || 1
        );

        res.status(201).json({
            status: "success",
            message: "Internship created"
        });

    } catch {
        res.status(409).json({
            status: "error",
            message: "Internship ID already exists"
        });
    }
});

app.post("/api/applications", (req, res) => {
    const {
        internship_id,
        name,
        email,
        portfolio_url
    } = req.body;

    if (!name || !email || !internship_id) {
        return res.status(400).json({
            status: "error",
            message: "Name, email and internship ID are required"
        });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        return res.status(400).json({
            status: "error",
            message: "Invalid email address"
        });
    }

    try {
        db.prepare(`
            INSERT INTO applications
            (internship_id, name, email, portfolio_url)
            VALUES (?, ?, ?, ?)
        `).run(
            internship_id,
            name,
            email,
            portfolio_url || null
        );

        res.status(201).json({
            status: "success",
            message: "Application submitted"
        });

    } catch {
        res.status(409).json({
            status: "error",
            message: "Duplicate application"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
