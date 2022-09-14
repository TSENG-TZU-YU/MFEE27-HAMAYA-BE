const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

//購物車INSERT http://localhost:3001/api/cart
router.post('/', async (req, res, next) => {
    // console.log('cart 中間件', req.body);
    const [data] = req.body;
    try {
        let saveItemData = await pool.execute(`INSERT INTO cart (user_id, product_id, category_id, amount) VALUE (?,?,?,?)`, [
            data.user_id,
            data.product_id,
            data.category_id,
            data.amount,
        ]);
        console.log('saveItemData', saveItemData);

        res.json({ message: '已加入購物車，可以去會員專區 > 購物車查看，謝謝', insertId: [saveItemData].insertId });
    } catch (err) {
        console.log({ message: '新增失敗' });
    }
});

//http://localhost:3001/api/cart
//DELETE FROM cart WHERE user_id=2 AND product_id=A123
//會員刪除購物車內容
router.delete('/', async (req, res, next) => {
    // console.log('取得該會員要刪除cart 內容', req.body);
    const user_id = req.body.user_id;
    const product_id = req.body.product_id;
    try {
        let response = await pool.execute('DELETE FROM cart WHERE (user_id=?) AND (product_id=?);', [user_id, product_id]);
        // console.log('delete response', response);
        res.json({ message: '已成功刪除購物車內容，可以去會員專區 > 購物車查看，謝謝' });
    } catch (err) {
        console.log({ message: '刪除失敗' });
    }
});

module.exports = router;