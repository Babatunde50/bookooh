const crypto = require('crypto')

const { validationResult } = require('express-validator/check')
const bcrypt = require('bcryptjs')
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const PNF = require('google-libphonenumber').PhoneNumberFormat;

const { sendWelcomeEmail, sendResetPasswordEmail, sendPasswordResetSuccessEmail } = require('../emails/account')
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
            confirmPassword: null,
            mobile: null
        },
        validationErrors: []
    })
}

exports.getLogin = (req, res, next) => {
    let message = req.flash('success')
    if(message.length > 0) {
        message = message[0]
    } else {
        message = null
    }
    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/auth/login',
        errorMessage: null,
        oldInput:  {
            email: null,
            password: null
        },
        validationErrors: [],
        successMessage: message
    })
}

exports.postSignUp = async (req, res, next) => {
    const username = req.body.username.toLowerCase()
    const email = req.body.email
    const password = req.body.password
    const mobile = req.body.mobile
    const confirmPassword = req.body.confirmPassword
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('auth/signup', {
        pageTitle: 'Sign Up',
        path: '/auth/signup',
        errorMessage: errors.array()[0].msg,
        oldInput: {
            email: email,
            password: password,
            username: username,
            confirmPassword: confirmPassword,
            mobile: mobile
        },
        validationErrors: errors.array()
      });
    }
    const number = phoneUtil.parseAndKeepRawInput(mobile, 'NG');
    const dbMobile = phoneUtil.format(number, PNF.E164).slice(1)
    try {
    const hashedPw = await bcrypt.hash(password, 12)
    const createdUser = await new User({
        username: username,
        email: email,
        mobile: dbMobile,
        password: hashedPw
        })
    await createdUser.save()
    sendWelcomeEmail(email, username)
    req.flash('success', 'You have successfully registered')
    res.redirect('/auth/login') 
    }
    catch (err) {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
    }   
}

exports.postLogin = async (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('auth/login', {
        pageTitle: 'Login',
        path: '/auth/login',
        errorMessage: errors.array()[0].msg,
        oldInput: {
            email: email,
            password: password
        },
        validationErrors: errors.array(),
        successMessage: null
      });
    }

    try {
        const user = await User.findOne({email: email})
        if(!user) {
            return res.status(422).render('auth/login', {
                pageTitle: 'Login',
                path: '/auth/login',
                errorMessage: "Invalid Email or Password",
                oldInput: {
                    email: email,
                    password: password
                    },
                validationErrors: errors.array(),
                successMessage: null
                    });
                }
        const doMatch = await bcrypt.compare(password, user.password)
        if(doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user
            req.session.save(err => {
                req.flash('success', 'You have succesfully logged in')
                res.redirect('/books');
                });
        } else {
            return res.status(422).render('auth/login', {
            pageTitle: 'Login',
            path: '/auth/login',
            errorMessage: "Invalid Email or Password",
            oldInput: {
                email: email,
                password: password
                },
            validationErrors: errors.array(),
            successMessage: []
                });
            }
    }
    catch (err) {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
    }

}

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        if(!err) {
            res.redirect('/')
        }
    })
}

exports.getReset = (req, res, next) => {
    res.render('auth/reset', {
        pageTitle: 'Reset Password',
        path: '/auth/reset',
        errorMessage: null,
        oldInput: {
            email: null
        },
        successMessage: null
    })
}

exports.postReset = async (req, res, next) => {
    try {
        const buffer = await crypto.randomBytes(32)
        const token = buffer.toString('hex')
        const user = await User.findOne({email: req.body.email})
        if(!user) {
            return res.status(422).render('auth/reset', {
                pageTitle: 'Reset Password',
                path: '/auth/reset',
                errorMessage: "Email not found",
                oldInput: {
                    email: req.body.email
                },
                successMessage: null
            })
        }
        user.resetToken = token
        user.resetTokenExpiration = Date.now() + 3600000
        user.save()
        sendResetPasswordEmail(req.body.email, token)
        req.flash('success', 'A password reset link has been sent to your mail. This expires after an hour')
        res.redirect('/')
    } catch(err) {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
    }
    
}


exports.getNewPassword = async (req, res, next) => {
    const token = req.params.token
    try {
        const user = await User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        if(!user) {
            return res.redirect('/')
        }
        res.render('auth/new-password', {
            pageTitle: 'New Password',
            path: '/auth/new-password',
            errorMessage: null,
            oldInput: {
                email: null
            },
            userId: user._id.toString(),
            passwordToken: token,
            validationErrors: []
        })
    } catch(err) {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
    }   
}

exports.postNewPassword = async (req, res, next) => {
    const newPassword = req.body.password 
    const userId = req.body.userId
    const passwordToken = req.body.passwordToken
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).render('auth/new-password', {
            pageTitle: 'New Password',
            path: '/auth/new-password',
            validationErrors: errors.array(),
            oldInput: {
                password: newPassword,
                confirmPassword: req.body.confirmPassword
            },
            userId: userId,
            passwordToken: passwordToken
        });
      }

    try {
        const user = await User.findOne({resetToken: passwordToken, _id: userId  })
        if(!user) {
            return res.redirect("back")
        }
        const hashedPassword =  await bcrypt.hash(newPassword, 12)
        user.password = hashedPassword
        user.resetToken = undefined
        user.resetTokenExpiration = undefined
        user.save()
        sendPasswordResetSuccessEmail(user.email)
        req.flash('success', 'Your password has been updated successfully')
        res.redirect('/auth/login')
    } catch(err) {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
    }
}