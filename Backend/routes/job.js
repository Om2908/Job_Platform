const express = require('express');
const app=express();
app.use(express.json());
const router = express.Router();
const auth=require('../middleware/auth')

const { postJob,getallJOb,saveJob,getSavedJobs,getPendingJobs,approveJob,rejectJob} = require('../controllers/job');

router.post('/post',auth(['employer']),postJob);
router.get('/all', getallJOb);  
router.post('/save/:jobId',auth(['job_seeker']), saveJob);
router.get('/saved', auth(['job_seeker']), getSavedJobs);

router.get('/pending', auth(['admin']), getPendingJobs);
router.patch('/approve/:jobId', auth(['admin']), approveJob);
router.patch('/reject/:jobId', auth(['admin']), rejectJob);



module.exports = router;