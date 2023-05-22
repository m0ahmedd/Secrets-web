//jshint esversion:6
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const express = require("express");
const encrypt = require("mongoose-encryption");

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

const port = 3000;


mongoose.connect("mongodb://127.0.0.1:27017/userDB")
    .then(() => console.log("Connected to userDB!"))
    .catch((error) => {
        console.error("Failed to connect to wikiDB!");
    });

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Please enter the user name!"]
    },
    password: {
        type: String,
        required: [true, "Please enter the user's password!"]
    }
});


// Add any other plugins or middleware here. For example, middleware for hashing passwords

// const encKey = process.env.SOME_32BYTE_BASE64_STRING;
// const sigKey = process.env.SOME_64BYTE_BASE64_STRING;
const secret =  process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });
// This adds _ct and _ac fields to the schema, as well as pre 'init' and pre 'save' middleware,
// and encrypt, decrypt, sign, and authenticate instance methods


const User = new mongoose.model("User", userSchema);



app.get("/", function (req, res) {
    res.render("home");
});


app.get("/login", function (req, res) {
    res.render("login");
});


app.get("/register", function (req, res) {
    res.render("register");
});


app.post("/register", function(req, res){

    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save()
            .then(function(){
                console.log("Successfully registered.");
                res.render("secrets");
            } )
            .catch((error)=> console.error("Failed to register! => "+error));

});

app.post("/login", function(req, res){

    const user = req.body.username;
    const password = req.body.password;

    User.findOne({email: user})
        .then( function(usr){
            if(usr){
                if(usr.password === password){
                    res.render("secrets");
                }
                else{
                    console.log("Wrong Password or Email!");
                    res.redirect("login");
                };
            }else{
                console.log("User in not registered, register please!");
                res.redirect("login");
            };
        })
        .catch((error)=> console.error("User is not registered!"));
});

app.listen(port || process.env.PORT, function () {
    console.log("Server started on port " + port);
});