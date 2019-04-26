var express = require('express');
const rp = require('request-promise');
const $ = require('cheerio');
const axios = require('axios');
//var questionsSchema = require('../models/questions');
var mongooseQuestions = require('mongoose');
var question;
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://root:root@cluster0-4zdqp.mongodb.net/QuestionsDB?retryWrites=true";
var judge0StatusMap = new Map();
initializeStatuses(judge0StatusMap);

function initializeStatuses(statusMap){
	statusMap.set(4,{"description":"Wrong Answer"});
	statusMap.set(5,{"description":"Time Limit Exceeded"});
	statusMap.set(6,{"description":"Compilation Error"});
	statusMap.set(7,{"description":"Runtime Error (SIGSEGV)"});
	statusMap.set(8,{"description":"Runtime Error (SIGXFSZ)"});
	statusMap.set(9,{"description":"Runtime Error (SIGFPE)"});
	statusMap.set(10,{"description":"Runtime Error (SIGABRT)"});
	statusMap.set(11,{"description":"Runtime Error (NZEC)"});
	statusMap.set(12,{"description":"Runtime Error (Other)"});
	statusMap.set(13,{"description":"Internal Error"});
}
/*const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect(err => {
	question = client.db("test").collection("devices");
  	// perform actions on the collection object
  	client.close();
});*/

//mongooseQuestions.connect('mongodb://localhost/questions',{useNewUrlParser: true});
/*mongooseQuestions.connect('mongodb+srv://root:root@cluster0-4zdqp.mongodb.net/QuestionsDB?retryWrites=true',{useNewUrlParser: true},function(err){
	if(!err){
		console.log("no error!")
	}
});
var Schema = mongooseQuestions.Schema;
question = mongooseQuestions.model('questions', new Schema(
	{
		url : String,
		finalTestCase: String,
		finalSolution : String
	},{ collection : 'question' })
);*/ 
/*question.find(function (err,  docs) {
	if (err) return console.error(err);
	console.log(docs);
  })*/
//question = mongooseQuestions.model('question', new mongooseQuestions.Schema(,{ collection : 'questions' }));
//question = mongooseQuestions.model('questions');
/*question.find(function (err, questiongot) {
	if (err) console.log(err);
	console.log('---Second');
	console.log(questiongot);
});*/
var router = express.Router();
var onlineUser= new Map();
var usersInMatch = new Map();
var sockets = new Map();
var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();  
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport, io, logger){

	/* GET login page. */
	router.get('/', function(req, res) {
    	// Display the Login page with any flash message, if any
		res.render('index', { message: req.flash('message') });
		//logger.info('whichpage=root');
		console.log('whichpage=root');
		/*
		logger.info({myjson:{
			level: 'debug',
			message: 'some random message two!'
		}});*/
	});

	/* Handle Login POST */
	router.post('/login', passport.authenticate('login', {
		successRedirect: '/home',
		failureRedirect: '/',
		failureFlash : true  
	}));

	/* GET Registration Page */
	router.get('/signup', function(req, res){
		console.log('whichpage=signup');
		res.render('register',{message: req.flash('message')});
	});

	/* Handle Registration POST */	
	router.post('/signup', passport.authenticate('signup', {
		
		successRedirect: '/home',
		failureRedirect: '/signup',
		failureFlash : true  
	}));

	/* GET Home Page */
	router.get('/home', isAuthenticated, function(req, res){
		//logger.info('whichpage=home');
		console.log('whichpage=home');
		res.render('home', { user: req.user });
	});

	/* Handle Logout */
	router.get('/signout', function(req, res) {
		console.log('whichpage=signout');
		req.logout();
		res.redirect('/');
	});

	/* Handle Registration POST */	
	router.post('/connectToUser', (req, res)=>{
		console.log('Inside connectToUser '+req.body);
		var challengerName = req.body.name;
		var challenger = req.body.challengerSocketID;
		var opponent = req.body.opponentSocketID;
		if(usersInMatch.has(opponent)){
	
		}else{
			usersInMatch.set(opponent, {challengerSocketID:challenger,
										opponentSocketID:opponent});

			usersInMatch.set(challenger, {challengerSocketID:opponent,
											opponentSocketID:challenger});							
		}
		io.to(opponent).emit('challengeReceived',{name:challengerName})
	});

	router.post('/problem',(req,res)=>{
		console.log('whichpage=problem');
		let url = req.body.url;
		//console.log('url is'+url);
		rp(url)
		.then(function (html) {
			 var statement = $('.problem-description', html).html();
			 var sampleInput = $('.input-output-container .input-output .dark', html).eq(0).text();
			 var sampleOutput = $('.input-output-container .input-output .dark', html).eq(1).text();
			console.log(sampleInput);
			console.log(sampleOutput);
			problemData = {statement: statement,
										 sampleInput: sampleInput,
										 sampleOutput: sampleOutput
										}
			res.json(problemData);
		})
		.catch(function (err) {
			// Crawling failed or Cheerio choked...
		});
	  //app.use
	  })
	  
	  router.post('/', function(req, res) {
		console.log(req.body);
		var source = req.body.code;
		var type = req.body.type;
		var testCase;
		var testCaseResult;
    var mySocketID = req.body.socketid;
    var langid= req.body.langid;
		if(type == 'compile'){
            console.log('inside Compile');
			testCase = req.body.sampleInput;
			testCaseResult = req.body.sampleOutput.trim();
			makeRequest(res, source, testCase, testCaseResult, mySocketID, langid)
		}else if(type == 'submit'){
			let url = req.body.url;
			console.log(url);
			MongoClient.connect(uri, function(err, db) {
				if (err) throw err;
				var dbo = db.db("QuestionsDB");
				dbo.collection("question").findOne({ 'url': url }, function(err, questiongot) {
					if (err) console.log(err);
					//console.log(questiongot);
					testCase = questiongot.finalTestCase.replace('\\n','\n');;
					//testCase = '10\n570 751 980 995 529 940 212 848 718 515'
					testCaseResult = questiongot.finalSolution.trim();
					//console.log(testCase);
					makeRequest(res, source, testCase, testCaseResult, mySocketID,langid);
				  db.close();
				});
			  });
			/*question.find(function (err,  docs) {
				if (err) return console.error(err);
				console.log(docs);
			  })*/
			  /*question.findOne({ 'url': url }, 'finalTestCase finalSolution', function (err, questiongot) {
				if (err) console.log(err);
				console.log(questiongot);
				testCase = questiongot.finalTestCase;
				//testCase = '10\n570 751 980 995 529 940 212 848 718 515'
				testCaseResult = questiongot.finalSolution.trim();
				//makeRequest(res, source, testCase, testCaseResult, mySocketID);
			  });*/
			//testCase = req.body.sampleInput;
			//testCaseResult = req.body.sampleOutput.trim();
		}else if(type=='customCompile'){
			console.log('inside customCompile');
			testCase = req.body.sampleInput;
			testCaseResult = req.body.sampleOutput.trim();
			console.log(testCase);
			console.log(testCaseResult);
			makeRequest(res, source, testCase, testCaseResult, mySocketID, langid)
		}

		//testCase = '10\n570 751 980 995 529 940 212 848 718 515';
		//console.log('testcase is'+ testCase);
		
	  })
	  
	  router.get('*', function(req, res){
		res.send('what???', 404);
	  });
	
	io.on('connection', function(socket){
		if(sockets.has(socket.id)){
	
		}else{
			sockets.set(socket.id, socket);
		}
		response={}
		console.log('socket id is '+socket.id);
		socket.on('codeInEditor', function(msg){
		  //console.log(msg);
		  response.text = msg.text;
		  response.name = msg.name;
			//io.sockets.emit('codeInOpponentsEditor', response);
			socket.to(msg.socketid).emit('codeInOpponentsEditor', response);
		});
	
		socket.on('userConnected', function(msg){
			if(onlineUser.has(msg.userName)){
	
			}else{
				msg.status = 'Online';
				onlineUser.set(msg.socketid, msg);
			}
			if(onlineUser.size != 0){
				let userArray = []
				onlineUser.forEach( user=>{userArray.push(user)});
				//io.sockets.emit('newUserConnected', {userArray});
				io.sockets.emit('refreshUsersView', {userArray});
			}

			//logger.info('OnlineUsers='+ onlineUser.size);
			console.log('OnlineUsers='+ onlineUser.size);
		});
		socket.on('disconnect', function(){
			console.log('socket disconnected'+socket.id);
			onlineUser.delete(socket.id);
			sockets.delete(socket.id);
			let userArray = []
			onlineUser.forEach( user=>{userArray.push(user)});
			//io.sockets.emit('newUserConnected', {userArray});
			io.sockets.emit('refreshUsersView', {userArray});
		});
	
		socket.on('challengeAccepted', function(msg){
			var opponentSocketID = msg.opponentSocketID;
			if(usersInMatch.has(opponentSocketID)){
				challengerSocketID = usersInMatch.get(opponentSocketID).challengerSocketID;
				//io.to(challengerSocketID).emit('joinroom',{roomId:opponent})
				//console.log(sockets[challengerSocketID]);
				sockets.get(challengerSocketID).join(opponentSocketID);// Join Friends Room
				sockets.get(opponentSocketID).join(challengerSocketID);// Friend Joins my Room
				
				challengerRecord = onlineUser.get(challengerSocketID)
				challengerRecord.status = 'InaMatch';
				onlineUser.set(challengerSocketID, challengerRecord)

				opponentRecord = onlineUser.get(opponentSocketID)
				opponentRecord.status = 'InaMatch';
				onlineUser.set(opponentSocketID, opponentRecord)

				io.in(opponentSocketID).emit('challengeAccepted', 'set data-inMatch Atrribute');// Sending to all people in room including sender
				//io.in(challengerSocketID).emit('challengeAccepted', 'set data-inMatch Atrribute');
				

				if(onlineUser.size != 0){
					let userArray = []
					onlineUser.forEach( user=>{userArray.push(user)});
					io.sockets.emit('refreshUsersView',{userArray});
				}

				MongoClient.connect(uri, function(err, db) {
					if (err) throw err;
						var dbo = db.db("QuestionsDB");
					 var urlarray = dbo.collection("question").find({},{url:1}).toArray()
					 console.log(urlarray.length);
					 console.log(urlarray[0])
					 //.forEach(function( url){
					//		console.log('--------------------------------')
					//		console.log(url);
					//	}
					//)
					db.close();
				});
				io.in(opponentSocketID).emit('loadChallenge', {questionUrl:"https://www.hackerearth.com/practice/algorithms/sorting/insertion-sort/practice-problems/algorithm/the-rise-of-the-weird-things-1/"});
				var starttime = new Date();
				endtime = addMinutes(starttime, 10); // set to 1 minute
				
				var timeinterval = setInterval(function(){
					var time = getTimeRemaining(endtime);
					io.in(opponentSocketID).emit('timer',{time:time});
					if(time.total<=0){
						io.in(opponentSocketID).emit('timesUp','timer has expired');
						clearInterval(timeinterval);
					}
				},1000);
				/*const timeoutObj = setTimeout(() => {
					io.in(opponentSocketID).emit('timesUp','timer has expired');
				}, 1500);*/
				
			}
		});

		socket.on('challengeRejected', function(msg){
			var opponent = msg.opponentSocketID;
			if(usersInMatch.has(opponent)){
				challengerSocketID = usersInMatch.get(opponent).challengerSocketID;
				io.to(challengerSocketID).emit('hideSpinner',{message:"Invitation Declined"});
				usersInMatch.delete(opponent);
				usersInMatch.delete(challengerSocketID);
			}
			console.log(msg);
		});

		socket.on('cancelChallenge', function(msg){
			console.log('cancelChallege');
			console.log(usersInMatch.get(msg.mySocketID));
			mySocketID = msg.mySocketID;
			challengerSocketID  = usersInMatch.get(mySocketID).challengerSocketID;
			usersInMatch.delete(mySocketID);
			usersInMatch.delete(challengerSocketID);

			sockets.get(mySocketID).leave(challengerSocketID);
			sockets.get(challengerSocketID).leave(mySocketID);

			challengerRecord = onlineUser.get(mySocketID)
			challengerRecord.status = 'Online';
			onlineUser.set(mySocketID, challengerRecord)

			opponentRecord = onlineUser.get(challengerSocketID)
			opponentRecord.status = 'Online';
			onlineUser.set(challengerSocketID, opponentRecord)
			io.to(challengerSocketID).emit('challengeCancelled',{message:"Challenge Canceled"});
			if(onlineUser.size != 0){
				let userArray = []
				onlineUser.forEach( user=>{userArray.push(user)});
				io.sockets.emit('refreshUsersView',{userArray});
			}
		});
	});
		
		function addMinutes(date, minutes) {
			return new Date(date.getTime() + minutes*60000);
		}

		function getTimeRemaining(endtime){
			var t = Date.parse(endtime) - Date.parse(new Date());
			var seconds = Math.floor( (t/1000) % 60 );
			var minutes = Math.floor( (t/1000/60) % 60 );
			var hours = Math.floor( (t/(1000*60*60)) % 24 );
			var days = Math.floor( t/(1000*60*60*24) );
			return {
				'total': t,
				'days': days,
				'hours': hours,
				'minutes': minutes,
				'seconds': seconds
			};
		}

		function makeRequest(res, source, testCase, testCaseResult, mySocketID, langid){
			if(source.length <= 10){
				compileData = {}
				compileData.status = "Compilation failed";
				compileData.statusid = '11';
				compileData.stderr = "Empty source code"
				compileData.errDescription ="Empty Submission not allowed";
				res.json({
					compileData: compileData
				});
			}
			axios.post('https://api.judge0.com/submissions/', {
			source_code: source,
			language_id: langid,
			stdin: testCase
			})
			.then(function (response) {
				let token = response.data.token;
				axios.get('https://api.judge0.com/submissions/'+token)
				.then(function(response){
					//console.log(response);
					console.log('First submisson'+response.data);
					if(response.data.status.id == 1 || response.data.status.id == 2){
						setTimeout(function() {
							axios.get('https://api.judge0.com/submissions/'+token)
							.then(function(response){
								console.log("Response from judnge 0"+response.data.status.id);
								console.log('Second submisson'+response.data)
								compileData = {}
								if(response.data.status.id == 3){
									if(response.data.stdout != null){
										compileData.result = response.data.stdout.trim();
									}
									//console.log('Result =='+compileData.result.localeCompare(testCaseResult));
									console.log(compileData.result);
									console.log(testCaseResult);
									console.log(compileData.result === testCaseResult);
									if(testCaseResult != 10){
										if(compileData.result === testCaseResult){
											compileData.status = "Accepted"
											io.in(mySocketID).emit('opponentsResult', 'Accepted');
				
										}else{
											compileData.status = "Failed"
											io.in(mySocketID).emit('opponentsResult', 'Failed');
				
										}
										compileData.statusid = '1'; // For compile/submit button output
									}else{
										compileData.statusid = '2'; // For custom compile output
									}	
								}else {
									compileData.status = "Compilation failed";
									compileData.statusid = '11';
									compileData.stderr = response.data.stderr;
									if(judge0StatusMap.has(response.data.status.id))
										compileData.errDescription =judge0StatusMap.get(response.data.status.id).description;
									else
									compileData.errDescription = "Some error occured";
								}
								res.json({
								compileData: compileData
								});
							})
						}, 5000);
					}
				})
			})
			.catch(function (error) {
				compileData = {}
				compileData.status = "Compilation failed";
				compileData.statusid = '11';
				compileData.stderr = error
				compileData.errDescription =error;
				res.json({
					compileData: compileData
				});	
			console.log('*****************OUTERLEVEL*******************'+error);
			});
		}
	return router;
}

