const mongoose = require('mongoose');

const brandSchema = mongoose.Schema({
  category: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref:"Categories"
  },
  name: {
    required: true,
    type: String,
    unique: 1,
    maxlength: 100
  }
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = {Brand}