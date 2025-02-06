const Job = require('../models/Job'); 
const User = require('../models/User'); 
const NotificationService=require('../controllers/notification');

const postJob = async (req, res) => {
  try {
    const { title, description, location, salary, companyName, requirements, jobType } = req.body;

    const employer = await User.findById(req.user.id); 
    if (!employer || employer.role !== 'employer') {
      return res.status(403).json({ error: 'Access denied. Only employers can post jobs.' });
    }

    const newJob = new Job({
      title,
      description,
      location,
      salary,
      companyName,
      requirements,
      jobType,
      postedBy: employer._id,
      status: 'pending'
      
    });

      
    await newJob.save();

    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await NotificationService.createNotification({
        recipient: admin._id,
        type: 'NEW_JOB_PENDING',
        title: 'New Job Pending Approval',
        message: `${employer.company.name} has posted a new job: ${title}`,
        relatedId: newJob._id,
        onModel: 'Job'
      });
    }
    

    res.status(201).json({
      message: 'Job posted successfully and and pending admin approval',
      job: newJob,
    });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};



const getallJOb = async (req, res) => {
  try {
    const { location, jobType, minSalary, maxSalary, page = 1, limit = 10 } = req.query;


    const query = {};
    if (location) query.location = new RegExp(location, 'i'); 
    if (jobType) query.jobType = jobType;
    if (minSalary) query.salary = { $gte: Number(minSalary) };
    if (maxSalary) query.salary = { ...query.salary, $lte: Number(maxSalary) };

    
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const totalJobs = await Job.countDocuments(query);

    res.json({
      jobs,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalJobs / pageSize),
        totalJobs,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
    
  }
};



const saveJob = async (req, res) => {
  const { jobId } = req.params;

  try {
    const user = await User.findById(req.user.id);

    if (!user.savedJobs.includes(jobId)) {
      user.savedJobs.push(jobId);
      await user.save();
    }

    res.json({ message: 'Job saved successfully', savedJobs: user.savedJobs });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};


const getSavedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedJobs');

    res.json({ savedJobs: user.savedJobs });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const approveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { remarks } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.status = 'approved';
    job.adminRemarks = remarks;
    await job.save();

   
    await NotificationService.createNotification({
      recipient: job.postedBy,
      type: 'JOB_APPROVED',
      title: 'Job Posting Approved',
      message: `Your job posting "${job.title}" has been approved`,
      relatedId: job._id,
      onModel: 'Job'
    });

    res.json({ message: 'Job approved successfully', job });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const rejectJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { remarks } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.status = 'rejected';
    job.adminRemarks = remarks;
    await job.save();

    await NotificationService.createNotification({
      recipient: job.postedBy,
      type: 'JOB_REJECTED',
      title: 'Job Posting Rejected',
      message: `Your job posting "${job.title}" has been rejected`,
      relatedId: job._id,
      onModel: 'Job'
    });

    res.json({ message: 'Job rejected successfully', job });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};


const getPendingJobs = async (req, res) => {
  try {
    const pendingJobs = await Job.find({ status: 'pending' })
      .populate('postedBy', 'name company')
      .sort({ createdAt: -1 });

    res.json({ jobs: pendingJobs });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};



module.exports = { postJob,getallJOb,saveJob , getSavedJobs,approveJob,rejectJob,getPendingJobs};

