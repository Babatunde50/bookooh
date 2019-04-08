const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const bookSchema = new Schema({
 title: {
     type: String,
     required: true
 },
 type: {
    type: String,
    required: true
 },
 description: {
     type: String,
     required: true
 },
 image: {
     type: String,
     required: true
 },
 userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviews: [{
      type: Schema.Types.ObjectId,
      ref: 'Review'
  }]
}, {timestamps: true});

module.exports = mongoose.model('Book', bookSchema);