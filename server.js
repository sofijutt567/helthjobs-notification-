import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();

// 1. Firebase Admin Initialization
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin Initialized!");
    } catch (error) {
        console.error("Firebase Init Error:", error.message);
    }
}

const db = admin.firestore();

// 2. Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// 3. TESTING ROUTE (Ye line aapka "Cannot GET" wala masla hal karegi)
app.get('/api/server', (req, res) => {
    res.status(200).send("Health Jobs API is Live! Server is ready for notifications.");
});

// 4. NOTIFICATION ROUTE
app.post('/api/server', async (req, res) => {
    try {
        const { title, hospital } = req.body;

        if (!title || !hospital) {
            return res.status(400).json({ error: "Title or hospital missing" });
        }

        const tokens = [];
        const usersSnapshot = await db.collection('users').get();
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmToken) {
                tokens.push(userData.fcmToken);
            }
        });

        if (tokens.length === 0) {
            return res.status(200).json({ message: "No tokens found in database." });
        }

        const message = {
            notification: {
                title: `Nayi Job: ${title}`,
                body: `${hospital} ne Health Jobs par nayi post lagayi hai.`
            },
            tokens: tokens 
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        
        res.status(200).json({ 
            success: true, 
            sent: response.successCount 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default app;
