const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const serviceSchema = mongoose.Schema({
  name: {
    required: true,
    type: String,
    unique: 1,
    maxlength: 100
  },
  description: {
    required: true,
    type: String,
    maxlength: 100000
  },
  specification: {
    type: String,
    maxlength: 100000
  },
  price: {
    type: Number,
    maxlength: 255
  },
  brand: {
    type: Schema.Types.ObjectId,// same as ,.. mongoose.Schema.Type.ObjectId
    ref: 'serviceBrands',
  },
  category: {
    type: Schema.Types.ObjectId,// same as ,.. mongoose.Schema.Type.ObjectId
    ref: 'ServiceCategories',
    required: true
  },
  shipping: {
    required: true,
    type: Boolean
  },
  available: {
    required: true,
    type: Boolean
  },
  sold: {
    type: Number,
    default: 0
  },
  publish: {
    required: true,
    type: Boolean
  },
  images: {
    type: Array,
    default: []
  }
}, {timestamps: true});

const Services = mongoose.model('Services', serviceSchema);
module.exports = {Services};