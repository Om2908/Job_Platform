const express = require('express');
const passport = require('passport');
const app=express();
app.use(express.json());
const router = express.Router();
const auth=require('../middleware/auth')
require('../confing/passport');

const {createUser,loginUser,updateUser,forgotPassword,resetPassword}=require('../controllers/auth')

router.get('/google',  passport.authenticate('google', {  scope: ['profile', 'email'],prompt: 'select_account'  }));

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureFlash: true
  }),
  (req, res) => {
    res.redirect('/'); 
  }
);

// LinkedIn 
router.get('/linkedin',passport.authenticate('linkedin', { state: true }));

router.get(
  '/linkedin/callback',
  passport.authenticate('linkedin', { 
    failureRedirect: '/login',
    failureFlash: true
  }),
  
  (req, res) => {
    res.redirect('/'); 
  }
);
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});


router.post('/register',createUser);
router.post('/login',loginUser);
router.post('/forgot-password',forgotPassword);
router.post('/reset-password',resetPassword);
router.put('/update',auth(['job_seeker', 'employer']),updateUser);

module.exports = router;

