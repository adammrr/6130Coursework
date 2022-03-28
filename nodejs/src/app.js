//Object data modelling library for mongo
const mongoose = require('mongoose');
var amqp = require('amqplib/callback_api');

//Express web service library
const express = require('express')

//used to parse the server response from json to object.
const bodyParser = require('body-parser');

//instance of express and port to use for inbound connections.
const app = express()
const port = 3000

//Get the OS and the OS Hostname
const os = require('os');
var thisHostName = os.hostname();

var nodeID = Math.floor(Math.random() * (100 - 1 + 1) + 1);
var currTime = new Date().getTime() / 1000;

var nodeDetails = {hostname: thisHostName, nodeID: nodeID, lastMessageTime: currTime};
var nodeDetailsList = [];
nodeDetailsList.push(nodeDetails); //push the current nodes details into the list

//connection string listing the mongo servers. This is an alternative to using a load balancer. THIS SHOULD BE DISCUSSED IN YOUR ASSIGNMENT.
const connectionString = 'mongodb://localmongo1:27017,localmongo2:27017,localmongo3:27017/notflixDB?replicaSet=rs0';

setInterval(function () {

  amqp.connect('amqp://test:test@6130coursework_haproxy_1', function (error0, connection) {

    //if connection failed throw error
    if (error0) {
      throw error0;
    }

    //create a channel if connected and send hello world to the logs Q
    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = 'alive_message';
      currTime = new Date().getTime() / 1000;
      var msg = `{"hostname": "${thisHostName}", "nodeID": "${nodeID}"}`

      var jsonMsg = JSON.stringify(JSON.parse(msg));
      channel.assertExchange(exchange, 'fanout', {
        durable: false
      });

      channel.publish(exchange, '', Buffer.from(jsonMsg));

      console.log(" [%s] Sent %s", thisHostName, msg);
    });


    //in 1/2 a second force close the connection
    setTimeout(function () {
      connection.close();
    }, 500);
  });


}, 3000);

amqp.connect('amqp://test:test@6130coursework_haproxy_1', function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var exchange = 'alive_message';

    channel.assertExchange(exchange, 'fanout', {
      durable: false
    });

    channel.assertQueue('', {
      exclusive: true
    }, function (error2, q) {
      if (error2) {
        throw error2;
      }
      console.log(" [*] Waiting for messages ggin %s. To exit press CTRL+C", q.queue);
      channel.bindQueue(q.queue, exchange, '');

      channel.consume(q.queue, function (msg) {
        if (msg.content) {
          var incomingMessage = JSON.parse(msg.content.toString());
          console.log(" [%s] Received %s", thisHostName, incomingMessage);
          currTime = new Date().getTime() / 1000;
          nodeDetailsList.some(details => details.hostname === incomingMessage.hostname) ? (nodeDetailsList.find(e => e.hostname === incomingMessage.hostname)).lastMessageTime = currTime : nodeDetailsList.push(incomingMessage);

        }
      }, {
        noAck: true
      });
    });
  });
});

//tell express to use the body parser. Note - This function was built into express but then moved to a seperate package.
app.use(bodyParser.json());

//connect to the cluster
mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Schema = mongoose.Schema;

var interactionSchema = new Schema({
  _id: Number,
  accountID: Number,
  userName: String,
  titleID: Number,
  userAction: String,
  dateTime: Date,
  poi: String,
  toi: String
});

var interactionModel = mongoose.model('Interactions', interactionSchema, 'interactions');



app.get('/', (req, res) => {
  interactionModel.find({}, 'accountID userName titleID userAction dateTime poi toi', (err, stock) => {
    if (err) return handleError(err);
    res.send(JSON.stringify(stock))
  })
})

app.post('/', (req, res) => {
  var interaction_instance = new interactionModel(req.body);
  interaction_instance.save(function (err) {
    if (err) res.send('Error');
    res.send(JSON.stringify(req.body))
  });
})

app.put('/', (req, res) => {
  res.send('Got a PUT request at /')
})

app.delete('/', (req, res) => {
  res.send('Got a DELETE request at /')
})

//bind the express web service to the port specified
app.listen(port, () => {
  console.log(`Express Application listening at port ` + port)
})

