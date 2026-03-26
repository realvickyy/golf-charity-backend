const supabase = require('../lib/supabase');
const { sendWinnerVerificationEmail, sendPayoutEmail } = require('../services/emailService');

const getMyWinnings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('winners')
      .select('*, draws(id, month, status, winning_numbers, created_at)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get my winnings error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve winnings.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      message: 'Winnings retrieved.'
    });
  } catch (error) {
    console.error('GetMyWinnings error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getAllWinners = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('winners')
      .select('*, profiles(id, full_name, email), draws(id, month, status, winning_numbers)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get all winners error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve winners.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      message: 'Winners retrieved.'
    });
  } catch (error) {
    console.error('GetAllWinners error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const uploadProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { proof_url } = req.body;

    // Verify winner belongs to user
    const { data: winner, error: findError } = await supabase
      .from('winners')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (findError || !winner) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Winner record not found.'
      });
    }

    if (winner.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You can only upload proof for your own winnings.'
      });
    }

    const { data, error } = await supabase
      .from('winners')
      .update({ proof_url })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Upload proof error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to upload proof.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Proof uploaded.'
    });
  } catch (error) {
    console.error('UploadProof error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const verifyWinner = async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_status } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(verification_status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid verification status. Must be: pending, approved, or rejected.'
      });
    }

    const { data, error } = await supabase
      .from('winners')
      .update({ verification_status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Verify winner error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to update verification status.'
      });
    }

    // Send verification email (non-blocking)
    const { data: winnerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', data.user_id)
      .single();
    if (winnerProfile) {
      sendWinnerVerificationEmail(winnerProfile, verification_status).catch(err => console.error('Verify email error:', err));
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Verification status updated.'
    });
  } catch (error) {
    console.error('VerifyWinner error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const updatePayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { payout_status } = req.body;

    const validStatuses = ['pending', 'paid'];
    if (!validStatuses.includes(payout_status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid payout status. Must be: pending or paid.'
      });
    }

    const { data, error } = await supabase
      .from('winners')
      .update({ payout_status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update payout error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to update payout status.'
      });
    }

    // Send payout email if paid (non-blocking)
    if (payout_status === 'paid') {
      const { data: payoutProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.user_id)
        .single();
      if (payoutProfile) {
        sendPayoutEmail(payoutProfile, data.prize_amount).catch(err => console.error('Payout email error:', err));
      }
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Payout status updated.'
    });
  } catch (error) {
    console.error('UpdatePayout error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  getMyWinnings,
  getAllWinners,
  uploadProof,
  verifyWinner,
  updatePayout
};
