const supabase = require('../lib/supabase');
const { sendSubscriptionEmail } = require('../services/emailService');

const PLAN_PRICES = {
  monthly: 9.99,
  yearly: 99.99
};

const createSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid plan. Must be "monthly" or "yearly".'
      });
    }

    const amount = PLAN_PRICES[plan];
    const now = new Date();
    const renewalDate = new Date(now);

    if (plan === 'monthly') {
      renewalDate.setDate(renewalDate.getDate() + 30);
    } else {
      renewalDate.setDate(renewalDate.getDate() + 365);
    }

    const stripeSubscriptionId = 'mock_' + Date.now();

    // Check if user already has a subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    let subscription;

    if (existing) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          plan,
          status: 'active',
          amount,
          start_date: now.toISOString(),
          renewal_date: renewalDate.toISOString(),
          stripe_subscription_id: stripeSubscriptionId
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Subscription update error:', error.message);
        return res.status(500).json({
          success: false,
          data: null,
          message: 'Failed to update subscription.'
        });
      }
      subscription = data;
    } else {
      // Insert new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan,
          status: 'active',
          amount,
          start_date: now.toISOString(),
          renewal_date: renewalDate.toISOString(),
          stripe_subscription_id: stripeSubscriptionId
        })
        .select()
        .single();

      if (error) {
        console.error('Subscription insert error:', error.message);
        return res.status(500).json({
          success: false,
          data: null,
          message: 'Failed to create subscription.'
        });
      }
      subscription = data;
    }

    // Send subscription confirmation email (non-blocking)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();
    if (userProfile) {
      sendSubscriptionEmail(userProfile, subscription).catch(err => console.error('Sub email error:', err));
    }

    return res.status(201).json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully.'
    });
  } catch (error) {
    console.error('CreateSubscription error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error || !subscription) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No subscription found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription retrieved.'
    });
  } catch (error) {
    console.error('GetMySubscription error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const { data: subscription, error: findError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (findError || !subscription) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No subscription found.'
      });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Cancel subscription error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to cancel subscription.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Subscription cancelled.'
    });
  } catch (error) {
    console.error('CancelSubscription error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid plan. Must be "monthly" or "yearly".'
      });
    }

    const amount = PLAN_PRICES[plan];
    const now = new Date();
    const renewalDate = new Date(now);

    if (plan === 'monthly') {
      renewalDate.setDate(renewalDate.getDate() + 30);
    } else {
      renewalDate.setDate(renewalDate.getDate() + 365);
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        plan,
        amount,
        renewal_date: renewalDate.toISOString()
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Update subscription error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to update subscription.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Subscription updated.'
    });
  } catch (error) {
    console.error('UpdateSubscription error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  createSubscription,
  getMySubscription,
  cancelSubscription,
  updateSubscription
};
