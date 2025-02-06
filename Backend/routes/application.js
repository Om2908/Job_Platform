const express = require('express');
const app=express();
app.use(express.json());
const router = express.Router();
const auth=require('../middleware/auth')
const {applyForJob,getApplicationsForJob, updateApplicationStatus,getMyApplications} = require('../controllers/application');


//job seeker mate routes
router.post('/apply/:jobId',auth(['job_seeker']), applyForJob); 
router.get('/myapplications', auth(['job_seeker']), getMyApplications); 

// employer mate routes
router.get('/:jobId', auth(['employer']), getApplicationsForJob); 
router.patch('/updatestatus/:applicationId', auth(['employer']), updateApplicationStatus);


module.exports = router;  