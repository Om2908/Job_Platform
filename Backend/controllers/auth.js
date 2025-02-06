const express = require("express");
const app = express();
app.use(express.json());
const User = require("../models/User");
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');




const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


const createUser = async (req, res) => {
  try {
    const { name, email, password, role,company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newUser = new User({ name, email, password, role,company });
    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const loginUser= async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    user.otpExpires = Date.now() + 300000; 
    await user.save();

    
    await transporter.sendMail({
      to: email,
      subject: 'Your OTP for Login',
      text: `Your OTP is: ${otp}`,
    });
      console.log(otp);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};



const verifyOtp= async (req, res) => {
  const { email, otp } = req.body;
  try {
    
    const user = await User.findOne({ email });
    if (!user) 
    return res.status(404).json({ error: 'User not found' });
    
    if (user.otp !== parseInt(otp, 10)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    if (Date.now() > user.otpExpires) {
      return res.status(400).json({ error: 'OTP has expired' });
    }
    
    await user.save();
    
    
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};



const updateUser= async (req, res) => {
  const updates = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json({ message: 'Profile updated successfully!', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};



module.exports = { createUser,loginUser,verifyOtp,updateUser };
