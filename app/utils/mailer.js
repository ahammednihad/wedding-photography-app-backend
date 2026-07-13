const nodemailer = require("nodemailer");

// Configure the transporter with fallback to Gmail SMTP using ENV variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true" || false,
    auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER || "",
        pass: process.env.EMAIL_PASS || process.env.SMTP_PASS || ""
    },
    tls: {
        rejectUnauthorized: false
    }
});

// A generic function to send HTML emails asynchronously and handle errors gracefully
const sendEmail = async (to, subject, htmlContent) => {
    try {
        if (!to) {
            console.warn("[MAILER_WARN] No recipient email specified.");
            return null;
        }

        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'WedLens Support'}" <${process.env.SENDER_EMAIL || process.env.EMAIL_USER || 'no-reply@wedlens.com'}>`,
            to,
            subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAILER_SUCCESS] Email sent: "${subject}" to <${to}>. Message ID: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error(`[MAILER_ERROR] Failed to send email to <${to}>:`, err.message);
        // We do not throw the error to prevent breaking the application's execution flow
        return null;
    }
};

// Helper function to build a unified HTML email layout
const buildEmailTemplate = (title, headerText, bodyHtml) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 20px; }
            .container { max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
            .header { background-color: #2563eb; color: #ffffff; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 40px 30px; line-height: 1.6; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
            .button { display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; }
            .highlight { color: #2563eb; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📸 WedLens</h1>
                <p>${headerText}</p>
            </div>
            <div class="content">
                <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">${title}</h2>
                ${bodyHtml}
            </div>
            <div class="footer">
                &copy; 2026 WedLens Inc. All rights reserved. <br>
                This is an automated system email. Please do not reply directly.
            </div>
        </div>
    </body>
    </html>
    `;
};

const mailer = {
    // 1. Registration Confirmation
    sendRegistrationEmail: async (user) => {
        const title = `Welcome to WedLens, ${user.name}!`;
        const headerText = "Registration Successful";
        const roleMsg = user.role === "photographer"
            ? "Your photographer profile is registered. Admins will review your profile, and you will receive another email once your profile is approved."
            : "Your client account is active. You can now browse verified photographers, manage bookmarks, and create bookings.";
        
        const body = `
            <p>Hi ${user.name},</p>
            <p>Thank you for registering with WedLens, India's premium wedding photography marketplace.</p>
            <p>${roleMsg}</p>
            <p>If you have any questions, feel free to reply or visit our Support center.</p>
            <p>Best regards,<br>The WedLens Team</p>
        `;
        return sendEmail(user.email, "Welcome to WedLens!", buildEmailTemplate(title, headerText, body));
    },

    // 2. Login Alert (Optional)
    sendLoginAlertEmail: async (user) => {
        const title = "New Login Detected";
        const headerText = "Security Alert";
        const body = `
            <p>Hi ${user.name},</p>
            <p>We detected a new login to your WedLens account on ${new Date().toLocaleString(undefined, { timeZone: 'Asia/Kolkata' })} (IST).</p>
            <p>If this was you, you can safely ignore this email. If this wasn't you, please change your password immediately.</p>
        `;
        return sendEmail(user.email, "WedLens - New Login Detected", buildEmailTemplate(title, headerText, body));
    },

    // 3. Photographer Approval
    sendPhotographerApprovalEmail: async (photographer) => {
        const title = "Your Account is Approved!";
        const headerText = "Verification Status Update";
        const body = `
            <p>Hi ${photographer.name},</p>
            <p>Congratulations! Our administration team has verified and <span class="highlight">approved</span> your professional photographer profile.</p>
            <p>Your studio listing is now visible to active clients searching for photography services. You can start receiving booking assignments immediately.</p>
            <a href="http://localhost:5175/login" class="button">Access Dashboard</a>
        `;
        return sendEmail(photographer.email, "WedLens - Account Approved!", buildEmailTemplate(title, headerText, body));
    },

    // 4. Booking Status Update Email (covers Confirmations and Status updates)
    sendBookingStatusEmail: async (booking, client, photographer, status) => {
        const title = `Booking Status: ${status.toUpperCase()}`;
        const headerText = "Booking Update Notification";
        
        let clientMsg = "";
        let photographerMsg = "";
        let subject = `WedLens Booking Status Update: ${status.toUpperCase()}`;

        const eventDetails = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Event Type:</td><td style="padding: 6px 0; font-weight: bold;">${booking.eventType}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Event Date:</td><td style="padding: 6px 0; font-weight: bold;">${new Date(booking.eventDate).toDateString()}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time Slot:</td><td style="padding: 6px 0; font-weight: bold;">${booking.startTime} - ${booking.endTime}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Venue Location:</td><td style="padding: 6px 0; font-weight: bold;">${booking.location}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Selected Package:</td><td style="padding: 6px 0; font-weight: bold; text-transform: capitalize;">${booking.package}</td></tr>
            </table>
        `;

        switch(status.toLowerCase()) {
            case "pending":
                clientMsg = `<p>Your booking request for event date <span class="highlight">${new Date(booking.eventDate).toDateString()}</span> has been submitted and is pending approval.</p>`;
                photographerMsg = `<p>You have a new pending wedding assignment request from <span class="highlight">${client.name}</span>. Please review the details in your dashboard.</p>`;
                break;
            case "confirmed":
                clientMsg = `<p>Great news! Your booking has been <span class="highlight" style="color: #10b981;">CONFIRMED</span> by the photographer. Your event schedule is secure.</p>`;
                photographerMsg = `<p>Your assignment with <span class="highlight">${client.name}</span> is <span class="highlight" style="color: #10b981;">CONFIRMED</span>. Make sure to update your calendar.</p>`;
                break;
            case "completed":
                clientMsg = `<p>Your booking status has been marked as <span class="highlight">COMPLETED</span>. We hope you loved your photography experience! You can leave a review in your client portal.</p>`;
                photographerMsg = `<p>Great job! The shoot for booking reference #${booking._id.toString().slice(-8).toUpperCase()} has been successfully marked as completed.</p>`;
                break;
            case "cancelled":
                clientMsg = `<p>Your booking has been <span class="highlight" style="color: #ef4444;">CANCELLED</span>. If a refund is applicable, it will be processed shortly.</p>`;
                photographerMsg = `<p>The shoot with <span class="highlight">${client.name}</span> has been <span class="highlight" style="color: #ef4444;">CANCELLED</span>.</p>`;
                break;
            default:
                clientMsg = `<p>The booking status is updated to: ${status}</p>`;
                photographerMsg = `<p>The assignment status is updated to: ${status}</p>`;
        }

        // Send to Client
        await sendEmail(
            client.email,
            subject,
            buildEmailTemplate(title, headerText, `${clientMsg} <h3>Event Details</h3> ${eventDetails}`)
        );

        // Send to Photographer (if assigned)
        if (photographer && photographer.email) {
            await sendEmail(
                photographer.email,
                subject,
                buildEmailTemplate(title, headerText, `${photographerMsg} <h3>Event Details</h3> ${eventDetails}`)
            );
        }
    },

    // 5. Payment Success Email
    sendPaymentSuccessEmail: async (payment, client, booking) => {
        const title = "Payment Successful!";
        const headerText = "Payment Confirmation";
        const body = `
            <p>Hi ${client.name},</p>
            <p>We have successfully received your payment of <span class="highlight">₹${payment.amount}</span> via Razorpay for the booking reference #${booking._id.toString().slice(-8).toUpperCase()}.</p>
            <p>Your booking status is updated to <span class="highlight" style="color: #10b981;">CONFIRMED</span>.</p>
            <h3>Transaction Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Razorpay Order ID:</td><td style="padding: 4px 0; font-weight: bold;">${payment.razorpayOrderId || "N/A"}</td></tr>
                <tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Razorpay Payment ID:</td><td style="padding: 4px 0; font-weight: bold;">${payment.razorpayPaymentId || "N/A"}</td></tr>
                <tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Amount Paid:</td><td style="padding: 4px 0; font-weight: bold;">₹${payment.amount}</td></tr>
            </table>
        `;
        return sendEmail(client.email, "WedLens - Payment Success Confirmation", buildEmailTemplate(title, headerText, body));
    },

    // 6. Payment Failure Email
    sendPaymentFailureEmail: async (client, booking, errorDescription = "Transaction declined by bank") => {
        const title = "Payment Failed";
        const headerText = "Billing Alert";
        const body = `
            <p>Hi ${client.name},</p>
            <p>We were unable to process your payment for booking reference #${booking._id.toString().slice(-8).toUpperCase()}.</p>
            <p><strong>Reason:</strong> ${errorDescription}</p>
            <p>Please try making the payment again or contact your card issuer/bank for assistance.</p>
            <a href="http://localhost:5175/client/payments" class="button">Retry Payment</a>
        `;
        return sendEmail(client.email, "WedLens - Payment Failed Alert", buildEmailTemplate(title, headerText, body));
    },

    // 7. Contact Form Email
    sendContactFormEmail: async (contactDetails, adminEmail = "ahammednihad02@gmail.com") => {
        const title = "New Contact Form Submission";
        const headerText = "Contact Request Terminal";
        const body = `
            <p>An inquiry has been received via the contact portal:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 6px 0; color: #6b7280;">Full Name:</td><td style="padding: 6px 0; font-weight: bold;">${contactDetails.name}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Email:</td><td style="padding: 6px 0; font-weight: bold;">${contactDetails.email}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Inquiry Type:</td><td style="padding: 6px 0; font-weight: bold;">${contactDetails.inquiryType}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Message:</td><td style="padding: 6px 0; font-weight: bold; white-space: pre-wrap;">${contactDetails.message}</td></tr>
            </table>
        `;
        return sendEmail(adminEmail, `WedLens - Contact Form: ${contactDetails.inquiryType}`, buildEmailTemplate(title, headerText, body));
    },

    // 8. Password Reset Email
    sendPasswordResetEmail: async (user, resetUrl) => {
        const title = "Password Reset Request";
        const headerText = "Security Terminal";
        const body = `
            <p>Hi ${user.name},</p>
            <p>You requested a password reset. Click the button below to set a new password. The link is valid for 1 hour.</p>
            <p style="text-align: center;"><a href="${resetUrl}" class="button">Reset Password</a></p>
            <p>Or copy this link to your browser: <br>${resetUrl}</p>
            <p>If you did not request this, you can safely ignore this email.</p>
        `;
        return sendEmail(user.email, "WedLens Password Reset Request", buildEmailTemplate(title, headerText, body));
    }
};

module.exports = mailer;
