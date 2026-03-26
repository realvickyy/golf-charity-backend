/**
 * Mock Email Service
 * 
 * In production, replace this with an actual email provider like
 * SendGrid, Resend, or AWS SES.
 * 
 * This mock logs all emails to the console for development/demo purposes.
 */

const sendEmail = async ({ to, subject, html, text }) => {
  const timestamp = new Date().toISOString();

  console.log(`
╔══════════════════════════════════════════════════╗
║              📧 MOCK EMAIL SENT                  ║
╠══════════════════════════════════════════════════╣
║  To:      ${to.padEnd(38)}║
║  Subject: ${subject.substring(0, 38).padEnd(38)}║
║  Time:    ${timestamp.padEnd(38)}║
╚══════════════════════════════════════════════════╝
`);

  if (text) {
    console.log('  Body:', text.substring(0, 200));
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    success: true,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    provider: 'mock'
  };
};

const sendWelcomeEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Digital Heroes! 🎉',
    text: `Hi ${user.full_name},\n\nWelcome to Digital Heroes! Your account has been created successfully.\n\nYou can now:\n- Subscribe to a plan\n- Enter your golf scores\n- Support a charity\n- Participate in monthly prize draws\n\nLet's make an impact together!\n\n— The Digital Heroes Team`
  });
};

const sendSubscriptionEmail = async (user, subscription) => {
  return sendEmail({
    to: user.email,
    subject: `Subscription Activated — ${subscription.plan} Plan`,
    text: `Hi ${user.full_name},\n\nYour ${subscription.plan} subscription is now active!\n\nPlan: ${subscription.plan}\nAmount: £${subscription.amount}\nRenewal Date: ${subscription.renewal_date}\n\nYou're now eligible for monthly prize draws. Start entering your scores!\n\n— The Digital Heroes Team`
  });
};

const sendDrawResultsEmail = async (user, draw, isWinner, prize) => {
  const subject = isWinner
    ? `🏆 You Won! ${draw.month} Draw Results`
    : `${draw.month} Draw Results — Better Luck Next Time`;

  const text = isWinner
    ? `Hi ${user.full_name},\n\nCongratulations! You won £${prize} in the ${draw.month} draw!\n\nPlease upload your score proof to verify your win and claim your prize.\n\n— The Digital Heroes Team`
    : `Hi ${user.full_name},\n\nThe ${draw.month} draw results are in. Unfortunately, your numbers didn't match this time.\n\nKeep playing — next month could be your lucky draw!\n\n— The Digital Heroes Team`;

  return sendEmail({ to: user.email, subject, text });
};

const sendWinnerVerificationEmail = async (user, status) => {
  const subject = status === 'approved'
    ? '✅ Your Win Has Been Verified!'
    : '❌ Win Verification Update';

  const text = status === 'approved'
    ? `Hi ${user.full_name},\n\nGreat news! Your win has been verified. Your payout will be processed shortly.\n\n— The Digital Heroes Team`
    : `Hi ${user.full_name},\n\nUnfortunately, your win verification was not approved. If you believe this is an error, please contact support.\n\n— The Digital Heroes Team`;

  return sendEmail({ to: user.email, subject, text });
};

const sendPayoutEmail = async (user, amount) => {
  return sendEmail({
    to: user.email,
    subject: '💰 Payout Processed!',
    text: `Hi ${user.full_name},\n\nYour payout of £${amount} has been processed and sent to your account.\n\nThank you for being part of Digital Heroes!\n\n— The Digital Heroes Team`
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendDrawResultsEmail,
  sendWinnerVerificationEmail,
  sendPayoutEmail
};
