const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();

const prisma = require('../../prismaClient.js');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PasswordValidator = require('password-validator');

const authenticateToken = require('../middlewares/auth.js');



const schemaPassword = new PasswordValidator();

schemaPassword
    .is().min(8)
    .has().uppercase()
    .has().digits()
    .has().symbols();


router.post('/signup', async (req, res, next) => {

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

        const reqNewUser = await prisma.user.findUnique({
            where: { email: email }
        });

        if (reqNewUser) {
            return res.status(400).json({ message: "Email already used by another user." })
        }
        else if ((role === 'Admin' && keyRole !== process.env.ADMIN_KEY_SIGNUP) || (role === 'Employee' && keyRole !== process.env.EMPLOYEE_KEY_SIGNUP)) {
            return res.status(400).json({ message: "The key of your role does not fit to your associated role." })
        }
        else {
            const hash = await bcrypt.hash(password, 10)
            await prisma.user.create({
                data: {
                    email: email,
                    password: hash,
                    name: name || "Unknown",
                    role: role

                }
            });

            return res.status(201).json({
                message: "New user signed up!"
            })

        }
    }


    catch (error) {
        res.status(500).json({ error: error.message })
    }


})


router.post('/login', async (req, res, next) => {

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
                }, process.env.JWT_KEY,
                    { expiresIn: "1h" }
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


})


router.delete('/:userId', authenticateToken, async (req, res) => {
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
});


module.exports = router;


