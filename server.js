const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// 1. Firebase Admin SDK Initialization
// Vercel par hum sensitive JSON file upload nahi karte, balke usay Environment Variables mein rakhte hain.
if (!admin.apps.length) {
    try {
        // FIREBASE_SERVICE_ACCOUNT variable se Vercel par JSON read karega
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin Initialized Successfully");
    } catch (error) {
        console.error("Firebase Admin Initialization Error:", error);
    }
}

const db = admin.firestore();
const app = express();

// 2. Middleware
// CORS lazmi hai taake aapki frontend website is API ko call kar sake
app.use(cors({ origin: '*' })); 
app.use(express.json());

// 3. Push Notification Bhejne Wali API
app.post('/api/send-notification', async (req, res) => {
    try {
        const { title, hospital } = req.body;

        if (!title || !hospital) {
            return res.status(400).json({ error: "Title aur hospital ka naam zaroori hai" });
        }

        // A. Database se tamam users ke FCM Tokens nikalna
        const tokens = [];
        const usersSnapshot = await db.collection('users').get();
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Agar user ke paas FCM Token hai to list mein daal do
            if (userData.fcmToken) {
                tokens.push(userData.fcmToken);
            }
        });

        // B. Agar kisi ka bhi token nahi mila to wapas chale jao
        if (tokens.length === 0) {
            return res.status(200).json({ message: "Koi token nahi mila, notification nahi bheji gayi." });
        }

        // C. Notification ka message tayyar karna
        const message = {
            notification: {
                title: `Nayi Job: ${title}`,
                body: `${hospital} ne nayi post lagayi hai. Abhi Health Jobs par check karein!`
            },
            // Android, iOS aur Web teeno par set karne ke liye
            tokens: tokens 
        };

        // D. Sab users ko ek sath notification bhej dena (Multicast)
        const response = await admin.messaging().sendEachForMulticast(message);
        
        console.log(`${response.successCount} messages kamyabi se bheje gaye.`);
        if (response.failureCount > 0) {
            console.log(`${response.failureCount} messages fail ho gaye.`);
        }

        res.status(200).json({ 
            success: true, 
            message: "Notification successfully sent!",
            successCount: response.successCount 
        });

    } catch (error) {
        console.error("Notification bhejne mein masla aaya:", error);
        res.status(500).json({ error: error.message });
    }
});

// Vercel Serverless Function ke liye App ko export karna lazmi hai
module.exports = app;
