// Shared wrapper for all Printsy emails
const wrap = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f4f6f9; font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; }
    .container { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0F2854 0%, #1C4D8D 100%); padding: 28px 32px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 26px; letter-spacing: 1px; }
    .header p  { margin: 4px 0 0; color: #a8c4e0; font-size: 13px; }
    .body   { padding: 32px; }
    .body p { margin: 0 0 16px; line-height: 1.6; color: #374151; font-size: 15px; }
    .badge  { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: capitalize; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .info-table td:first-child { color: #6b7280; font-weight: 500; width: 42%; }
    .info-table td:last-child  { color: #111827; font-weight: 600; }
    .btn { display: inline-block; padding: 13px 28px; background: #1C4D8D; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 8px 0; }
    .footer { background: #f9fafb; padding: 20px 32px; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Printsy</h1>
      <p>Online Document Printing & Delivery</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Printsy. All rights reserved.</p>
      <p>You received this email because you have an account on Printsy.</p>
    </div>
  </div>
</body>
</html>`;

// ─── Status colors ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  pending:    { bg: '#fef3c7', text: '#92400e' },
  processing: { bg: '#dbeafe', text: '#1e40af' },
  completed:  { bg: '#d1fae5', text: '#065f46' },
  cancelled:  { bg: '#fee2e2', text: '#991b1b' },
};

const DELIVERY_COLOR = {
  assigned:   { bg: '#fef3c7', text: '#92400e' },
  picked_up:  { bg: '#dbeafe', text: '#1e40af' },
  in_transit: { bg: '#ede9fe', text: '#5b21b6' },
  delivered:  { bg: '#d1fae5', text: '#065f46' },
};

const badge = (label, colors) =>
  `<span class="badge" style="background:${colors.bg};color:${colors.text}">${label}</span>`;

// ─── 1. Welcome email ─────────────────────────────────────────────────────────
export const welcomeEmail = ({ name }) => ({
  subject: 'Welcome to Printsy!',
  html: wrap(`
    <p>Hi <strong>${name}</strong>,</p>
    <p>Welcome to <strong>Printsy</strong> — your one-stop solution for online document printing and doorstep delivery.</p>
    <p>You can now upload your documents, choose print options, and get them delivered right to your address.</p>
    <p style="margin-top:24px">Happy printing!<br/><strong>The Printsy Team</strong></p>
  `),
});

// ─── 2. Password reset email ──────────────────────────────────────────────────
export const passwordResetEmail = ({ name, resetUrl }) => ({
  subject: 'Reset Your Printsy Password',
  html: wrap(`
    <p>Hi <strong>${name}</strong>,</p>
    <p>We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.</p>
    <p style="text-align:center;margin:28px 0">
      <a class="btn" href="${resetUrl}">Reset Password</a>
    </p>
    <p>If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
    <p>Or copy this link into your browser:<br/>
      <span style="font-size:13px;color:#6b7280;word-break:break-all">${resetUrl}</span>
    </p>
  `),
});

// ─── 3. Order confirmation ────────────────────────────────────────────────────
export const orderConfirmationEmail = ({ name, order }) => ({
  subject: `Order Confirmed — #${order._id.toString().slice(-6).toUpperCase()}`,
  html: wrap(`
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your print order has been received and is being reviewed by our shop team.</p>
    <table class="info-table">
      <tr><td>Order ID</td><td>#${order._id.toString().slice(-6).toUpperCase()}</td></tr>
      <tr><td>File</td><td>${order.fileName}</td></tr>
      <tr><td>Print Type</td><td>${order.printType === 'black-white' ? 'Black &amp; White' : 'Color'}</td></tr>
      <tr><td>Paper Size</td><td>${order.paperSize}</td></tr>
      <tr><td>Copies</td><td>${order.copies}</td></tr>
      <tr><td>Print Sides</td><td style="text-transform:capitalize">${order.printSides}</td></tr>
      <tr><td>Paper Type</td><td style="text-transform:capitalize">${order.paperType}</td></tr>
      <tr><td>Binding</td><td style="text-transform:capitalize">${order.binding}</td></tr>
      <tr><td>Delivery Address</td><td>${order.deliveryAddress}</td></tr>
      <tr><td>Total Price</td><td>Rs. ${order.totalPrice}</td></tr>
      <tr><td>Status</td><td>${badge('Pending', STATUS_COLOR.pending)}</td></tr>
    </table>
    <p>We will notify you as your order progresses. Thank you for choosing Printsy!</p>
  `),
});

// ─── 4. Order status update ───────────────────────────────────────────────────
const STATUS_MESSAGE = {
  processing: 'Your order is now being printed by our shop team.',
  completed:  'Your order has been printed and is ready for delivery pickup.',
  cancelled:  'Unfortunately, your order has been cancelled. Please contact support if you have questions.',
};

export const orderStatusEmail = ({ name, order, newStatus }) => {
  const colors = STATUS_COLOR[newStatus] || STATUS_COLOR.pending;
  return {
    subject: `Order Update — ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} #${order._id.toString().slice(-6).toUpperCase()}`,
    html: wrap(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>${STATUS_MESSAGE[newStatus] || `Your order status has been updated to <strong>${newStatus}</strong>.`}</p>
      <table class="info-table">
        <tr><td>Order ID</td><td>#${order._id.toString().slice(-6).toUpperCase()}</td></tr>
        <tr><td>File</td><td>${order.fileName}</td></tr>
        <tr><td>Total Price</td><td>Rs. ${order.totalPrice}</td></tr>
        <tr><td>New Status</td><td>${badge(newStatus, colors)}</td></tr>
      </table>
    `),
  };
};

// ─── 5. Delivery status update ────────────────────────────────────────────────
const DELIVERY_MESSAGE = {
  assigned:   'A rider has been assigned to your order and will pick it up from our shop soon.',
  picked_up:  'Your order has been picked up by the rider and is on its way to you!',
  in_transit: 'Great news — your order is in transit and will be delivered shortly.',
  delivered:  'Your order has been successfully delivered. Thank you for using Printsy!',
};

export const deliveryStatusEmail = ({ name, order, newStatus }) => {
  const colors = DELIVERY_COLOR[newStatus] || DELIVERY_COLOR.assigned;
  const label = newStatus.replace(/_/g, ' ');
  return {
    subject: `Delivery Update — ${label.charAt(0).toUpperCase() + label.slice(1)} #${order._id.toString().slice(-6).toUpperCase()}`,
    html: wrap(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>${DELIVERY_MESSAGE[newStatus] || `Your delivery status has been updated to <strong>${label}</strong>.`}</p>
      <table class="info-table">
        <tr><td>Order ID</td><td>#${order._id.toString().slice(-6).toUpperCase()}</td></tr>
        <tr><td>File</td><td>${order.fileName}</td></tr>
        <tr><td>Delivery Address</td><td>${order.deliveryAddress}</td></tr>
        <tr><td>Delivery Status</td><td>${badge(label, colors)}</td></tr>
        ${order.deliveryNotes ? `<tr><td>Rider Note</td><td>${order.deliveryNotes}</td></tr>` : ''}
      </table>
    `),
  };
};
