const supabase = require('../lib/supabase');

const getAllUsers = async (req, res) => {
  try {
    // Get all profiles with their subscriptions joined
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url, created_at, subscriptions(id, plan, status, amount, start_date, renewal_date)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get all users error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve users.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      message: 'Users retrieved.'
    });
  } catch (error) {
    console.error('GetAllUsers error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, avatar_url } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, full_name, email, role, avatar_url, created_at')
      .single();

    if (error) {
      console.error('Update user error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to update user.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'User updated.'
    });
  } catch (error) {
    console.error('UpdateUser error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Active subscribers
    const { count: activeSubscribers } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Total prize pool (sum all draw total_pool)
    const { data: draws } = await supabase
      .from('draws')
      .select('total_pool');

    const totalPrizePool = draws
      ? draws.reduce((sum, d) => sum + parseFloat(d.total_pool || 0), 0)
      : 0;

    // Total charity contributions (sum percentages)
    const { data: contributions } = await supabase
      .from('charity_contributions')
      .select('percentage');

    const totalCharityContributions = contributions
      ? contributions.reduce((sum, c) => sum + parseFloat(c.percentage || 0), 0)
      : 0;

    // Draw statistics counts
    const { count: draftCount } = await supabase
      .from('draws')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    const { count: simulatedCount } = await supabase
      .from('draws')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'simulated');

    const { count: publishedCount } = await supabase
      .from('draws')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    return res.status(200).json({
      success: true,
      data: {
        total_users: totalUsers || 0,
        active_subscribers: activeSubscribers || 0,
        total_prize_pool: parseFloat(totalPrizePool.toFixed(2)),
        total_charity_contributions: parseFloat(totalCharityContributions.toFixed(2)),
        draw_statistics: {
          draft: draftCount || 0,
          simulated: simulatedCount || 0,
          published: publishedCount || 0
        }
      },
      message: 'Analytics retrieved.'
    });
  } catch (error) {
    console.error('GetAnalytics error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const updateUserSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'lapsed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid status. Must be: active, inactive, lapsed, or cancelled.'
      });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status })
      .eq('user_id', id)
      .select()
      .single();

    if (error) {
      console.error('Update user subscription error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to update user subscription.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'User subscription updated.'
    });
  } catch (error) {
    console.error('UpdateUserSubscription error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  getAllUsers,
  updateUser,
  getAnalytics,
  updateUserSubscription
};
