const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary');


const users = require('./routes/api/users');
const product = require('./routes/api/product');


mongoose.Promise = global.Promise;

// DB config
const mongoDB = require('./config/keys').DataBase;

// connect to DB
mongoose.connect(mongoDB, { useNewUrlParser: true })
    .then(() => console.log("Connected to mongoDB") )
    .catch((e) => console.log(e));

// cloudinary secret and key from cloudinary account
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});
//body-parser middleware
// basically tells the system whether you want to use a simple algorithm for shallow parsing (i.e. false)
// or complex algorithm for deep parsing that can deal with nested objects (i.e. true)
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//cookie parser middleware
app.use(cookieParser());

// passport middleware
app.use(passport.initialize());

// passport config
// running the exported function from "./config/passport" with passport as parameter
require("./config/passport")(passport);

//use routes
app.use('/api/users', users);
app.use('/api/product', product);



//Server static assets if in production
if (process.env.NODE_ENV === 'production') {
  //set static folder
  app.use(express.static('client/build'))

//this should be last route
// for all get request in production send index.html ... aka spa
// means any route other than above 'use routes' then send index.html means our react app
  app.get("/*", (req,res) =>{
    res.sendFile(path.resolve(__dirname, '../client/build/index.html'))
  });

}
app.get("/*", (req,res) =>{
  res.sendFile(path.resolve(__dirname, '../client/public/index.html'))
});
const port = process.env.PORT || 5010;

app.listen(port, () => console.log('Server running on port ' + port));