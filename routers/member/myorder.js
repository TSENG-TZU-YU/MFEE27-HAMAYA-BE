const express = require('express');
const router = express.Router();
const pool = require('../../utils/db');
const moment = require('moment');

//成立訂單
router.post('/', async (req, res, next) => {
    // console.log('myorder 中間件', req.body);
    const [data] = req.body;
    // console.log('data', data);
    //產生訂單編號
    let order_id = 'A' + parseInt(Date.now() % 10000000);
    //優惠券
    let coupon_id = Number(data.coupon_id);
    //郵遞區號
    let newDist = data.dist.split(',');
    let newAddress = newDist[0] + data.city + newDist[1] + data.address;
    //當前時間
    let momentTime = moment().format('YYYY-MM-DD HH:mm:ss');

    //產品列表組陣列
    let filter_A = data.product_detail.filter((value) => {
        return value.category_id === 'A';
    });
    let filter_B = data.product_detail.filter((value) => {
        return value.category_id === 'B';
    });
    let product_id = filter_A.map((item) => {
        return [item.product_id, item.amount];
    });
    // console.log('product_id', product_id);
    let class_id = filter_B.map((item) => {
        return [item.product_id, item.amount];
    });
    // console.log('class_id', class_id);
    //確認庫存cate A
    let product_detailA;
    let noStockProduct_detailA;
    let enoughStockA = [];
    let otherStockA = [];
    let newFilter_A;
    if (product_id.length !== 0) {
        for (let i = 0; i < product_id.length; i++) {
            let [productStock] = await pool.execute('SELECT stock, product_id FROM product WHERE product_id = ?', [product_id[i][0]]);
            // console.log('productStock', productStock);
            //庫存大於購買數量
            if (productStock[0].stock >= product_id[i][1]) {
                let newStock = Number(productStock[0].stock) - Number(product_id[i][1]);
                enoughStockA.push(productStock[0].product_id);
                otherStockA.push([newStock, productStock[0].product_id]);
            }
        }
        // console.log('otherStockA', otherStockA);
        newFilter_A = filter_A.filter((item) => {
            return enoughStockA.indexOf(item.product_id) !== -1;
        });
        let noStockA = filter_A.filter((item) => {
            return enoughStockA.indexOf(item.product_id) === -1;
        });
        // console.log('noStockA', noStockA);
        //庫存不足會跳訊息 終止執行
        if (noStockA.length !== 0) {
            noStockProduct_detailA = noStockA.map((item) => {
                return [item.name];
            });
            // console.log('noStockProduct_detailA', noStockProduct_detailA);
            return res.json({ noStock: noStockProduct_detailA, message: '暫無庫存' });
        }
        //庫存充足
        product_detailA = newFilter_A.map((item) => {
            return [order_id, item.product_id, item.category_id, item.name, item.amount, item.price, 1];
        });
    }

    //確認庫存cate B
    let product_detailB;
    let noStockProduct_detailB;
    let enoughStockB = [];
    let otherStockB = [];
    let newFilter_B;
    if (class_id.length !== 0) {
        for (let i = 0; i < class_id.length; i++) {
            let [classStock] = await pool.execute('SELECT stock, product_id FROM class WHERE product_id = ?', [class_id[i][0]]);
            // console.log('classStock', classStock);
            //庫存大於購買數量
            if (classStock[0].stock >= class_id[i][1]) {
                //扣庫存
                let newStock = Number(classStock[0].stock) - Number(class_id[i][1]);
                enoughStockB.push(classStock[0].product_id);
                otherStockB.push([newStock, classStock[0].product_id]);
            }
        }
        // console.log('otherStockB', otherStockB);
        newFilter_B = filter_B.filter((item) => {
            return enoughStockB.indexOf(item.product_id) !== -1;
        });
        let noStockB = filter_B.filter((item) => {
            return enoughStockB.indexOf(item.product_id) === -1;
        });
        // console.log('newFilter_B', newFilter_B);
        // console.log('noStockB', noStockB.length, newFilter_B.length);
        //庫存不足
        if (noStockB.length !== 0) {
            noStockProduct_detailB = noStockB.map((item) => {
                return [item.name];
            });
            // console.log('noStockProduct_detailB', noStockProduct_detailB);
            return res.json({ noStock: noStockProduct_detailB, message: '已額滿' });
        }
        //庫存充足
        product_detailB = newFilter_B.map((item) => {
            return [order_id, item.product_id, item.category_id, item.name, item.start_date, item.end_date, item.amount, item.price, 1];
        });
    }
    // console.log('product_detailB', product_detailB);
    try {
        //產生訂單
        await pool.execute(
            `INSERT INTO order_product (order_id, user_id, receiver, phone, freight, shipment, address, pay_method, pay_state,pay_time, order_state, coupon_id, total_amount,create_time, valid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [order_id, data.user_id, data.receiver, data.phone, data.freight, 1, newAddress, data.pay_method, 1, momentTime, 1, coupon_id, data.total_amount, momentTime, 1]
        );

        //存order_product_detail //TODO:庫存足夠要扣庫存
        if (Array.isArray(product_detailA)) {
            await pool.query('INSERT INTO `order_product_detail`(`order_id`, `product_id`, `category_id`, `name`, `amount`, `price`, `valid`) VALUES ?', [product_detailA]);

            //修改庫存
            for (let i = 0; i < otherStockA.length; i++) {
                await pool.query('UPDATE product SET product.stock = ? WHERE product_id = ?', [otherStockA[i][0], otherStockA[i][1]]);
            }
        }

        if (Array.isArray(product_detailB)) {
            await pool.query(`INSERT INTO order_product_detail (order_id, product_id, category_id, name, start_date, end_date, amount, price, valid) VALUES ?`, [product_detailB]);

            //修改庫存
            for (let i = 0; i < otherStockB.length; i++) {
                await pool.query('UPDATE class SET class.stock = ? WHERE product_id = ?', [otherStockB[i][0], otherStockB[i][1]]);
            }
        }

        let products_delete = data.product_detail.map((item) => {
            return [item.product_id];
        });

        // console.log('刪除cart 產生訂單', products_delete);

        //刪除在購物車的商品
        for (let i = 0; i < products_delete.length; i++) {
            await pool.query(`DELETE FROM user_cart WHERE (user_id=?) AND (product_id=?)`, [data.user_id, products_delete[i]]);
            // console.log('deleteItemData', deleteItemData);
        }

        //修改優惠券use額度
        if (coupon_id != 0) {
            await pool.execute('UPDATE coupon_detail SET coupon_detail.use = 0 WHERE user_id= ? && coupon_id= ?', [data.user_id, data.coupon_id]);
        }

        res.json({ order_id: order_id, message: '訂單已成立' });
    } catch (err) {
        res.status(404).json({ message: '新增訂單失敗' });
    }
});

//查詢訂單
router.get('/:id', async (req, res, next) => {
    // console.log('查詢user_id req.params', req.params);
    const user_id = req.params.id;
    try {
        let [response_product] = await pool.execute(
            `SELECT order_product.*, order_product_detail.category_id,product_img.image, order_state.name AS order_stateName FROM (order_product JOIN order_product_detail ON order_product_detail.order_id = order_product.order_id) JOIN product_img ON order_product_detail.product_id = product_img.product_id JOIN order_state ON order_state.id = order_product.order_state WHERE order_product.user_id = ? ORDER BY order_product.create_time DESC;`,
            [user_id]
        );
        let [response_class] = await pool.execute(
            `SELECT order_product.*, order_product_detail.category_id,class_img.image_1, order_state.name AS order_stateName FROM (order_product JOIN order_product_detail ON order_product_detail.order_id = order_product.order_id) JOIN class_img ON order_product_detail.product_id = class_img.product_id JOIN order_state ON order_state.id = order_product.order_state WHERE order_product.user_id = ? ORDER BY order_product.create_time DESC;`,
            [user_id]
        );
        const response = response_product.concat(response_class);
        // console.log(response);

        res.json({ user_id: user_id, message: 'All Good 訂單查詢', myOrder: response });
    } catch (err) {
        res.status(404).json({ message: '訂單查詢失敗' });
    }
});

//加入驗證session 取得id 就能用params
router.get('/detail/:order_id', async (req, res, next) => {
    // console.log('查詢order_id req.params', req.params, req.query.user_id);
    //取得user_id判斷此訂單是否為該使用者輸入
    // console.log('req.session.member', req.session.member);
    if (!req.session.member) {
        return res.status(401).json({ message: '已登出請重新登入' });
    }
    const user_id = req.query.user_id;
    const order_id = req.params.order_id;

    try {
        //使用者資訊
        let [response_userInfo] = await pool.execute(
            `SELECT order_product.*, coupon.name AS coupon_name,coupon.discount FROM order_product LEFT JOIN coupon ON order_product.coupon_id = coupon.id WHERE order_id= ? AND user_id = ?`,
            [order_id, user_id]
        );

        // console.log('response_userInfo', response_userInfo);

        //使用者購買清單
        let [response_orderListA] = await pool.execute(
            `SELECT order_product_detail.* ,product_img.image, brand.name AS brand_name FROM order_product_detail JOIN product_img ON order_product_detail.product_id = product_img.product_id JOIN product ON order_product_detail.product_id = product.product_id JOIN brand ON product.ins_brand = brand.id WHERE order_product_detail.order_id=?`,
            [order_id]
        );
        let [response_orderListB] = await pool.execute(
            `SELECT order_product_detail.* ,class_img.image_1 FROM order_product_detail JOIN class_img ON order_product_detail.product_id = class_img.product_id WHERE  order_product_detail.order_id=?`,
            [order_id]
        );

        // console.log('response_userInfo', response_userInfo);

        const response = response_orderListA.concat(response_orderListB);
        // console.log('response', response);

        res.json({ user_id: user_id, message: 'All Good 訂單詳細查詢', userInfo: response_userInfo, orderList: response });
    } catch (err) {
        res.status(404).json({ message: '訂單詳細查詢失敗' });
    }
});

module.exports = router;
