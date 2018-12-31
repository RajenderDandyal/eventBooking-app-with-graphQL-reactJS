const mongoose = require('mongoose');

const categoriesSchema = mongoose.Schema({
  category:{
    required: true,
    type: String,
    trim: true,
    maxlength:100
  }
});

const Categories = mongoose.model('Categories',categoriesSchema);

module.exports = { Categories };