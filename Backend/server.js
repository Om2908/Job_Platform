const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./confing/db');
const session=require('express-session');
const passport = require('passport');
require('./confing/passport')
const fileUpload = require('express-fileupload');
const path = require('path');

const http = require('http');
const socketIO = require('socket.io');



dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload({ createParentPath:true, 
  limits:
  {fileSize:8*1024*1024
   }
}));


const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
    console.log('Client connected');
  
    socket.on('authenticate', async (userId) => {
      socket.join(userId);
    });
  
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  app.use((req, res, next) => {
    req.io = io;
    next();
  });
  
 
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/job');
const applicationRoutes = require('./routes/application');


app.use(session({secret:`omitaliya`,resave:false,saveUninitialized:true,cookie:{secure:false,maxAge:24*60*60*1000}}));
app.use(passport.initialize());
app.use(passport.session());




app.use('/auth', authRoutes); 
app.use('/job', jobRoutes); 
app.use('/application',applicationRoutes)

app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) =>{
    res.send(`API is running...${req.user.name}`)
});


connectDB();
   

const PORT =3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
