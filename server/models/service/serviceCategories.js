const mongoose = require('mongoose');

const serviceCategoriesSchema = mongoose.Schema({
  name:{
    required: true,
    type: String,
    unique: 1,
    maxlength:100
  }
});

const ServiceCategories = mongoose.model('ServiceCategories',serviceCategoriesSchema);

module.exports = { ServiceCategories };