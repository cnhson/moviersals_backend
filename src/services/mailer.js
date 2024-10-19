import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";

const oath2client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
oath2client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export async function sendEmail(to, subject, text) {
  const accessToken = oath2client.getAccessToken();

  const transporter = nodemailer.createTransport({
    // @ts-ignore
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GOOGLE_EMAIL,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken: accessToken,
    },
  });

  const mailOptions = {
    from: process.env.GOOGLE_EMAIL,
    to: to,
    subject: subject,
    text: text,
  };

  async function sendMail() {
    try {
      await transporter.sendMail(mailOptions);
      console.log("Email sent!");
      return;
    } catch (err) {
      console.log(err);
      return;
    }
  }

  await sendMail();
}
