const supabase = require('../lib/supabase');

/**
 * Calculate prize pool based on total pool amount.
 * Distribution: 40% tier-5, 35% tier-4, 25% tier-3
 */
const calculatePrizePool = (totalPool) => {
  return {
    tier_5_pool: parseFloat((totalPool * 0.40).toFixed(2)),
    tier_4_pool: parseFloat((totalPool * 0.35).toFixed(2)),
    tier_3_pool: parseFloat((totalPool * 0.25).toFixed(2))
  };
};

/**
 * Get the rollover jackpot from the most recent draw that has jackpot_rollover = true.
 */
const getRolloverJackpot = async () => {
  const { data, error } = await supabase
    .from('draws')
    .select('tier_5_pool:prize_pools(tier_5_pool)')
    .eq('jackpot_rollover', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return 0;
  }

  // Check for nested prize_pools data
  if (data.tier_5_pool && Array.isArray(data.tier_5_pool) && data.tier_5_pool.length > 0) {
    return parseFloat(data.tier_5_pool[0].tier_5_pool) || 0;
  }

  return 0;
};

/**
 * Get count of active subscribers for pool calculation.
 */
const getActiveSubscriberCount = async () => {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (error) {
    console.error('Error counting active subscribers:', error.message);
    return 0;
  }

  return count || 0;
};

/**
 * Create prize pool record for a draw.
 */
const createPrizePoolRecord = async (drawId, pools) => {
  const { data, error } = await supabase
    .from('prize_pools')
    .insert({
      draw_id: drawId,
      tier_5_pool: pools.tier_5_pool,
      tier_4_pool: pools.tier_4_pool,
      tier_3_pool: pools.tier_3_pool
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating prize pool record:', error.message);
    throw error;
  }

  return data;
};

/**
 * Get prize pool for a specific draw.
 */
const getPrizePoolForDraw = async (drawId) => {
  const { data, error } = await supabase
    .from('prize_pools')
    .select('*')
    .eq('draw_id', drawId)
    .single();

  if (error) {
    console.error('Error fetching prize pool:', error.message);
    return null;
  }

  return data;
};

module.exports = {
  calculatePrizePool,
  getRolloverJackpot,
  getActiveSubscriberCount,
  createPrizePoolRecord,
  getPrizePoolForDraw
};
