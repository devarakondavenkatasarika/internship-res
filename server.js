const express = require("express");
const Database = require("better-sqlite3");

const app = express();

app.use(express.json());

// SQLite database
const db = new Database("internships.db");

// Create tables
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

// Home
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Internship API is running"
    });
});

// Get internships with pagination
app.get("/api/internships", (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    const offset = (page - 1) * limit;

    const rows = db.prepare(
        "SELECT * FROM internships LIMIT ? OFFSET ?"
    ).all(limit, offset);

    const total = db.prepare(
        "SELECT COUNT(*) AS count FROM internships"
    ).get().count;

    const data = rows.map(row => ({
        ...row,
        skills: JSON.parse(row.skills)
    }));

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

// Search/filter internships
app.get("/api/internships/search", (req, res) => {
    const { domain, mode } = req.query;

    let query = "SELECT * FROM internships WHERE 1=1";
    const params = [];

    if (domain) {
        query += " AND domain = ?";
        params.push(domain);
    }

    if (mode) {
        query += " AND mode = ?";
        params.push(mode);
    }

    const rows = db.prepare(query).all(...params);

    const data = rows.map(row => ({
        ...row,
        skills: JSON.parse(row.skills)
    }));

    res.json({
        status: "success",
        data,
        pagination: {
            total: data.length
        }
    });
});

// Create internship
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

    if (
        !id ||
        !title ||
        !domain ||
        !mode ||
        !location ||
        !Array.isArray(skills)
    ) {
        return res.status(400).json({
            status: "error",
            message: "Required fields are missing or invalid"
        });
    }

    if (!Number.isInteger(openings) || openings < 1) {
        return res.status(400).json({
            status: "error",
            message: "Openings must be a positive number"
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
            openings
        );

        res.status(201).json({
            status: "success",
            message: "Internship created"
        });

    } catch (error) {
        res.status(409).json({
            status: "error",
            message: "Internship ID already exists"
        });
    }
});

// Submit application
app.post("/api/applications", (req, res) => {
    const {
        internship_id,
        name,
        email,
        portfolio_url
    } = req.body;

    if (!internship_id || !name || !email) {
        return res.status(400).json({
            status: "error",
            message: "Internship ID, name and email are required"
        });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        return res.status(400).json({
            status: "400",
            message: "Invalid email address"
        });
    }

    // Check internship exists
    const internship = db.prepare(
        "SELECT id FROM internships WHERE id = ?"
    ).get(internship_id);

    if (!internship) {
        return res.status(404).json({
            status: "error",
            message: "Internship not found"
        });
    }

    // Validate portfolio URL if provided
    if (portfolio_url) {
        try {
            const url = new URL(portfolio_url);

            if (!["http:", "https:"].includes(url.protocol)) {
                throw new Error();
            }
        } catch {
            return res.status(400).json({
                status: "error",
                message: "Invalid portfolio URL"
            });
        }
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

    } catch (error) {
        res.status(409).json({
            status: "error",
            message: "Duplicate application"
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
