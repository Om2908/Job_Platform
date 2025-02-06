const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  provider: { type: String, enum: ['local', 'google', 'linkedin'] },
  googleId: String,
  linkedinId: String,
  role: {
    type: String,
    enum: ["job_seeker", "employer", "admin"],
    required: true,
  },
  profile: {
    skills: [String],
    education: [String],
    experience: [String],
    certifications: [String],
    resume: { type: String }, 
  },
  savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  
  company: {
    name: { type: String },
    logo: { type: String }, 
    about: { type: String },
    industry: { type: String },
    employeeCount: { type: Number },
  },
  createdAt: { type: Date, default: Date.now },
  otp: { type: Number, default: null },
},{ timestamps: true });




userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next(); 
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("User", userSchema);
