const supabase = require('../lib/supabase');
const { calculatePrizePool, getActiveSubscriberCount, createPrizePoolRecord, getRolloverJackpot } = require('../services/prizePool');
const { simulateDraw } = require('../services/drawEngine');

const getAllDraws = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('draws')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get draws error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve draws.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      message: 'Draws retrieved.'
    });
  } catch (error) {
    console.error('GetAllDraws error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getLatestDraw = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('draws')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No published draw found.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Latest draw retrieved.'
    });
  } catch (error) {
    console.error('GetLatestDraw error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const createDraw = async (req, res) => {
  try {
    const { month } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Month is required.'
      });
    }

    // Count active subscribers
    const activeCount = await getActiveSubscriberCount();

    // £5 per subscriber
    let totalPool = activeCount * 5;

    // Check for rollover jackpot from previous draw
    const rolloverAmount = await getRolloverJackpot();

    // Calculate prize pools
    const pools = calculatePrizePool(totalPool);

    // Add rollover to tier 5
    if (rolloverAmount > 0) {
      pools.tier_5_pool = parseFloat((pools.tier_5_pool + rolloverAmount).toFixed(2));
    }

    totalPool = parseFloat((pools.tier_5_pool + pools.tier_4_pool + pools.tier_3_pool).toFixed(2));

    // Insert draw
    const { data: draw, error: drawError } = await supabase
      .from('draws')
      .insert({
        month,
        status: 'draft',
        total_pool: totalPool,
        jackpot_amount: 0,
        jackpot_rollover: false
      })
      .select()
      .single();

    if (drawError) {
      console.error('Create draw error:', drawError.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to create draw.'
      });
    }

    // Create prize pool record
    await createPrizePoolRecord(draw.id, pools);

    return res.status(201).json({
      success: true,
      data: {
        draw,
        prize_pools: pools,
        active_subscribers: activeCount
      },
      message: 'Draw created.'
    });
  } catch (error) {
    console.error('CreateDraw error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const simulate = async (req, res) => {
  try {
    if (req.user.subscription_status !== 'active') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Active subscription required.'
      });
    }

    const { id } = req.params;
    const { mode } = req.body;

    // Verify draw exists and is in draft status
    const { data: draw, error: findError } = await supabase
      .from('draws')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !draw) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Draw not found.'
      });
    }

    if (draw.status !== 'draft') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Draw has already been simulated or published.'
      });
    }

    // Run simulation
    const result = await simulateDraw(id, mode);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Draw simulation complete.'
    });
  } catch (error) {
    console.error('Simulate error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message || 'Internal server error.'
    });
  }
};

const publishDraw = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify draw exists and is simulated
    const { data: draw, error: findError } = await supabase
      .from('draws')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !draw) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Draw not found.'
      });
    }

    if (draw.status !== 'simulated') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Draw must be simulated before publishing.'
      });
    }

    // Update status to published
    const { data, error } = await supabase
      .from('draws')
      .update({ status: 'published' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Publish draw error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to publish draw.'
      });
    }

    // Log winner notifications (placeholder for future email/push)
    const { data: winners } = await supabase
      .from('winners')
      .select('*, profiles(full_name, email)')
      .eq('draw_id', id);

    if (winners && winners.length > 0) {
      console.log('=== DRAW PUBLISHED - WINNER NOTIFICATIONS ===');
      winners.forEach(winner => {
        console.log(`Notify: ${winner.profiles.full_name} (${winner.profiles.email}) - Tier ${winner.tier} - Prize: £${winner.prize_amount}`);
      });
      console.log('=== END NOTIFICATIONS ===');
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Draw published.'
    });
  } catch (error) {
    console.error('PublishDraw error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getDrawEntries = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('draw_entries')
      .select('*, profiles(id, full_name, email)')
      .eq('draw_id', id)
      .order('matched', { ascending: false });

    if (error) {
      console.error('Get draw entries error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve draw entries.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      message: 'Draw entries retrieved.'
    });
  } catch (error) {
    console.error('GetDrawEntries error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  getAllDraws,
  getLatestDraw,
  createDraw,
  simulate,
  publishDraw,
  getDrawEntries
};
