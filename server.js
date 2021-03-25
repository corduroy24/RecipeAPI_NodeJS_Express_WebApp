/*Assignment 4 Comp 2406 
Student Name: Korede Adegboye
Student Number: 101001124
*/
var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var cookieParser = require('cookie-parser');
var pug = require('pug');
var hat = require('hat'); //creates random tokens

//set app pug given
app.set('views','./views');
app.set('view engine','pug');

app.use(function(req,res,next){
	console.log(req.method+" request for "+req.url);
	next();
});

//handle request for route directory 
app.get(['/', '/index.html', '/home', '/index'], cookieParser(), function(req,res){
	MongoClient.connect("mongodb://localhost:27017/recipeDB",function(err,db){
		console.log("Checking cookies and trying to login....");		
		var collection = db.collection("users");
		collection.findOne({username: req.cookies.username}, function (err, user){
			if(err){
				console.log("Error " + err);
				db.close()			
			}				
			if(user && user.auth===req.cookies.token){
				console.log("auth = "+ user.auth);
				console.log("token = "+req.cookies.token);
				console.log(user);
				
				console.log("User authenticated.");
				currentUser = user.username;
				res.render('index',{user: {username:req.cookies.username, auth:user.auth}});		
			}else{
				console.log("No match....");
				res.render('index',{});
			}
		});
		console.log("Shouldnt reach here...");
	});
});

//send user login page
app.get('/login', function(req,res){
	res.render('login.pug');
});

app.use('/login', bodyParser.urlencoded({extended:false}));
app.use('/register', bodyParser.urlencoded({extended:false}));

//handle user registration
app.post('/register', function(req,res,next){
	MongoClient.connect("mongodb://localhost:27017/recipeDB",function(err,db){
		console.log("User accessed registration");	

		if(req.body.username==="" || req.body.password===""){
			console.log("Field is missing...");
			res.render('login.pug');
		}else{
			console.log("FOLLOWING USER IS BEING REGISTERED:");
			var token = hat();
			var collection = db.collection("users");
			//collection.deleteOne();
			collection.findOne({username: req.body.username}, function (err, user){
				if(err){
					console.log("Error " + err);
					db.close()			
				}				
				if(!user){
					console.log("No match");
					collection.insertOne({username: req.body.username, password: req.body.password, auth: token}, function(err, result){
						var cursor = collection.find();
						cursor.each(function(err,document){
							console.log(document);
							if(document == null) db.close();
						});	 
					});
				}else{
					console.log("Username is already registered");
				}
				res.render('login.pug');
			});		
		}	
	});
});

//handle user login
app.post('/login', function(req,res){
	MongoClient.connect("mongodb://localhost:27017/recipeDB",function(err,db){
		console.log("User accessed login");	

		if(req.body.username==="" || req.body.password===""){
			console.log("Field is missing...");
			res.render('login.pug');
		}else{
			console.log("FOLLOWING USER IS BEING LOGGED IN:");
			var token = hat();
			var collection = db.collection("users");
			//collection.deleteOne();
			collection.findOne({username: req.body.username}, function (err, user){
				if(err){
					console.log("Error " + err);
					db.close()			
				}				
				if(!user){
					console.log("Invalid login informaion (username)");
					res.render('login.pug');
				}else{
					if(req.body.password === user.password){
						var token = hat();
						user.auth = token; 
						console.log(user.auth);
						console.log("Username is already registered");
						collection.update({username: req.body.username}, {$set: {"auth": token}});
						res.cookie('token', user.auth, {path:'/', maxAge:600000});
						res.cookie('username', req.body.username.toLowerCase(), {path:'/', maxAge:600000});
						res.redirect('/');
					}else{
						console.log("Invalid login information (pwd)");
						res.render('login.pug');
					}
				}
			});		
		}	
	});	
});

//handle user logout
app.get("/logout",function(req,res){
	res.clearCookie('token',{path:'/'});
	res.clearCookie('username',{path:'/'});
	res.redirect('/');
});


//handling GET resquests for recipes
app.get("/recipes",function(req,res){
	MongoClient.connect("mongodb://localhost:27017/recipeDB",function(err,db){
		console.log("User accessed recipes");
		var recipeList=[];
		
		console.log(req.headers.cookie);
		var cookieData = req.headers.cookie;
		var start = cookieData.indexOf("username")+9;
		var finish = cookieData.length;
		var user  = cookieData.substring(start, finish);
		console.log("User = "+ user);
		
		if(err){
			console.log("Error connecting to mongodb via recipes");
			db.close();
		}else{
			console.log("Connected to mongodb via recipes");
			var collection = db.collection("recipes."+user).find();
			collection.each(function(err, document){
				if (document===null){
					res.send({names:recipeList});
					db.close();
				}else{
					recipeList.push(document.name);
					//recipeList.splice(0,1);
				}
			});
		}	
	});
});

//single route for handling requests to view any specific recipe
app.get("/recipe/:name",function(req,res){
	MongoClient.connect("mongodb://localhost:27017/recipeDB",function(err,db){
		
		console.log(req.headers.cookie);
		var cookieData = req.headers.cookie;
		var start = cookieData.indexOf("username")+9;
		var finish = cookieData.length;
		var user  = cookieData.substring(start, finish);
		console.log("User = "+ user);
		
		if(err){
			console.log("Error connecting to mongodb via specific recipe");
			db.close();
		}else{
			console.log("Connected to mongodb via specific recipe");
			//querying the database for any matching documents
			var collection = db.collection("recipes."+user).findOne({name:req.params.name},function(err,result){
				if (err){
					res.sendStatus(404);
				}else{
					res.send(result);
				}
			});
		}	
	});
});

//handling POST requests 
app.use('/recipe', bodyParser.urlencoded({extended:true}));
app.post('/recipe',function(req,res){
	
	console.log(req.headers.cookie);
	var cookieData = req.headers.cookie;
	var start = cookieData.indexOf("username")+9;
	var finish = cookieData.length;
	var user  = cookieData.substring(start, finish);
	console.log("User = "+ user);
	
	if(req.body.name===""){
		res.sendStatus(400);
	}
	else{
		MongoClient.connect("mongodb://localhost:27017/recipeDB",function(err,db){
			console.log(req.body);
			var collection = db.collection("recipes."+user);
			collection.update({name:req.body.name},req.body,{upsert:true}, function(err,result){
				console.log("Recipe is being submitted:");
				if (err){
					console.log("Error connecting to mongodb via POST recipe");
					res.sendStatus(500);
				}else{
					console.log("Connected to mongodb via POST recipe");
					res.sendStatus(200);			
				}
			});
		});
	}
});


//handle request for static files (style sheets and script files) 
app.use(express.static('./public')); 

app.listen(2406, function(){console.log("Server is working!");});

