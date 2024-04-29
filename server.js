const express = require('express');
const mongoose = require("mongoose");
const crypto = require('crypto');
const bodyParser = require('body-parser');

//const Router = require("./routes")
const app = express();
const port = process.env.PORT || 3000;
let cors = require('cors')
app.use(cors())
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(express.static('public'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
// Import FontAwesome CSS
app.use('/css', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free/css'));
app.use('/webfonts', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free/webfonts'));



// Define the database URL to connect to.
const mongoDB = "mongodb://127.0.0.1:27017/foamcut_db";
// Database connection
mongoose.connect(mongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const conn = mongoose.connection;
let User = "";
conn.on('error', console.error.bind(console, 'MongoDB connection error:'));
conn.once('open', function() {
     // Defining User schema
     const userSchema = new mongoose.Schema({
          key_session_id: String, 
          key_babylon_data: String,
          key_contours_data: String,
          key_is_active: {
               type: Boolean,
               default: true
          },
          key_created_timestamp: {
               type: Date,
               default: Date.now
          },
          key_modified_timestamp: {
               type: Date,
               default: Date.now
           }
     });
     
     // Defining User model
     User = mongoose.model('users', userSchema);
     
     // Create collection of Model
     User.createCollection().then(function (collection) {
          console.log('Users Collection is created!');
     });

});

 // POST method route
app.post('/generateSession', (req, res) => {
     let secretKey = "iambabylon";
     let sessionID = crypto.createHash('sha256', secretKey).update(req.body.data).digest("hex");
     res.json({ "id": sessionID});
});

// POST method route
app.post('/saveSessionRecords', (req, res) => {
     let responseData = {};
     let errorFlag = "false";
     let statusCode = 200;
     User.countDocuments({ key_session_id: req.body.id}).then(function(count){
          if(count > 0){
               // Existing record
               User.find({ key_session_id: req.body.id}).then(function(records){
                    console.log("Records : ", records);
                    
                    //Update record
                    const userSessionData = {
                         key_babylon_data: req.body.babylon,
                         key_contours_data: req.body.contours
                    };
                    User.updateOne({ _id: records[0]._id }, userSessionData).then(function(response){
                         console.log('Record Updated - '+records[0]._id);
                         errorFlag = "updated";
                         statusCode = 200;

                    }).catch(function(err){
                         if (err){
                              console.log(err);
                         }
                    })

               }).catch(function(err){
                    if (err){
                         console.log(err);
                    }
               })
          } else{
               //New record
               const userSessionData = new User({
                    key_session_id: req.body.id,
                    key_babylon_data: req.body.babylon,
                    key_contours_data: req.body.contours
               });
               userSessionData.save().then(function (record) {
                    responseData = {
                         'id' : record[0].key_session_id,
                         'babylon' : record[0].key_babylon_data,
                         'contours' : record[0].key_contours_data
                    }
                    errorFlag = "insert";
                    statusCode = 200;
               }).catch(function (error) {
                    console.log(error);
               });
          }
     }).catch(function(err){
          if (err){
               console.log(err);
          }
     })
     res.json({ status: statusCode, data: responseData, error_message: errorFlag });
});

// POST method route
app.post('/loadSessionRecords', (req, res) => {
     let responseData = {};
     let errorFlag = "false";
     let statusCode = 200;
     User.countDocuments({ key_session_id: req.body.id}).then(function(count){
          if(count > 0){
               // Existing record
               User.find({ key_session_id: req.body.id}).then(function(records){
                    console.log("Found : ", records);
                    responseData = {
                         'id' : records[0].key_session_id,
                         'babylon' : records[0].key_babylon_data,
                         'contours' : records[0].key_contours_data
                    }
                    errorFlag = "fetch";
                    statusCode = 200;
                    res.json({ status: statusCode, data: responseData, error_message: errorFlag });
               }).catch(function(err){
                    if (err){
                         console.log(err);
                    }
               })
          } else{
               //No records found
               errorFlag = "invalid";
               statusCode = 200;
               res.json({ status: statusCode, data: responseData, error_message: errorFlag });
          }
     }).catch(function(err){
          if (err){
               console.log(err);
          }
     })
     
});

app.listen(port, () => {
     console.log(`Server is up on port ${port}`);
});