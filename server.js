const express = require('express');
const path = require('path');
const crypto = require('bcrypt');
const bodyParser = require('body-parser')
//const session = require('client-sessions');
const port = 3001;
const pg = require('pg-promise')();

const cn = {
    host: process.env.ENDPNT,
    port: 5432,
    database: process.env.DB,
    user: process.env.USR,
    password: process.env.PW
};
console.log(cn);

const app = express();


app.use(express.static(path.join(__dirname, '../public')));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
app.use(bodyParser.urlencoded({extended: true}));


app.post('/createuser', (req, res) =>{
    const client = pg(cn);
    const email = req.body.email;
    const pw  = req.body.pw
    const name = req.body.person
    const address = req.body.address
    const salt = 10;
    //check if email already exists
    client.query('SELECT EXISTS(SELECT 1 FROM buildings WHERE email=$1)', [email,])
          .then((data) => {
            if(data[0].exists){
              res.send({result:'exists'})
            }
            else{
              crypto.hash(pw, salt, function(err, hash) {
                if(err){
                  console.log(err);
                  res.send({result:'error'});
                }
                console.log(email, name, address, hash)
                client.query('INSERT INTO buildings(email, name, address, pw) VALUES($1, $2, $3, $4)', [email,name, address, hash]);
                res.send({result:'created'});

          });
              }
          })
          //.finally(client.end);
});

app.post('/edituser', (req, res) =>{
    const client = pg(cn);
});

app.post('/auth', (req, res) =>{
    const client = pg(cn)
    const pw = req.body.pw;
    const email = req.body.email;
    const salt = 10;
    console.log(req.body)
    client.query("SELECT EXISTS(SELECT 1 FROM buildings WHERE email=$1)", [email,])
    .then((data) =>{
    if(data[0].exists){
    client.query("SELECT pw, address FROM buildings WHERE email=$1", [email,])
      .then((data) =>{
          crypto.compare(pw,data[0].pw, (err, auth) => {
            if(err){
              console.log(err);
            }
            if(auth){
              client.query("SELECT * FROM equipment WHERE building_address=$1", [data[0].address])
              .then((data) =>{
                console.log('success');
              res.send({address: data[0].building_address})})
              .catch((err) =>{
                console.log(err)
                console.log('nodata');
                res.send({nodata: true});
              })

            }
            else{
              console.log('fail')
              res.send({failure: true})
            }
          })


      })
      .catch((err) =>{
        console.log(err);{
        res.send({problem: "server"})
        }
      })
    }
    else{
      console.log('fail')
      res.send({failure: true})
    }
  })


});

app.get('/buildquery', (req, res) =>{
    const address = req.query.address;
    const client = pg(cn);
    console.log(address)
    client.query('SELECT * FROM equipment WHERE building_address = $1', [address,])
        .then((data) =>{
            res.end(JSON.stringify(data));
        })
        .catch((err) => {
            console.log('ERROR: ', err);
        })
        //.finally(client.end);
});

app.get('/equipquery', (req, res) => {
    const equip = req.query.equipment;
    const address = req.query.address;
    const start = req.query.begin || false;
    const end = req.query.end || false;
    const client = pg(cn);
    const table_name = equip + address;
    if(start && end){
         console.log('specified')
         client.query('SELECT * FROM $1:name WHERE "DateTimeStamp" > $2 and "DateTimeStamp" < $3', [table_name, start, end])
            .then((data) => {
                res.end( res.send(JSON.stringify(data)));
            })
            .catch((err) =>{
                console.log('ERROR:', err);
            })
            //.finally(client.end);
        }
    else{
      console.log('top 200')
        client.query('SELECT * FROM  $1:name ORDER by "DateTimeStamp" DESC LIMIT 200',[table_name,])
            .then((data) => {
                var data = data.reverse()
                res.end(res.send(JSON.stringify(data)));
            })
            .catch((err) =>{
                console.log('ERROR:', err);
            })
            //.finally(client.end);
    }



});

app.get('*', (req, res) => {
    console.log(__dirname)
    res.sendfile(path.join(__dirname, 'mbcx/public/index.html' ));


});

app.listen(port);
console.log("server started on port " + port);
