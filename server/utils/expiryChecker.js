const Product = require('../models/Product');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const sendEmail = require('./sendEmail');
const User = require('../models/User');

const checkExpiries = async () => {
    console.log('--- 🔍 ExpiryEaze Date Scan Initiative Started ---');
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const now = new Date();

        // 1. Find products expiring soon
        const nearExpiryProducts = await Product.find({
            expiryDate: { $lte: thirtyDaysFromNow, $gte: now }
        }).populate('vendor');

        for (const product of nearExpiryProducts) {
            const daysLeft = Math.ceil((product.expiryDate - now) / (1000 * 60 * 60 * 24));
            
            // --- A. ALERT VENDOR ---
            // Create in-app notification
            await Notification.create({
                recipient: product.vendor._id,
                title: 'Critical Expiry Alert',
                message: `Your product "${product.name}" is expiring in ${daysLeft} days (${product.expiryDate.toLocaleDateString()}). Consider applying a higher discount or removing stock.`,
                type: 'ExpiryWarning',
                relatedProduct: product._id
            });

            // Send Email
            try {
                await sendEmail({
                    to: product.vendor.email,
                    subject: `⚠️ URGENT: Product Expiry Warning - ${product.name}`,
                    html: `
                        <h1>Inventory Management Alert</h1>
                        <p>Your product <strong>${product.name}</strong> is nearing its expiry date.</p>
                        <p>Expiry Date: <strong>${product.expiryDate.toLocaleDateString()}</strong> (${daysLeft} days remaining).</p>
                        <p>We recommend updating your pricing or inventory status to minimize loss.</p>
                    `
                });
            } catch (err) {
                console.error(`Email failed for vendor ${product.vendor.email}`);
            }

            // --- B. ALERT CUSTOMERS ---
            // Find all unique users who bought this specific product
            const relevantOrders = await Order.find({
                'products.product': product._id
            }).populate('user');

            // Unique users only to avoid spamming
            const usersToNotify = new Map();
            relevantOrders.forEach(order => {
                if (order.user && order.user.email) {
                    usersToNotify.set(order.user._id.toString(), order.user);
                }
            });

            for (const [userId, userObj] of usersToNotify) {
                await Notification.create({
                    recipient: userId,
                    title: 'Safety Warning: Medicine Expiry',
                    message: `Safety Alert: The "${product.name}" you purchased is expiring in ${daysLeft} days. Please check your medical cabinet.`,
                    type: 'ExpiryWarning',
                    relatedProduct: product._id
                });

                try {
                    await sendEmail({
                        to: userObj.email,
                        subject: `🛡️ Safety First: Medication Expiry Update`,
                        html: `
                            <h1>Safety Alert: ExpiryEaze Guard</h1>
                            <p>Hello ${userObj.name}, our system shows you purchased <strong>${product.name}</strong> from our platform.</p>
                            <p>Please note that this item is reaching its expiry date on <strong>${product.expiryDate.toLocaleDateString()}</strong>.</p>
                            <p><strong>Recommendation:</strong> Do not consume medications past their expiry date. Please dispose of any unused portion safely.</p>
                        `
                    });
                } catch (err) {
                    console.error(`Email failed for user ${userObj.email}`);
                }
            }
        }
        console.log(`--- ✅ Scan Complete. Processed ${nearExpiryProducts.length} at-risk items. ---`);
    } catch (err) {
        console.error('Expiry scan error:', err);
    }
};

module.exports = checkExpiries;
