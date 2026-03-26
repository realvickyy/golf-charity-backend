const supabase = require('../lib/supabase');

const createScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { score, played_date } = req.body;

    if (req.user.subscription_status !== 'active') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Active subscription required.'
      });
    }

    // Validate score range
    if (score < 1 || score > 45) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Score must be between 1 and 45.'
      });
    }

    // Count user's existing scores
    const { count, error: countError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Score count error:', countError.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to check score count.'
      });
    }

    // If >= 5 scores, delete the oldest by played_date
    if (count >= 5) {
      const { data: oldest, error: oldestError } = await supabase
        .from('scores')
        .select('id')
        .eq('user_id', userId)
        .order('played_date', { ascending: true })
        .limit(1)
        .single();

      if (oldestError) {
        console.error('Oldest score fetch error:', oldestError.message);
        return res.status(500).json({
          success: false,
          data: null,
          message: 'Failed to manage scores.'
        });
      }

      const { error: deleteError } = await supabase
        .from('scores')
        .delete()
        .eq('id', oldest.id);

      if (deleteError) {
        console.error('Score delete error:', deleteError.message);
        return res.status(500).json({
          success: false,
          data: null,
          message: 'Failed to remove oldest score.'
        });
      }
    }

    // Insert new score
    const { data: newScore, error: insertError } = await supabase
      .from('scores')
      .insert({
        user_id: userId,
        score,
        played_date
      })
      .select()
      .single();

    if (insertError) {
      console.error('Score insert error:', insertError.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to create score.'
      });
    }

    return res.status(201).json({
      success: true,
      data: newScore,
      message: 'Score submitted successfully.'
    });
  } catch (error) {
    console.error('CreateScore error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getMyScores = async (req, res) => {
  try {
    const { data: scores, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', req.user.id)
      .order('played_date', { ascending: false });

    if (error) {
      console.error('Get scores error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve scores.'
      });
    }

    return res.status(200).json({
      success: true,
      data: scores || [],
      message: 'Scores retrieved.'
    });
  } catch (error) {
    console.error('GetMyScores error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const updateScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, played_date } = req.body;

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('scores')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Score not found.'
      });
    }

    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You can only edit/delete your own scores.'
      });
    }

    // Validate score range
    if (score < 1 || score > 45) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Score must be between 1 and 45.'
      });
    }

    const { data, error } = await supabase
      .from('scores')
      .update({ score, played_date })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update score error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to update score.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Score updated.'
    });
  } catch (error) {
    console.error('UpdateScore error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const deleteScore = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('scores')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Score not found.'
      });
    }

    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You can only edit/delete your own scores.'
      });
    }

    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete score error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to delete score.'
      });
    }

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Score deleted.'
    });
  } catch (error) {
    console.error('DeleteScore error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getUserScores = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: scores, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .order('played_date', { ascending: false });

    if (error) {
      console.error('Get user scores error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve user scores.'
      });
    }

    return res.status(200).json({
      success: true,
      data: scores || [],
      message: 'User scores retrieved.'
    });
  } catch (error) {
    console.error('GetUserScores error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  createScore,
  getMyScores,
  updateScore,
  deleteScore,
  getUserScores
};
