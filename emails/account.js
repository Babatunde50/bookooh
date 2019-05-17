const sgMail = require('@sendgrid/mail');

const sendGridAPIKEY = process.env.SEND_GRID_KEY

sgMail.setApiKey(sendGridAPIKEY);


const sendWelcomeEmail = (email, name) => {
    const msg = {
        to: email,
        from: 'bukooh@bukooh.com',
        subject: 'Thanks for joining in',
        html: `
            <div>
                <p> Hey ${name}, Welcome to bukooh! </p>
                    <p>My first day in the <strong> University of Ibadan </strong>, Getting into the dorm allocated to me I saw a lot of abandoned books.
                        These books were still in good shape and in fact some of them were still new. After my first semester I discovered that there is no
                        platform that gives me the access to share course materials (mostly pdf's) that will be useful to the next set of students.
                        This got me thinking, and I asked myself these questions:
                    </p>
                    <ul>
                        <li>Is there anyone trying to solve this? </li>
                        <li>Can I solve this? </li>
                        <li>How can I solve this? </li>
                    </ul>
                    <p>These three questions are what brings <strong> bukooh! </strong> to life.</p>
                    <p>Our main aim is to minimize and eventually stop the waste of books in the <strong> University of Ibadan </strong>. We give 
                        book owner the platform to upload "No Longer Useful books to me" either softcopy or hardcopy. We make pdf's
                        downloadable to anyone irrespective of their race or culture and we connect those that upload hard copy books(in form of an image with some descriptions)
                        to those that needs it through <strong>SMS</strong>(text messages).
                    </p>
                    <p>And Guess what? <strong>It's 100% free</strong></p>
                    <blockquote cite="">
                        <p><strong>Why don't you give bookooh a try. Someone in need might be in need of what you don't need anymore. </strong></p>
                    </blockquote>
                    <cite>– Babatunde Ololade, Founder bukooh!</cite>

            </div>
        `,
      };
      sgMail.send(msg);
}

const sendResetPasswordEmail = (email, token) => {
    const msg = {
        to: email,
        from: 'bukooh@bukooh.com',
        subject: 'Forget your password? We can help',
        html: `
                <p>Forget your pasword?</p>
                <p>No worries, we've got you covered. </p>
                <p>Click this  <a href="https://bukooh2020.herokuapp.com/auth/reset/${token}">link</a> to reset your password</p>
        `,
      };
      sgMail.send(msg);
}

const sendPasswordResetSuccessEmail = (email) => {
    const msg = {
        to: email,
        from: 'bukooh@bukooh.com',
        subject: 'Password Reset Success',
        html: `
            <div>
                <h1>Password Reset Success</h1>
                <p>Your password has been reset successfully</p>
                <p>Click this <a href="https://bukooh2020.herokuapp.com/auth/login">link</a> to Login with your new password</p>
            </div>
        `,
      };
      sgMail.send(msg);
}

module.exports = {
    sendWelcomeEmail,
    sendResetPasswordEmail,
    sendPasswordResetSuccessEmail
}

