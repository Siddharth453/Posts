var flash = require("connect-flash");
var express = require("express");
var methodOverride = require("method-override");
var app = express();
var bodyParser = require("body-parser");
var passport = require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var mongoose = require("mongoose");
var Post = require("./models/posts");
var User = require("./models/user");
var Comment = require("./models/comment");
mongoose.connect("mongodb://localhost/posts");
mongoose.set('useFindAndModify', false);
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(flash());
// Post.create({
// 	name: "Welcome Everybody in the website.",
// 	author:"Owner of the website.",
// 	link:"https://wdbapp3.run-ap-south1.goorm.io/posts"
// },function(err, post){
// 	if(err){
// 		console.log(err);
// 	}else{
// 		console.log("NEWLY CREATED POST: ");
// 		console.log(post);
// 	}
// });
app.use(express.static("public"));
//PASSPORT CONFIGRATION
app.use(require("express-session")({
	secret: "New User Model In Post App",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.get("/", function(req, res){
	res.render("home.ejs", {currentUser: req.user});
});
app.get("/posts/new", isLoggedIn, function(req, res){
	res.render("newpost.ejs", {currentUser: req.user})
})
app.get("/posts", function(req, res){
	Post.find({}, function(err, posts){
		if(err){
			console.log(err);
		}
		else{
			res.render("posts.ejs", {posts: posts, currentUser: req.user, message: req.flash("success")});
		}
	});
});
app.post("/addpost", isLoggedIn, function(req, res){
	var name = req.body.postname;
	var author = req.body.postauthor;
	var link = req.body.postlink;
	var desc = req.body.description;
	var newpost = {name: name, author:author, link:link, description: desc};
    Post.create(newpost, function(err, newlyCreated){
		if(err){
			console.log(err);
		}else{
			newlyCreated.author.id = req.user.id;
			newlyCreated.author.username = req.user.username;
			newlyCreated.save();
			res.redirect("/posts");
		}
	});
});
app.get("/posts/:id", function(req,res){
	Post.findById(req.params.id).populate("comments").exec(function(err, foundPost){
		if(err){
			console.log(err);
		}else{
			res.render("show.ejs", {posts:foundPost, currentUser: req.user, message: req.flash("error1"), message1: req.flash("error2")});
		}
	});
});
app.get("/posts/:id/edit", checkCampgroundOwnership, function(req, res){
	   Post.findById(req.params.id, function(err, updatePost){
		   res.render("edit.ejs", {posts: updatePost, currentUser: req.user});
	});
});
app.put("/posts/:id",checkCampgroundOwnership, function(req, res){
	var data = {name: req.body.postname, link: req.body.postlink, description: req.body.description};
	Post.findByIdAndUpdate(req.params.id, data, function(err, editPost){
		if(err){
			res.redirect("/posts");
		}else{
			res.redirect("/posts/"+ editPost._id);
		}
	});
});
app.delete("/posts/:id",checkCampgroundOwnership, function(req, res){
	Post.findByIdAndRemove(req.params.id, function(err){
		if(err){
			res.redirect("/posts");
		}else{
			res.redirect("/posts");
		}
	});
});
// AUTH ROUTES
// show register form
app.get("/register", function(req, res){
	res.render("register.ejs",{currentUser: req.user, message2: req.flash("errorinsignup")});
});
//handle sign up logic
app.post("/register", function(req, res){
   var newUser = new User({username: req.body.username});
   User.register(newUser, req.body.password, function(err, user){
	  if(err){
		  req.flash("errorinsignup", err.message)
		  res.redirect("/register");
	  } 
	  passport.authenticate("local")(req, res, function(){
		 req.flash("success", "Nice To Meet You " + req.user.username + ", You Have Successfully Signed up!");
		 res.redirect("/posts") 
	  });
   });
});
// show login form
app.get("/login", function(req, res){
	res.render("login.ejs", {currentUser: req.user, message: req.flash("error")})
});
//handling login logic
app.post("/login", passport.authenticate("local",
{
	successRedirect: "/posts",
	failureRedirect: "/login"
}), function(req, res){
});
//Logout logic
app.get("/logout", function(req, res){
	req.logout();
	res.redirect("/posts");
});
function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "You Need To Be Logged In First!!");
	res.redirect("/login");
}
function checkCampgroundOwnership(req, res, next){
	//is user logged In?
	if(req.isAuthenticated()){
	   Post.findById(req.params.id, function(err, updatePost){
	    if(err){
			res.redirect("back");
		}
		  else{
		   //does the user own the post? 
			if(updatePost.author.id.equals(req.user._id)){
			     next();
			}
		   //otherwise, redirect
		   else{
			    req.flash("error2", "You Do Not Have Permission to do That!!");
	            res.redirect("/posts/" + req.params.id);		   
		   }
	    }
	});
	//if not, redirect
	}else{
	   req.flash("error1", "You Need To Be Logged In First!!");
       res.redirect("/posts/" + req.params.id)
	}
};
function checkCommentOwnership(req, res, next){
	//is user logged In?
	if(req.isAuthenticated()){
	   Comment.findById(req.params.comment_id, function(err, foundComment){
	    if(err){
			res.redirect("back");
		}
		  else{
		   //does the user own the comment? 
			if(foundComment.author.id.equals(req.user._id)){
			     next();
			}
		   //otherwise, redirect
		   else{
			    req.flash("error2", "You Do Not Have Permission to do That!!");
	            res.redirect("/posts/" + req.params.id);		   
		   }
	    }
	});
	//if not, redirect
	}else{
	   req.flash("error1", "You Need To Be Logged In First!!");
       res.redirect("/posts/" + req.params.id)
	}
};
//===========================================================================================================================\\
// Comment Routes
app.get("/posts/:id/comments/new", isLoggedIn, function(req, res){
	Post.findById(req.params.id, function(err, post){
		if(err){
			console.log(err);
		}else{
		    res.render("commentnew.ejs", {posts: post,currentUser: req.user});
		}
	});
});
app.post("/posts/:id/comments",isLoggedIn, function(req, res){
	//lookup posts using ID
	    Post.findById(req.params.id, function(err, post){
			if(err){
				console.log(err);
				res.redirect("/posts")
			}else{
				Comment.create(req.body.comment, function(err, comment){
					if(err){
						console.log(err);
						res.redirect("/posts");
					}else{
						post.comments.push(comment);
						post.save();
						comment.author.id = req.user.id;
			            comment.author.username = req.user.username;
			            comment.save();
						res.redirect("/posts/" + post._id);
					}
				});
			}
		});
});
app.get("/posts/:id/comments/:comment_id/edit", checkCommentOwnership, function(req, res){
	Comment.findById(req.params.comment_id, function(err, commentedit){
		if(err){
			console.log(err);
			res.redirect("/posts")
		}else{
			var id = req.params.id;
			res.render("commentedit.ejs", {comment: commentedit, currentUser: req.user, id: id});
		}
	});
});
//=================
app.put("/posts/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, commentupdate){
		if(err){
			console.log(err)
			res.redirect("/posts");
		}else{
			res.redirect("/posts/" + req.params.id);
		}
	});
});
//================
app.delete("/posts/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err, commentdelete){
		if(err){
			console.log(err)
			res.redirect("/posts");
		}else{
			res.redirect("/posts/" + req.params.id);
		}
	});
});
//===========================================================================================================================\\
app.get("*", function(req, res){
	res.render("notfound.ejs");
});
app.listen(process.env.PORT || 4003, process.env.IP, function(){
	console.log("Server has STARTED!!");
});