// ============================================
// Created By: Mohammed Huleihil, Tasnem Tarabeh, Elinor Khalul
// Date: 1/3/2025
// Description: 
// Express.js server that receives a movie code via query parameter (?title=moviecode),
// retrieves corresponding movie data, reviews, and attributes from an SQLite database,
// and renders an HTML page using EJS templating. The server also dynamically determines
// the movie’s poster image and displays an appropriate rating image (fresh/rotten).
// Technologies used: Node.js, Express.js, EJS, SQLite.
// ============================================

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 4000;

// Set EJS as the view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname)); // הוספת תיקיית הבסיס כסטטית


// ===== Database Connection =====
const dbPath = path.join(__dirname, "db", "rtfilms.db");
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

// ===== Helper Function to Get Poster Path =====
const getPosterPath = (movieCode) => {
    const posterJpg = path.join(__dirname, "public", "images", movieCode, "poster.jpg");
    const posterPng = path.join(__dirname, "public", "images", movieCode, "poster.png");

    console.log(`Checking paths:\n ${posterJpg}\n ${posterPng}`); // בדיקה

    if (fs.existsSync(posterJpg)) {
        return `/images/${movieCode}/poster.jpg`;
    } else if (fs.existsSync(posterPng)) {
        return `/images/${movieCode}/poster.png`;
    } else {
        return "/images/default-poster.png";
    }
};



//======== Route: Display Movie Page with Reviews =====


/**
 * Route: /movie?title=[filmCode]
 * Description: Retrieves movie metadata, rating, attributes, and reviews from the database
 *              and renders an EJS view with this data.
 */
app.get("/movie", (req, res) => {
    const filmCode = req.query.title;
    if (!filmCode) {
        return res.status(400).send("Movie code is required");
    }

    // SQL queries for the film metadata, details, and reviews
    const filmQuery = "SELECT Title, Year, Score FROM Films WHERE FilmCode = ?";
    const reviewsQuery = "SELECT ReviewerName, Affiliation, ReviewText FROM Reviews WHERE FilmCode = ?";
    const detailsQuery = "SELECT Attribute, Value FROM FilmDetails WHERE FilmCode = ?";

    // Fetch main movie data
    db.get(filmQuery, [filmCode], (err, film) => {
        if (err || !film) {
            console.error("Error fetching film:", err ? err.message : "Not found");
            return res.status(404).send(`Movie not found for code: ${filmCode}`);
        }

         // Determine image paths
        const posterPath = getPosterPath(filmCode);
        const ratingImage = film.Score >= 60 ? '/images/freshbig.png' : '/images/rottenbig.png';

        // Fetch reviews
        db.all(reviewsQuery, [filmCode], (err, reviews) => {
            if (err) {
                console.error("Error fetching reviews:", err.message);
                return res.status(500).send("Error fetching reviews from database");
            }

             // Fetch additional details
            db.all(detailsQuery, [filmCode], (err, details) => {
                if (err) {
                    console.error("Error fetching film details:", err.message);
                    return res.status(500).send("Error fetching film details from database");
                }

                // Count total reviews for layout logic
                const totalReviews = reviews.length;

                 // Render the final page with all data
                res.render("movie", { film, reviews, details, totalReviews, posterPath, ratingImage });
            });
        });
    });
});



// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
