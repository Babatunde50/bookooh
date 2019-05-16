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
    mobile: {
        type: String,
        require: true
    },
    profileImage: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    booksId: [{
        type: Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    }],
    resetToken: String,
    resetTokenExpiration: Date
});

module.exports = mongoose.model('User', userSchema);