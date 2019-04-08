const crypto = require('crypto')

const { validationResult } = require('express-validator/check')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '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'
    }
}))

const User = require('../models/user')

exports.getSignUp = (req, res, next) => {
    res.render('auth/signup', {
        pageTitle: 'Sign Up',
        path: '/auth/signup',
        errorMessage: null,
        oldInput:  {
            email: null,
            password: null,
            username: null,
            confirmPassword: null
        },
        validationErrors: []
    })
}

exports.getLogin = (req, res, next) => {
    const message = req.flash('success')
    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/auth/login',
        errorMessage: null,
        oldInput:  {
            email: null,
            password: null,
            username: null,
            confirmPassword: null
        },
        validationErrors: [],
        successMessage: message
    })
}

exports.postSignUp = async (req, res, next) => {
    const username = req.body.username
    const email = req.body.email
    const gender = req.body.gender
    const password = req.body.password
    const confirmPassword = req.body.confirmPassword
    const errors = validationResult(req);
    let profileImage = gender === 'male' ? "images\\male.png" : "images\\female.png"
    
    
    if (!errors.isEmpty()) {
        console.log(errors.array()[0])
      return res.status(422).render('auth/signup', {
        pageTitle: 'Sign Up',
        path: '/auth/signup',
        errorMessage: errors.array()[0].msg,
        oldInput: {
            email: email,
            password: password,
            username: username,
            confirmPassword: confirmPassword
        },
        validationErrors: errors.array()
      });
    }
    try {
    const hashedPw = await bcrypt.hash(password, 12)
    const buffer =  crypto.randomBytes(32)
    const token = await buffer.toString('hex')
    const createdUser = await new User({
        username,
        email,
        password: hashedPw,
        gender,
        profileImage,
        verified: false,
        verifyToken: token,
        verifyTokenExpiration: Date.now() + 3600000
            })
    await createdUser.save()
    req.flash('success', 'You have successfully signed up. Please check your email to verify your account.')
    res.redirect('/auth/login')
    console.log('User saved to database successfully')
    return transporter.sendMail({
        to: email,
        from: 'tundeJS@bookOoh.com',
        subject: 'Account Verification',
        html: `<h> Please click this <a href="http://localhost:3000/auth/verify/${token}">link<a> to verify your account. This will expire after an hour </h1>`
            })  
    }
    catch (err) {
        const error = new Error('err')
        error.httpStatusCode = 500
        console.log(err)
       // return next(error)
    }   
}


exports.getVerified = async (req, res, next) => {
    const token  = req.params.token
    try {
        const user = await User.findOne({verifyToken: token, verifyTokenExpiration: {$gt: Date.now()}})
        if(!user) {
            console.log('No user with that email was found.')
            return res.redirect('/')
            }
        foundUser = user
        user.verifyToken = undefined
        user.verifyTokenExpiration = undefined
        user.verified = true
        await user.save() 
        req.flash('success', 'Your account has been verified successfully.')
        res.redirect('/auth/login');
    }
    catch (err) {
        const error = new Error('err')
        error.httpStatusCode = 500
        console.log(err)
    }
    
}


exports.postLogin = async (req, res, next) => {
    const email = req.body.email
    const password = req.body.password

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array()[0])
      return res.status(422).render('auth/login', {
        pageTitle: 'Login',
        path: '/auth/login',
        errorMessage: errors.array()[0].msg,
        oldInput: {
            email: email,
            password: password
        },
        validationErrors: errors.array(),
        successMessage: []
      });
    }

    try {
        const user = await User.findOne({email: email})
        if(!user) {
            return res.status(422).render('auth/login', {
                pageTitle: 'Login',
                path: '/auth/login',
                errorMessage: "Password or Email is incorrect",
                oldInput: {
                    email: email,
                    password: password
                    },
                validationErrors: errors.array(),
                        successMessage: []
                    });
                }
        const doMatch = await bcrypt.compare(password, user.password)
        if(doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user
            req.session.save(err => {
                console.log(err)
                req.flash('success', 'You have succesfully logged in')
                res.redirect('/books');
                    });
        } else {
            return res.status(422).render('auth/login', {
            pageTitle: 'Login',
            path: '/auth/login',
            errorMessage: "Password or Email is incorrect",
            oldInput: {
                email: email,
                password: password
                },
            validationErrors: errors.array()
                });
            }
    }
    catch (err) {
        const error = new Error('err')
        error.httpStatusCode = 500
        console.log(err)
    }

}

exports.postLogout = (req, res, next) => {
    req.flash('success', 'You have sucessfully logged out.')
    req.session.destroy(err => {
        console.log(err)
        res.redirect('/books')
    })
}
