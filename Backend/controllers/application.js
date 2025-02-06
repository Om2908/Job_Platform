const Application = require('../models/application');
const Job = require('../models/Job');
const User = require('../models/User');
const NotificationService = require('../controllers/notification');
const { app } = require('firebase-admin');
const { uploadToS3 } = require('../utils/s3Upload');
const path = require('path');


const applyForJob = async (req, res) => {
   
   try {
    const { jobId } = req.params;
    const {  coverLetter } = req.body;

    console.log(req.files)
     // Check if file is uploaded
     if (!req.files || !req.files.resume) {
      return res.status(400).json({ error: 'Resume file is required' });
    }

    const resumeFile = req.files.resume;

    // Validate file type (Only PDF allowed)
    if (resumeFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF resumes are allowed' });
    }

    // Upload file to AWS S3
    const resumeUrl = await uploadToS3(resumeFile);


    const job = await Job.findById(jobId).populate('postedBy', 'email name');
    const employer = await User.findById(job.postedBy) ;
   
    if (!job) { return res.status(404).json({ error: 'Job not found' }); }
    if (!employer) { return res.status(404).json({ error: 'Employer not found' });}

    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'job_seeker') {
      return res.status(403).json({ error: 'Only job seekers can apply for jobs' });
    }
    
    const existingApplication = await Application.findOne({ jobId, seekerId: req.user.id });
    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const application = new Application({
      jobId,
      seekerId: req.user.id,
      resume:resumeUrl,
      coverLetter,
    });
   
    await application.save();
   

    // Real-time notification to employer
    req.io.to(job.postedBy._id.toString()).emit('newApplication', {
      type: 'application',
      jobTitle: job.title,
      applicantName: user.name,
      timestamp: new Date(),
    });

    // Create notification for employer
    await NotificationService.createNotification({
      recipient: employer._id,
      type: 'APPLICATION_RECEIVED',
      title: 'New Application Received',
      message: `${user.name} has applied for ${job.title}`,
      relatedId: application._id,
      onModel: 'Application'
    });

    // Send email notification to employer
    await NotificationService.sendEmail(
      job.postedBy.email,
      'New Job Application Received',
      `
        <h1>New Application Received</h1>
        <p>You have received a new application for ${job.title}</p>
        <p><strong>Applicant:</strong> ${user.name}</p>
        <p><strong>Position:</strong> ${job.title}</p>
      `
    );

    res.status(201).json({
      message: 'Job application submitted successfully',
      application,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};


const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, interviewDate } = req.body;

    const application = await Application.findById(applicationId)
      .populate('jobId', 'title companyName location')
      .populate('seekerId', 'email name');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const job = await Job.findById(application.jobId);
    if (!job || job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
  

    application.status = status;
    if (interviewDate) {
      application.interviewDate = interviewDate;
      
      // Real-time notification for interview
      req.io.to(application.seekerId._id.toString()).emit('interviewScheduled', {
        type: 'interview',
        jobTitle: job.title,
        interviewDate,
        timestamp: new Date(),
      });

      // Create notification for interview
      await NotificationService.createNotification({
        recipient: application.seekerId._id,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview Scheduled',
        message: `Your interview for ${job.title} has been scheduled`,
        relatedId: application._id,
        onModel: 'Application'
      });

      // Send interview email with calendar invite
      await NotificationService.notifyInterviewScheduled(
        application,
        job,
        application.seekerId,
        interviewDate
      );
    }

    // Status update notification
    await NotificationService.createNotification({
      recipient: application.seekerId._id,
      type: 'APPLICATION_STATUS',
      title: 'Application Status Updated',
      message: `Your application for ${job.title} has been ${status}`,
      relatedId: application._id,
      onModel: 'Application'
    });

    // Real-time status update
    req.io.to(application.seekerId._id.toString()).emit('applicationStatusUpdate', {
      type: 'status',
      jobTitle: job.title,
      status,
      timestamp: new Date(),
    });

    // Send status update email
    await NotificationService.sendEmail(
      application.seekerId.email,
      'Application Status Update',
      `
        <h1>Application Status Update</h1>
        <p>Your application for ${job.title} at ${job.companyName} has been ${status}.</p>
        ${status === 'rejected' ? `
          <p>Don't be discouraged! Keep applying to other opportunities.</p>
          <a href="${process.env.FRONTEND_URL}/jobs" style="padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Browse More Jobs</a>
        ` : ''}
      `
    );

    await application.save();
   
    res.json({
      message: 'Application status updated successfully',
      application,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};







const getApplicationsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job || job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const applications = await Application.find({ jobId })
      .populate('seekerId', 'name email profile')
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ seekerId: req.user.id })
      .populate('jobId', 'title location companyName')
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};



module.exports = {
  applyForJob,
  getApplicationsForJob,
  updateApplicationStatus,
  getMyApplications,
};