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
`);

function formatInternship(row) {
    return {
        ...row,
        skills: JSON.parse(row.skills)
    };
}

function validateInternship(data) {
    const { id, title, domain, mode, location, skills, openings } = data;

    if (!id || !title || !domain || !mode || !location) {
        return "Required fields are missing";
    }

    if (!Array.isArray(skills)) {
        return "Skills must be an array";
    }

    if (!Number.isInteger(openings) || openings < 1) {
        return "Openings must be a positive integer";
    }

    return null;
}

// Home
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Internship API is running"
    });
});

// LIST internships with pagination
app.get("/api/internships", (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 50);
    const offset = (page - 1) * limit;

    const rows = db.prepare(
        "SELECT * FROM internships LIMIT ? OFFSET ?"
    ).all(limit, offset);

    const total = db.prepare(
        "SELECT COUNT(*) AS count FROM internships"
    ).get().count;

    res.json({
        status: "success",
        data: rows.map(formatInternship),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

// DETAIL internship
app.get("/api/internships/:id", (req, res) => {
    const internship = db.prepare(
        "SELECT * FROM internships WHERE id = ?"
    ).get(req.params.id);

    if (!internship) {
        return res.status(404).json({
            status: "error",
            message: "Internship not found"
        });
    }

    res.json({
        status: "success",
        data: formatInternship(internship)
    });
});

// CREATE internship
app.post("/api/internships", (req, res) => {
    const error = validateInternship(req.body);

    if (error) {
        return res.status(400).json({
            status: "error",
            message: error
        });
    }

    const {
        id,
        title,
        domain,
        mode,
        location,
        skills,
        openings
    } = req.body;

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

// UPDATE internship
app.put("/api/internships/:id", (req, res) => {
    const {
        title,
        domain,
        mode,
        location,
        skills,
        openings
    } = req.body;

    if (!title || !domain || !mode || !location) {
        return res.status(400).json({
            status: "error",
            message: "Required fields are missing"
        });
    }

    if (!Array.isArray(skills)) {
        return res.status(400).json({
            status: "error",
            message: "Skills must be an array"
        });
    }

    if (!Number.isInteger(openings) || openings < 1) {
        return res.status(400).json({
            status: "error",
            message: "Openings must be a positive integer"
        });
    }

    const result = db.prepare(`
        UPDATE internships
        SET title = ?, domain = ?, mode = ?, location = ?,
            skills = ?, openings = ?
        WHERE id = ?
    `).run(
        title,
        domain,
        mode,
        location,
        JSON.stringify(skills),
        openings,
        req.params.id
    );

    if (result.changes === 0) {
        return res.status(404).json({
            status: "error",
            message: "Internship not found"
        });
    }

    res.json({
        status: "success",
        message: "Internship updated"
    });
});

// DELETE internship
app.delete("/api/internships/:id", (req, res) => {
    const result = db.prepare(
        "DELETE FROM internships WHERE id = ?"
    ).run(req.params.id);

    if (result.changes === 0) {
        return res.status(404).json({
            status: "error",
            message: "Internship not found"
        });
    }

    res.json({
        status: "success",
        message: "Internship deleted"
    });
});

// SEARCH / FILTER
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

    res.json({
        status: "success",
        data: rows.map(formatInternship)
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
