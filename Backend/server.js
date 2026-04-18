require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// --- 🤖 GROQ AI SETUP ---
const OpenAI = require('openai');

// Initialize the OpenAI client to point to Groq's Base URL
const groqClient = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1", 
});

// Models
const User = require('./models/User');
const Property = require('./models/Property');
const Investment = require('./models/Investment');

const app = express();

// --- CONFIGURATION ---
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// --- DB CONNECTION ---
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/fractionx")
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ DB Error:', err));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../landing.html'));
});

// ===========================
//       API ROUTES
// ===========================

// TEMPORARY ROUTE: Run this once to create your admin account
app.get('/make-admin', async (req, res) => {
    try {
        const existingAdmin = await User.findOne({ email: "admin@fractionx.com" });
        if (existingAdmin) return res.send("Admin already exists!");

        const adminUser = new User({
            name: "Super Admin",
            email: "admin@fractionx.com",
            password: "adminpassword", 
            isAdmin: true
        });
        await adminUser.save();
        res.send("✅ Admin created! You can now log in with admin@fractionx.com / adminpassword");
    } catch (e) {
        res.status(500).send("Error creating admin");
    }
});

// 1. REGISTER
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const exists = await User.findOne({ email });
        if (exists) return res.json({ success: false, message: "Email already taken" });

        const newUser = new User({ name, email, password });
        await newUser.save();
        console.log(`🆕 Registered: ${email}`);
        res.json({ success: true, user: { name, email } });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 2. LOGIN (With Admin Check)
app.post('/login', async (req, res) => {
    const { email, password, role } = req.body; 
    try {
        const user = await User.findOne({ email, password });
        if (user) {
            if (role === 'admin' && !user.isAdmin) {
                return res.status(403).json({ success: false, message: "Access Denied: You are not an Admin." });
            }
            console.log(`✅ Login: ${email} as ${role}`);
            res.json({ success: true, user: { name: user.name, email: user.email, isAdmin: user.isAdmin } });
        } else {
            res.status(401).json({ success: false, message: "Wrong credentials" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

// ==========================================
// ADMIN: DELETE / DELIST AN ASSET
// ==========================================
app.delete('/properties/:id', async (req, res) => {
    try {
        const assetId = req.params.id;
        const deletedProperty = await Property.findByIdAndDelete(assetId);

        if (!deletedProperty) {
            return res.status(404).json({ success: false, message: "Asset not found in database." });
        }

        console.log(`🗑️ Admin deleted asset: ${deletedProperty.title}`);
        res.status(200).json({ success: true, message: "Asset successfully delisted!" });

    } catch (error) {
        console.error("Error deleting property:", error);
        res.status(500).json({ success: false, message: "Server error while deleting asset." });
    }
});

// 3. GET USER
app.get('/user', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email });
    res.json(user || {});
});

// 4. UPDATE PROFILE
app.post('/user/update', async (req, res) => {
    const { email, name, phone, location, bio } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email missing" });
    try {
        const user = await User.findOne({ email });
        if (user) {
            user.name = name || user.name;
            user.phone = phone || user.phone;
            user.location = location || user.location;
            user.bio = bio || user.bio;
            await user.save();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

// 5. GET PORTFOLIO
app.get('/my-portfolio', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.json([]);
    const user = await User.findOne({ email });
    if (!user) return res.json([]);
    const investments = await Investment.find({ userId: user._id }).sort({ date: -1 });
    res.json(investments);
});

// 6. INVEST (BUY ASSET)
app.post('/invest', async (req, res) => {
    const { email, assetId, assetName, amount, tokens } = req.body;
    const user = await User.findOne({ email });
    if(!user) return res.json({ success: false, message: "Login required" });
    if(user.balance < amount) return res.json({ success: false, message: "Low Balance" });

    user.balance -= amount;
    await user.save();

    const inv = new Investment({ userId: user._id, assetId, assetName, amount, tokens });
    await inv.save();
    console.log(`💰 ${email} bought ${assetName}`);
    res.json({ success: true, newBalance: user.balance });
});

// 7. WALLET: ADD MONEY
app.post('/wallet/add', async (req, res) => {
    const { email, amount } = req.body;
    if (!email || !amount) return res.json({ success: false, message: "Invalid data" });
    try {
        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: "User not found" });
        user.balance += Number(amount);
        await user.save();
        res.json({ success: true, newBalance: user.balance });
    } catch (e) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 8. PROPERTIES (MARKETPLACE)
app.get('/properties', async (req, res) => {
    try {
        const props = await Property.find();
        res.json(props);
    } catch (e) { res.status(500).json({ message: "Error fetching properties" }); }
});

app.post('/properties', async (req, res) => {
    try {
        const newProperty = new Property({
            title: req.body.title,
            location: req.body.location,
            price: req.body.price,
            fractionPrice: req.body.fractionPrice,
            roi: req.body.roi,
            category: req.body.category,
            image: req.body.image || "https://via.placeholder.com/300"
        });
        await newProperty.save();
        res.json({ success: true, message: "Asset listed successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to list asset." });
    }
});


// --- 9. AI CHATBOT ROUTE (GROQ / LLAMA 3.3) ---
app.post('/api/analyze', async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ success: false, message: "Message is required." });
    }

    try {
        console.log(`🤖 Live Groq AI Request received!`);
        
        // Call the Groq API
        const completion = await groqClient.chat.completions.create({
            model: "llama-3.3-70b-versatile", // The specific Groq model you want
            temperature: 0.5,
            messages: [
                { role: "user", content: message } 
            ]
        });

        // Extract Groq's response
        const aiResponse = completion.choices[0].message.content;

        res.json({ success: true, reply: aiResponse });

    } catch (e) {
        console.error("🚨 Groq API Error Details:", e.response ? e.response.data : e.message);
        res.status(500).json({ success: false, message: "AI Engine Error. Check your Groq API key or server logs." });
    }
});

// 10. SEED (RESET)
app.get('/seed', async (req, res) => {
    await Property.deleteMany({});
    await Property.insertMany([
        { title: "Ferrari SF90", category: "Vehicle", location: "Mumbai", price: 45000000, fractionPrice: 5000, roi: 24.5, image: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800" },
        { title: "Luxury Villa", category: "Real Estate", location: "Goa", price: 120000000, fractionPrice: 10000, roi: 15, image: "https://images.unsplash.com/photo-1613490493576-2f5037657911?w=800" }
    ]);
    res.send("✅ Properties Reset");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));