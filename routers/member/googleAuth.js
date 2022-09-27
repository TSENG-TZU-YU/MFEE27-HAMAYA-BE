const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.CLIENT_ID);
router.post('/api/member/google', async (req, res) => {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.CLIENT_ID,
    });
    const { name, email, picture } = ticket.getPayload();
    const user = await pool.user.upsert({
        where: { email: email },
        update: { name, picture },
        create: { name, email, picture },
    });
    res.status(201);
    res.json(user);
});
