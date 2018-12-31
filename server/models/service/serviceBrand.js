const mongoose = require('mongoose');

const serviceBrandSchema = mongoose.Schema({
  name:{
    required: true,
    type: String,
    unique: 1,
    maxlength:100
  }
});

const serviceBrands = mongoose.model('serviceBrands',serviceBrandSchema);

module.exports = { serviceBrands }