const nodemailer = require('nodemailer');

async function testGmail() {
    console.log("Testing Gmail SMTP with environment password...");
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER || 'logosigneed@gmail.com',
            pass: process.env.SMTP_PASS || ''
        }
    });

    try {
        await transporter.verify();
        console.log("✅ GMAIL SMTP SUCCESS!");
    } catch (err) {
        console.error("❌ GMAIL SMTP FAILED:", err.message);
    }
}

testGmail();
