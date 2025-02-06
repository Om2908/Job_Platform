const nodemailer = require('nodemailer');
const icalGenerator = require('ical-generator').default;
const Notification = require('../models/notification');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

class NotificationService {
  static async createNotification(data) {
    try {
      const notification = new Notification(data);
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async sendEmail(to, subject, html, calendar = null) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
      };

      if (calendar) {
        mailOptions.attachments = [{
          filename: 'interview.ics',
          content: calendar.toString(),
          contentType: 'text/calendar'
        }];
      }

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  static async notifyApplicationReceived(application, job, employer) {

    // notification for employer and send mail
    await this.createNotification({
      recipient: employer._id,
      type: 'APPLICATION_RECEIVED',
      title: 'New Application Received',
      message: `New application received for ${job.title}`,
      relatedId: application._id,
      onModel: 'Application'
    });

    await this.sendEmail(
      employer.email,
      'New Job Application Received',
      `<h1>New Application</h1>
       <p>You have received a new application for ${job.title}</p>`
    );
  }



  static async notifyInterviewScheduled(application, job, seeker, interviewDate) {
    // Create calendar event
    const calendar = icalGenerator({
      domain: 'jobportal.com',
      name: 'Interview Schedule'
    });

    calendar.createEvent({
      start: new Date(interviewDate),
      end: new Date(new Date(interviewDate).getTime() + 3600000),
      summary: `Interview for ${job.title}`,
      description: `Interview for ${job.title} position`,
      location: job.location
    });

    // Create notification for job seeker
    await this.createNotification({
      recipient: seeker._id,
      type: 'INTERVIEW_SCHEDULED',
      title: 'Interview Scheduled',
      message: `Your interview for ${job.title} has been scheduled`,
      relatedId: application._id,
      onModel: 'Application'
    });

    // Send email with calendar invite
    await this.sendEmail(
      seeker.email,
      'Interview Scheduled',
      `<h1>Interview Scheduled</h1>
       <p>Your interview for ${job.title} has been scheduled for ${new Date(interviewDate).toLocaleString()}</p>`,
      calendar
    );
  }

  static async sendJobRecommendations(userId) {
    const user = await User.findById(userId);
    if (!user || !user.profile || !user.profile.skills) return;

    const jobs = await Job.find({
      requirements: { $in: user.profile.skills },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).limit(5);

    if (jobs.length > 0) {
      const jobsList = jobs.map(job => 
        `<li>${job.title} at ${job.companyName} - ${job.location}</li>`
      ).join('');

      await this.sendEmail(
        user.email,
        'Weekly Job Recommendations',
        `<h1>Job Recommendations</h1>
         <p>Here are some jobs that match your skills:</p>
         <ul>${jobsList}</ul>`
      );
    }
  }
}

module.exports = NotificationService;