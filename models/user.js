const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        required: true
    },
    books: [{
        type: Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    }],
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review',
        required: true
    }],
    verifyToken: String,
    verifyTokenExpiration: Date
});

module.exports = mongoose.model('User', userSchema);