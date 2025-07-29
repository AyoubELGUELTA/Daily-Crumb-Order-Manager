
const prisma = require('../../prismaClient.js');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const PasswordValidator = require('password-validator');

const { sendVerificationEmail } = require('../services/emailServices.js');


const schemaPassword = new PasswordValidator();

schemaPassword
    .is().min(8)
    .has().uppercase()
    .has().digits()
    .has().symbols();




exports.user_signup = async (req, res, next) => {

    try {
        const email = req.body.email;
        const password = req.body.password;
        const name = req.body.name;
        const role = req.body.role;
        const keyRole = req.body.keyRole;

        if (!email || !password || !role || !keyRole) {
            return res.status(400).json({ message: "Please, be sure to enter an email and a password, and to define your role with its key aswell." })
        }

        if (!schemaPassword.validate(password)) {
            return res.status(400).json({ message: "Your password does not fulfill one or several of these requirements: minimum 8 characters/ contains at least 1 digit, at least 1 special symbol, at least 1 uppercase letter." })
        }

        let reqNewUser = await prisma.user.findUnique({
            where: { email: email }
        });

        if (reqNewUser && reqNewUser.is_email_verified === true) {
            return res.status(400).json({ message: "Email already used by another user." })
        }
        else if ((role === 'Admin' && keyRole !== process.env.ADMIN_KEY_SIGNUP) || (role === 'Employee' && keyRole !== process.env.EMPLOYEE_KEY_SIGNUP)) {
            return res.status(400).json({ message: "The key of your role does not fit to your associated role." })
        }
        else {


            const hash = await bcrypt.hash(password, 10)

            if (!reqNewUser) { //we create in our database the new user if his email was not found in the db, else we don't need to register his informations, but just need to check his email.
                reqNewUser = await prisma.user.create({
                    data: {
                        email: email,
                        password: hash,
                        name: name || "Unknown",
                        role: role,
                        is_email_verified: false

                    }
                });

            }

            else { //if the user exists but is not verified

                reqNewUser = await prisma.user.update({
                    where: { email: email },
                    data: {
                        password: hash,
                        name: name || "Unknown",
                        role: role,
                        keyRole: keyRole
                    }
                })
            }
            const verificationToken = jwt.sign({
                userId: reqNewUser.id
            }, process.env.JWT_VERIFICATION_SECRET,
                { expiresIn: "30m" }
            );
            const emailSent = await sendVerificationEmail(reqNewUser.email, verificationToken);

            if (emailSent) {
                return res.status(201).json({
                    message: 'Inscription réussie. Veuillez vérifier votre e-mail pour activer votre compte.'
                });
            } else {
                return res.status(500).json({
                    message: 'Inscription réussie, mais échec de l\'envoi de l\'e-mail de vérification.'
                });
            }


        }
    }


    catch (error) {
        res.status(500).json({ error: error.message })
    }


};

exports.user_verifyEmail = async (req, res, next) => {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(400).json({ error: "Error, token missing." })
        }

        const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET);

        const userId = decoded.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: "Validation Token invalid." })
        }

        else {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    is_email_verified: true
                }
            })
            const sessionToken = jwt.sign({
                email: user.email,
                userId: user.id,
                userRole: user.role
            }, process.env.JWT_SESSION_SECRET,
                { expiresIn: "2h" }
            );

            return res.status(200).json({ message: "Email was successfully verified", sessionToken })
        }


    }

    catch (error) {
        res.status(500).json({
            error: error.message,
            message: "Token invalid or expired."
        })
    }
};


exports.user_login = async (req, res, next) => {

    try {
        const email = req.body.email;
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({ message: "Both password and email are required to login." })
        }

        const checkUser = await prisma.user.findUnique({
            where: { email: email }
        });

        if (!checkUser) {
            return res.status(404).json({ message: "Authentification failed. Please make sure your password and email are correct." })
        }
        else {

            const checkPassword = await bcrypt.compare(password, checkUser.password)

            if (checkPassword === false) {
                return res.status(404).json({ message: "Authentification failed. Please make sure your password and email are correct." })
            }

            else {
                const token = jwt.sign({
                    email: checkUser.email,
                    userId: checkUser.id,
                    userRole: checkUser.role
                }, process.env.JWT_SESSION_SECRET,
                    { expiresIn: "2h" }
                );

                return res.status(200).json({
                    message: "Authentification successful",
                    token: token
                })
            }

        }

    }


    catch (error) {
        res.status(500).json({ error: error.message })
    }


}

exports.delete_user = async (req, res) => {
    if (req.user.userRole !== 'Admin') {
        return res.status(403).json({ message: 'Only admins can delete users' });
    }

    const userIdToDelete = parseInt(req.params.userId);

    try {

        const userToDelete = await prisma.user.findUnique({
            where: { id: userIdToDelete }
        });

        if (!userToDelete) return res.sendStatus(404);

        else {
            await prisma.user.delete({
                where: { id: userIdToDelete }
            });

            return res.sendStatus(204)
        }
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

exports.user_get = async (req, res) => {
    if (req.user.userRole !== 'Admin') {
        return res.status(403).json({ message: 'Only admins can look at the users' });
    }
    try {

        const userId = parseInt(req.query.userId);
        const userRole = req.query.userRole;
        let whereClause = {};

        if (userId) {
            const existingUser = await prisma.user.findUnique({
                where: { id: userId }
            })

            if (!existingUser) {
                return res.sendStatus(404)
            }

            else {

                return res.status(200).json({
                    email: existingUser.email,
                    name: existingUser.name || "Unknown",
                    id: existingUser.id,
                    role: existingUser.role
                })
            }
        } else {

            if (userRole) {
                whereClause.role = userRole;
            }
            const allUsers = await prisma.user.findMany({
                where: whereClause
            })

            const response = {
                totalCount: allUsers.length,
                users: allUsers.map(user => ({
                    id: user.id,
                    role: user.role,
                    email: user.email,
                    name: user.name || "Unknown"
                }))
            };

            return res.status(200).json(response);

        }
    }

    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};