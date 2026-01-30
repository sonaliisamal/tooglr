# 🎀 TOOGLR - The "Pink Excel" Habit Tracker

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/Node.js-v18-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-forestgreen)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla_JS-yellow)

**TOOGLR** is a production-grade, full-stack habit tracking application designed with a "Pink Excel" aesthetic. It features data persistence, JWT authentication, and a custom-built grid engine that mimics spreadsheet functionality for tracking daily consistency.

---

## 📸 Screenshots

| Dashboard View | Monthly Heatmap |
|:---:|:---:|
| <img src="https://via.placeholder.com/600x300/ffb6c1/333333?text=Add+Your+Screenshot+Here" width="100%"> | <img src="https://via.placeholder.com/600x300/ff66b2/ffffff?text=Add+Graph+Screenshot" width="100%"> |

*(Tip: Drag and drop your actual screenshots into this README file on GitHub to replace these placeholders!)*

---

## ✨ Features

- **Full-Stack Auth:** Secure User Signup & Login using `bcrypt` and `JWT`.
- **Excel-Like Grid:** Custom Vanilla JS engine to render dynamic habit grids.
- **Data Persistence:** MongoDB backend ensures data survives reloads and logouts.
- **Smart Analytics:**
  - 📉 Line Graphs for consistency trends.
  - 📊 "Pink Bars" visualization inside the table footer.
- **Strict Logic:**
  - Prevents editing future dates.
  - Locks data once "Saved".
  - Immutability rules for historical data.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Custom Variables), Vanilla JavaScript (ES6+).
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (Mongoose ODM).
- **Authentication:** JSON Web Tokens (JWT).

