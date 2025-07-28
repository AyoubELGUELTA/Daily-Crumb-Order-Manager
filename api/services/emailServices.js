const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendVerificationEmail(recipientEmail, verificationToken) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Vérifiez votre adresse e-mail',
        html: `
            <p>Bonjour,</p>
            <p>Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse e-mail :</p>
            <a href="http://localhost:3100/users/verifyEmail?token=${verificationToken}">Vérifiez mon e-mail</a>
            <p>Ce lien expirera dans 30 minutes.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('E-mail de vérification envoyé :', info.response);
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'e-mail :', error);
        return false;
    }
}

module.exports = { sendVerificationEmail };
