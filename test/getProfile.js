var expect = require('chai').expect;
var app = require('../app');
var request = require('supertest');
var server = request.agent('http://localhost:3001');

describe('Login', function(){
    it('login', loginUser());
    it('login check', function(done){
    server
        .get('/home')                       
        .end(function(err, res){
            if (err) return done(err);
            expect(res.statusCode).to.equal(200)
            //console.log(res.body);
            done()
        });
    });
    
    it('fake login check', function(done){
        server
            .post('/login')
            .send({ username: 'abcdrrrr', password: 'abcd' })
            .expect(302)
            .expect('Location', '/')
            .end(onResponse);

            function onResponse(err, res) {
            if (err) return done(err);
            return done();
            }
        });

    it('logout check', function(done){
        request(app)
            .get('/signout')                       
            .end(function(err, res){
                if (err) return done(err);
                //console.log(res);
                expect(res.statusCode).to.equal(302)
                expect(res.headers.location).to.equal('/')
                return done()
            });
    });
});


function loginUser() {
    return function(done) {
        server
            .post('/login')
            .send({ username: 'abcd', password: 'abcd' })
            .expect(302)
            .expect('Location', '/home')
            .end(onResponse);

        function onResponse(err, res) {
           if (err) return done(err);
           return done();
        }
    };
};


describe('Page checking', function(){
    it('check if page loading or not', function(done){
        request(app)
        .get('/signup')
        .expect(200,done)
    })

    it('home page checking without authentication', function(done){
        request(app)
        .get('/home')
        .expect(302,done)
    })

    it('home page checking with authentication', function(done){
        server
        .get('/home')
        .expect(200,done)
    })
})

describe('problem route testing', function(){
    it('check if page loading or not', function(done){
        request(app)
        .post('/problem')
        .send({ url: 'https://www.hackerearth.com/practice/algorithms/sorting/insertion-sort/practice-problems/algorithm/the-rise-of-the-weird-things-1/'})
        .expect(200)
        .end(function(err, res){
            //console.log(res)
            if (err) return done(err);
            //console.log(res.body);
            return done()
        });
    }).timeout(10000);
})

/*const userCredentials = {
    username: 'abcd', 
    password: 'abcd'
  }
  //now let's login the user before we run any tests
  var authenticatedUser = request.agent(app);
  before(function(done){
    authenticatedUser
      .post('/login')
      .send(userCredentials)
      .end(function(err, response){
        expect(response.statusCode).to.equal(200);
        expect('Location', '/home');
        done();
      });
  });

describe('Login Testing', () => {
  it('should redirect to dashboard on successful login', function(done) {
    chai.request('http://localhost:3000')
      .post('/login')
      .set('Token', 'text/plain')
      .set('content-type', 'application/x-www-form-urlencoded')
      .type('form')
      .send('grant_type=password')
      .send('username=abcd')
      .send('password=abcd')
      .end(function(err, res) {
        res.should.have.status(200);
        expect(res).to.redirectTo('http://localhost:3000/user/dashboard');
        done();
      });
  });
});*/