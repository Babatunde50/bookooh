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
 department: {
     type: String,
     required: false
 },
 faculty: {
     type: String,
     required: false
 },
 available: {
    type: Boolean,
    default: true
 },
 image: {
     type: String,
     required: true
 },
location: {
    type: String,
    required: false
},
coordinates: {
    type: Array,
    required: false
},
 pdf: {
    type: String,
    required: false
 },
 downloads: {
    type: Number,
    required: false
 },
 userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
 averageRatings: {
    type: Number,
    required: true
 },
  reviewsId: [{
      type: Schema.Types.ObjectId,
      ref: 'Review'
  }]
}, {timestamps: true});

module.exports = mongoose.model('Book', bookSchema);