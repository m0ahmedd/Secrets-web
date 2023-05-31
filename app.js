//jshint esversion:6
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const express = require("express");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require('bcrypt');
const passport = require("passport");
const session = require('express-session');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook');
const findOrCreate = require('mongoose-findorcreate');




// const saltRounds = 10;

const app = express();


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: 'our little secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  } // If set to True, problems appear in isAuthenticated!!
}));

app.use(passport.initialize());

app.use(passport.session());

const port = 3000;


mongoose.connect("mongodb://127.0.0.1:27017/userDB")
  .then(() => console.log("Connected to userDB!"))
  .catch((error) => {
    console.error("Failed to connect to wikiDB!");
  });

const userSchema = new mongoose.Schema({
  email: {
    type: String
    // required: [true, "Please enter the user name!"]
  },
  password: {
    type: String
    // required: [true, "Please enter the user's password!"]
  },
  googleId: String,
  secret: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// use static authenticate method or createStrategy method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

// Add any other plugins or middleware here. For example, middleware for hashing passwords

// const encKey = process.env.SOME_32BYTE_BASE64_STRING;
// const sigKey = process.env.SOME_64BYTE_BASE64_STRING;

// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {
//     secret: secret,
//     encryptedFields: ['password']
// });
// This adds _ct and _ac fields to the schema, as well as pre 'init' and pre 'save' middleware,
// and encrypt, decrypt, sign, and authenticate instance methods
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id
    }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function (req, res) {
  res.render("home");
});


app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook', {
    scope: ['profile']
  }));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", function (req, res) {
  res.render("login");
});


app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.err("Failed to logout! => " + err);
      return next(err);
    };
    res.redirect('/');
  });
});

app.get("/secrets", function (req, res) {
  // if (req.isAuthenticated()) {
  //   User.findById(req.user.id)
  //       .then((user)=> res.render("secrets", {secret: user.secret}))
  //       .catch((err)=> console.error("Can not find the User! => "+ err));
  // } else {
  //   console.log("You are not logged in!");
  //   res.redirect("/login");
  // };
  User.find({"secret": {$ne:null}})
      .then((foundUsers)=> res.render("secrets", {usersWithSecrets:foundUsers}) )
      .catch((err)=> console.error("Error in finding users with secrets! => "+ err));
});


app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit")
  } else {
    console.log("You are not logged in!");
    res.redirect("/login");
  };
})

app.post("/register", function (req, res) {

  // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
  //     // Store hash in your password DB.
  //     const newUser = new User({
  //         email: req.body.username,
  //         password: hash
  //     });
  //     newUser.save()
  //         .then(function () {
  //             console.log("Successfully registered.");
  //             res.render("secrets");
  //         })
  //         .catch((error) => console.error("Failed to register! => " + error));
  // });

  User.register({
    username: req.body.username
  }, req.body.password, function (err, user) {
    if (err) {
      console.log("Error in registering! => " + err);
      res.redirect("/register");
    } else {
      passport.authenticate("local", {
        failureRedirect: '/login'
      })(req, res, function () {
        // req.session.isAuthenticated = true;
        res.redirect("/secrets");
      });

    };
  });
});


app.post("/login", function (req, res) {

  // const user = req.body.username;
  // const password = req.body.password;

  // User.findOne({
  //         email: user
  //     })
  //     .then(function (usr) {
  //         if (usr) {
  //             bcrypt.compare(password, usr.password, function (err, result) {
  //                 // result == true
  //                 if (result === true) {
  //                     res.render("secrets");
  //                 } else {
  //                     console.log("Wrong Password or Email!");
  //                     res.redirect("login");
  //                 };
  //             });
  //         } else {
  //             console.log("User in not registered, register please!");
  //             res.redirect("login");
  //         };
  //     })
  //     .catch((error) => console.error("User is not registered!"));

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      console.log("Failed to log in! => " + err);
      res.redirect("/login");
    } else {
      passport.authenticate("local", {
        failureRedirect: '/login'
      })(req, res, function () {
        // req.session.isAuthenticated = true;
        res.redirect("/secrets");
      });
    };
  });
});


app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  // Thanks to passport, u can access the cureently authenticated user:
  console.log(req.user.id);
  User.updateOne({_id: req.user.id}, {secret: submittedSecret})
      .then(function(){
            console.log("Your secret is saved ;)");
            res.redirect("/secrets");
          })
      .catch((err)=> console.error("Error in updating your secret! => " + err));

});


app.listen(port || process.env.PORT, function () {
  console.log("Server started on port " + port);
});