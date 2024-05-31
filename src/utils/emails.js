import sendGrid from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

sendGrid.setApiKey(process.env.SENDGRID_API_KEY);
const sendEmail = async (to, subject, text) => {
  try {
    await sendGrid.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text,
    });
  } catch (e) {
    console.error(e);
    return e.message;
  }
};

export { sendEmail };
