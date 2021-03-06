const expect = require('expect');
const request = require('supertest');

const {app} = require('./../server');
const {Todo} = require('./../models/todo');
const {User} = require('./../models/user');

const {ObjectID} = require('mongodb');
const {todos, populateTodos, users, populateUsers} = require('./seed/seed');

beforeEach(populateUsers);
// runs some test code before every single test case
beforeEach(populateTodos);

// Using Describe to group routes

describe('POST /todos', () => {
  // we have done flag because this is an ASYNC call
  it('should create a new todo', (done) => {
    var text = 'Test1';
  
    request(app)
    .post('/todos')
    .set('x-auth', users[0].tokens[0].token)
    .send({text: text})
    .expect(200) // expecting a HTTP 200 response
    .expect((res) => {
      /*
        We expect the response body being sent to be equal
        to text
      */
      expect(res.body.text).toBe(text);
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      // fetch all documents from Todo collection
      Todo.find({text}).then((todos) => {
        expect(todos.length).toBe(1);
        expect(todos[0].text).toBe(text);
        done();
      }).catch((e) => {
        done(e);
      });
    })
  });

  it('should not create todo with invalid body data', (done) => {

    request(app)
    .post('/todos')
    .set('x-auth', users[0].tokens[0].token)
    .send({})
    .expect(400)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      Todo.find().then((todos) => {
        expect(todos.length).toBe(2);
        //expect(todos[0].text).toBe(2);
        done();
      }).catch((e) => {
        done(e);
      })
    })
  });
});

describe('GET /todos', () => {
  it('should get all todos', (done) => {
    request(app)
    .get('/todos')
    .set('x-auth', users[0].tokens[0].token)
    .expect(200)
    .expect((res) => {
      console.log("body.todos", res.body.todos)
      expect(res.body.todos.length).toBe(1);
    })
    .end(done);
  });
});

describe('GET /todos/:id', () => {
  it('should return todo doc', (done) => {
    request(app)
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(todos[0].text)        
      })
      .end(done);
  });

  // Ensure if you are logged as User1, you cannot fetch a TODO
  // from another user like User2
  it('should NOT return todo doc created by other user', (done) => {
    request(app)
      .get(`/todos/${todos[1]._id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 if todo not found', (done) => {
    request(app)
      .get(`/todos/${new ObjectID().toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 for non-object ids', (done) => {
    // /todos/123

    request(app)
      .get('/todos/123')
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });
});

describe('DELETE /todos/:id', () => {
  it('should remove a todo', (done) => {
    var hexId = todos[1]._id.toHexString();

    request(app)
      .delete(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(200) // this ID exists in DB, so we should get 200
      .expect((res) => {
        expect(res.body.todo._id).toBe(hexId);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        // query DB using findById and toNotExist assertion
        Todo.findById(hexId).then((todo) => {
          console.log('todo value = ', todo)
          expect(todo).toBeFalsy();
          done();
        }).catch((e) => {
          done(e);
        });
      });
  });

  // Try to delete todo by firstuser logged in as second
  it('should NOT remove a todo created by another user', (done) => {
    var hexId = todos[0]._id.toHexString();

    request(app)
      .delete(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(404) 
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        // query DB using findById and toNotExist assertion
        Todo.findById(hexId).then((todo) => {
          console.log('todo value = ', todo)
          expect(todo).toExist();
          done();
        }).catch((e) => {
          done(e);
        });
      });
  });

  it('should return 404 if todo not found', (done) => {
    request(app)
      .delete(`/todos/${new ObjectID().toHexString()}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 if object id is invalid', (done) => {
    // /todos/123

    request(app)
      .delete('/todos/123')
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });
});

describe('PATCH /todos/:id', ()=> {
  it('should update the todo', (done) => {
    // grab id of first item
    // update the text, set completed to true
    // assert 200
    // custom assertion: res has text prop and it changed, compelted it true, and completedAt is a number
    var hexId = todos[0]._id.toHexString();
    var text = "POOP CITY";

    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[0].tokens[0].token)
      .send({
        text: text,
        completed: true
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(true);
        //expect(res.body.todo.completedAt).toBe('number');
      })
      .end(done);
  });

  it('should NOT update the todo created by other user', (done) => {
    // grab id of first item
    // update the text, set completed to true
    // assert 200
    // custom assertion: res has text prop and it changed, compelted it true, and completedAt is a number
    var hexId = todos[0]._id.toHexString();
    var text = "POOP CITY";

    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .send({
        text: text,
        completed: true
      })
      .expect(404)
      .end(done);
  });

  it('should clear completedAt when todo is not completed', (done)=>{
    // grab id of second todo item
    // update text, set completed to false
    // 200
    // text is changed, compelted false, completed at is null

    var hexId = todos[1]._id.toHexString();
    var text = "POOP CITY";

    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .send({
        text: text,
        completed: false      
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(false);
        expect(res.body.todo.completedAt).toBeFalsy();
      })
      .end(done);
  });
})

// test case with valid auth token
// test case without valid auth token
describe('GET /users/me', () => {
  it('should return user if authenticated', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        // the id that comes back in the body, should equal the id we supplied
        expect(res.body._id).toBe(users[0]._id.toHexString());
        expect(res.body.email).toBe(users[0].email);
      })
      .end(done);
  });

  it('should return 401 if not authenticated', (done) => {
    request(app)
      .get('/users/me')
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({})
      })
      .end(done);
  });
});

describe('POST /users', () => {
  it('should create a user', (done) => {
    var email = 'email@example.com';
    var password = '123password';

    request(app)
      .post('/users')
      .send({email, password})
      .expect(200)
      .expect((res) => {
        expect(res.headers["x-auth"]).toExist();
        expect(res.body._id).toExist();
        expect(res.body.email).toBe(email);
      })
      .end((err) => {
        if (err) {
          return done(err);
        }

        User.findOne({email}).then((user) => {
          expect(user).toExist();
          expect(user.password).toNotBe(password);
          done();
        }).catch((e) => done(e));
      })
  });

  it('should return validation errors if request invalid', (done) => {
    // send invalid email and password
    request(app)
      .post('/users')
      .send({email: 'poo', password: '123'})
      .expect(400)
      .end(done);
  });

  it('should not create user if email in use', (done) => {
    request(app)
      .post('/users')
      .send({
        email: users[0].email,
        password: 'yomama!1'
      })
      .expect(400)
      .end(done);
  });
});

describe('POST /users/login', () => {
  it('should login user and return auth token', (done) => {
    request(app)
      .post('/users/login')
      .send({
        email: users[1].email,
        password: users[1].password
      })
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        User.findById(users[1]._id).then((user) => {
          expect(user.tokens[1]).toInclude({
            access: 'auth',
            token: res.headers['x-auth']
          });
          done();
        }).catch((e) => done(e));
      });
  });

  it('should reject invalid login', (done) => {
    request(app)
      .post('/users/login')
      .send({
        email: users[1].email,
        password: users[1].password + '1'
      })
      .expect(400)
      .expect((res) => {
        expect(res.headers['x-auth']).toNotExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        User.findById(users[1]._id).then((user) => {
          expect(user.tokens.length).toBe(1);
          done();
        }).catch((e) => done(e));
      });
  });
});

describe('DELETE /users/me/token', () => {
  it('should remove auth token on logout', (done) => {
    console.log("DELETE user token value ", users[0].tokens[0].token)
    request(app)
      .delete('/users/me/token')
      .set("x-auth", users[0].tokens[0].token)
      .expect(200)
      .end((err, res) => {

        if (err) {
          return done(err);
        }

        User.findById(users[0]._id).then((user) => {
          expect(user.tokens.length).toBe(0);
          done();
        }).catch((e) => done(e));
      });
  });
});