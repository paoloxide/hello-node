var request = require('supertest');

request = request('http://localhost:3000');
 
request.get('/').expect(200, function(err){
  console.log(err);
});