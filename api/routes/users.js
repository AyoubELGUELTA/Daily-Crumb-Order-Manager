const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();

const prisma = require('../../prismaClient.js');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PasswordValidator = require('password-validator');


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

        if (!email || !password || !role) {
            return res.status(400).json({ message: "Please, be sure to enter an email and a password, and to define your status aswell." })
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
        else {
            const hash = await bcrypt.hash(password, 10)
            const newUser = await prisma.user.create({
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


module.exports = router;
