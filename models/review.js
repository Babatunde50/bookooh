const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    review: {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
    bookId: {
        type: Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    }
}, {timestamps: true});

module.exports = mongoose.model('Review', reviewSchema);