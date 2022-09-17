const express = require('express');
const router = express.Router();
const pool = require('../../utils/db');

//讀取我的問題
//http://localhost:3001/api/member/myquestion
router.get('/loading', async (req, res, next) => {
    console.log('loading myQuestion');
    let [myQuestion] = await pool.execute(
        'SELECT user_qna.*, user_q_category.name AS user_q_category  FROM user_qna JOIN user_q_category ON user_qna.q_category = user_q_category.id WHERE user_id=? ORDER BY create_time DESC',
        [req.session.member.id]
    );
    res.json(myQuestion);
});

//新增問題
router.post('/add', async (req, res, next) => {
    console.log('add myQuestion');
    //TODO:表單驗證
    let result = await pool.execute('INSERT INTO user_qna (name, user_id, email, phone, q_category, title, comment) VALUES (?, ?, ?, ?, ?, ?, ?);', [
        req.session.member.fullName,
        req.session.member.id,
        req.session.member.email,
        req.session.member.phone,
        req.body.q_category,
        req.body.title,
        req.body.comment,
    ]);
    console.log('insert new Question', result);
    res.json({ message: '表單送出成功' });
});

module.exports = router;
