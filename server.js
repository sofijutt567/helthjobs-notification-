import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();

// 1. Firebase Admin Initialization (Using Modern Import)
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin Initialized Successfully");
    } catch (error) {
        console.error("Firebase Init Error:", error.message);
    }
}

const db = admin.firestore();

// 2. Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// 3. Testing Route (Browser mein check karne ke liye)
app.get('/', (req, res) => {
    res.send("Health Jobs API is Live! Use /api/send-notification for POST requests.");
});

// 4. Notification Route
app.post('/api/send-notification', async (req, res) => {
    try {
        const { title, hospital } = req.body;

        if (!title || !hospital) {
            return res.status(400).json({ error: "Title and Hospital name are required" });
        }

        const tokens = [];
        // Database se tokens nikalna
        const usersSnapshot = await db.collection('users').get();
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmToken) {
                tokens.push(userData.fcmToken);
            }
        });

        if (tokens.length === 0) {
            return res.status(200).json({ message: "No registered tokens found." });
        }

        // Notification Message
        const message = {
            notification: {
                title: `Nayi Job: ${title}`,
                body: `${hospital} ne Health Jobs par nayi post lagayi hai. Check karein!`
            },
            tokens: tokens 
        };

        // Multicast Notification
        const response = await admin.messaging().sendEachForMulticast(message);
        
        res.status(200).json({ 
            success: true, 
            message: "Notifications sent!",
            sentCount: response.successCount 
        });

    } catch (error) {
        console.error("Route Error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default app;
