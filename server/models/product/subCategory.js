const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const subCategoriesSchema = mongoose.Schema({
  category:{
    required: true,
    type: Schema.Types.ObjectId,
    ref:"Categories"
  },
  subCategory:{
    required: true,
    type: String,
    trim: true,
    maxlength:100
  }
});

const SubCategories = mongoose.model('SubCategories',subCategoriesSchema);

module.exports = { SubCategories };