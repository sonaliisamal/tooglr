// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve frontend files

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tooglr';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_tooglr_key';

// --- MONGODB CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ DB Error:', err));

// --- SCHEMAS & MODELS ---

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Sheet Schema
const sheetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Sheet = mongoose.model('Sheet', sheetSchema);

// Habit Schema
const habitSchema = new mongoose.Schema({
    sheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sheet', required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Habit = mongoose.model('Habit', habitSchema);

// Daily Record Schema
const recordSchema = new mongoose.Schema({
    sheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sheet', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    completedHabits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habit' }]
});
// Ensure one record per sheet per day
recordSchema.index({ sheetId: 1, date: 1 }, { unique: true });
const DailyRecord = mongoose.model('DailyRecord', recordSchema);

// --- MIDDLEWARE ---
const auth = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(400).json({ msg: 'Token is not valid' });
    }
};

// --- ROUTES ---

// 1. Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ msg: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({ email, passwordHash });
        await newUser.save();

        res.status(201).json({ msg: 'User created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'User does not exist' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '365d' });
        res.json({ token, user: { id: user._id, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Sheet Routes
app.get('/api/sheets', auth, async (req, res) => {
    try {
        const sheets = await Sheet.find({ userId: req.user.id });
        res.json(sheets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sheets', auth, async (req, res) => {
    try {
        const newSheet = new Sheet({ userId: req.user.id, name: req.body.name });
        const savedSheet = await newSheet.save();
        res.json(savedSheet);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Habit Routes
app.get('/api/sheets/:sheetId/habits', auth, async (req, res) => {
    try {
        // Verify ownership
        const sheet = await Sheet.findOne({ _id: req.params.sheetId, userId: req.user.id });
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        const habits = await Habit.find({ sheetId: req.params.sheetId });
        res.json(habits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sheets/:sheetId/habits', auth, async (req, res) => {
    try {
        const sheet = await Sheet.findOne({ _id: req.params.sheetId, userId: req.user.id });
        if (!sheet) return res.status(404).json({ msg: 'Unauthorized' });

        const newHabit = new Habit({ sheetId: req.params.sheetId, name: req.body.name });
        const savedHabit = await newHabit.save();
        res.json(savedHabit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Data Fetching (Month View)
app.get('/api/sheets/:sheetId/month/:year/:month', auth, async (req, res) => {
    try {
        const { sheetId, year, month } = req.params;
        
        // Construct regex to match dates in YYYY-MM format
        const datePrefix = `${year}-${String(month).padStart(2, '0')}`;
        const regex = new RegExp(`^${datePrefix}`);

        const records = await DailyRecord.find({ 
            sheetId: sheetId,
            date: { $regex: regex }
        });

        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Submit / Save Day (CRITICAL LOGIC)
app.post('/api/records', auth, async (req, res) => {
    const { sheetId, date, completedHabitIds } = req.body;

    // VALIDATION 1: No Future Dates
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
        return res.status(400).json({ msg: "Cannot edit future dates." });
    }

    try {
        // VALIDATION 2: Verify Sheet Ownership
        const sheet = await Sheet.findOne({ _id: sheetId, userId: req.user.id });
        if (!sheet) return res.status(403).json({ msg: "Unauthorized" });

        // LOGIC: Use $addToSet to ensure we ONLY ADD ticks, NEVER remove existing ones (immutability rule)
        // If the record doesn't exist, upsert creates it.
        await DailyRecord.updateOne(
            { sheetId, date },
            { $addToSet: { completedHabits: { $each: completedHabitIds } } },
            { upsert: true }
        );

        res.json({ msg: "Saved successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



/////////////////////////////////////////////////////////////////////////////
// --- 6. Analytics & Streaks Endpoint ---
app.get('/api/sheets/:sheetId/stats', auth, async (req, res) => {
    try {
        const { sheetId } = req.params;
        
        // Fetch ALL records for this sheet, sorted by date
        const records = await DailyRecord.find({ sheetId }).sort({ date: 1 });
        
        // 1. Calculate Heatmap Data (Simple date:count mapping)
        const heatmap = {};
        records.forEach(r => {
            heatmap[r.date] = r.completedHabits.length;
        });

        // 2. Calculate Streaks
        // A "streak" is defined as logging at least ONE habit per day.
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        // We need to iterate through dates continuously to check for gaps
        if (records.length > 0) {
            const firstDate = new Date(records[0].date);
            const lastDate = new Date(); // Stop at today
            
            // Normalize to midnight UTC to avoid timezone drift
            firstDate.setUTCHours(0,0,0,0);
            lastDate.setUTCHours(0,0,0,0);

            for (let d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const hasActivity = heatmap[dateStr] && heatmap[dateStr] > 0;

                if (hasActivity) {
                    tempStreak++;
                } else {
                    // Reset streak if day is missed
                    if (tempStreak > longestStreak) longestStreak = tempStreak;
                    tempStreak = 0;
                }
            }
            // Update final streak check
            if (tempStreak > longestStreak) longestStreak = tempStreak;
            
            // Check if streak is currently active (today or yesterday must have activity)
            const todayStr = new Date().toISOString().split('T')[0];
            const yestDate = new Date();
            yestDate.setDate(yestDate.getDate() - 1);
            const yestStr = yestDate.toISOString().split('T')[0];

            if (heatmap[todayStr] > 0 || heatmap[yestStr] > 0) {
                currentStreak = tempStreak;
            } else {
                currentStreak = 0;
            }
        }

        res.json({ heatmap, currentStreak, longestStreak });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




// Start Server
app.listen(PORT, () => console.log(`🚀 TOOGLR Server running on port ${PORT}`));