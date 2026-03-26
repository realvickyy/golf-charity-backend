const supabase = require('../lib/supabase');
const { getPrizePoolForDraw } = require('./prizePool');

/**
 * Generate N unique random numbers within a range [min, max].
 */
const generateUniqueNumbers = (count, min, max) => {
  const numbers = new Set();
  while (numbers.size < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    numbers.add(num);
  }
  return Array.from(numbers).sort((a, b) => a - b);
};

/**
 * Count how many numbers in playerNumbers match the winningNumbers.
 */
const countMatches = (playerNumbers, winningNumbers) => {
  const winSet = new Set(winningNumbers);
  let matched = 0;
  for (const num of playerNumbers) {
    if (winSet.has(num)) {
      matched++;
    }
  }
  return matched;
};

/**
 * Get all active subscribers with their latest 5 scores.
 */
const getActiveSubscribersWithScores = async () => {
  // Get all active subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active');

  if (subError) {
    console.error('Error fetching active subscriptions:', subError.message);
    throw subError;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return [];
  }

  const userIds = subscriptions.map(s => s.user_id);
  const subscribersWithScores = [];

  for (const userId of userIds) {
    const { data: scores, error: scoreError } = await supabase
      .from('scores')
      .select('score')
      .eq('user_id', userId)
      .order('played_date', { ascending: false })
      .limit(5);

    if (scoreError) {
      console.error(`Error fetching scores for user ${userId}:`, scoreError.message);
      continue;
    }

    subscribersWithScores.push({
      user_id: userId,
      numbers: scores ? scores.map(s => s.score) : []
    });
  }

  return subscribersWithScores;
};

/**
 * Run the full draw simulation.
 * 1. Generate 5 unique winning numbers (1–45)
 * 2. Get all active subscribers with scores
 * 3. Compare each subscriber's scores against winning numbers
 * 4. Create draw_entries for everyone
 * 5. Determine winners (matched >= 3)
 * 6. Calculate prizes per tier
 * 7. Handle jackpot rollover if no 5-match winner
 * 8. Insert winners into winners table
 * 9. Update draw with winning_numbers and status = 'simulated'
 */
const simulateDraw = async (drawId, mode = 'random') => {
  let winningNumbers;

  if (mode === 'algorithmic') {
    // Algorithmic: use most frequently occurring 
    // scores across all users as winning numbers
    const { data: allScores } = await supabase
      .from('scores')
      .select('score');
    
    // Count frequency of each score
    const frequency = {};
    if (allScores) {
      allScores.forEach(({ score }) => {
        frequency[score] = (frequency[score] || 0) + 1;
      });
    }
    
    // Sort by frequency descending, take top 5
    winningNumbers = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([score]) => parseInt(score));
    
    // Pad with random numbers if less than 5 unique scores
    while (winningNumbers.length < 5) {
      const rand = Math.floor(Math.random() * 45) + 1;
      if (!winningNumbers.includes(rand)) {
        winningNumbers.push(rand);
      }
    }
  } else {
    // Random mode: standard lottery style
    winningNumbers = generateUniqueNumbers(5, 1, 45);
  }

  // Step 2: Get all active subscribers with their latest 5 scores
  const subscribers = await getActiveSubscribersWithScores();

  if (subscribers.length === 0) {
    throw new Error('No active subscribers found for draw simulation');
  }

  // Step 3 & 4: Compare and create draw entries
  const entries = [];
  const winnerCandidates = [];

  for (const subscriber of subscribers) {
    const matched = countMatches(subscriber.numbers, winningNumbers);

    const entry = {
      draw_id: drawId,
      user_id: subscriber.user_id,
      numbers: subscriber.numbers,
      matched: matched
    };

    entries.push(entry);

    if (matched >= 3) {
      winnerCandidates.push({
        user_id: subscriber.user_id,
        matched: matched,
        tier: matched
      });
    }
  }

  // Insert all draw entries
  const { error: entryError } = await supabase
    .from('draw_entries')
    .insert(entries);

  if (entryError) {
    console.error('Error inserting draw entries:', entryError.message);
    throw entryError;
  }

  // Step 5–6: Get prize pool and calculate prizes
  const prizePool = await getPrizePoolForDraw(drawId);

  if (!prizePool) {
    throw new Error('Prize pool not found for this draw');
  }

  const tier5Winners = winnerCandidates.filter(w => w.matched === 5);
  const tier4Winners = winnerCandidates.filter(w => w.matched === 4);
  const tier3Winners = winnerCandidates.filter(w => w.matched === 3);

  const tier5Prize = tier5Winners.length > 0
    ? parseFloat((prizePool.tier_5_pool / tier5Winners.length).toFixed(2))
    : 0;
  const tier4Prize = tier4Winners.length > 0
    ? parseFloat((prizePool.tier_4_pool / tier4Winners.length).toFixed(2))
    : 0;
  const tier3Prize = tier3Winners.length > 0
    ? parseFloat((prizePool.tier_3_pool / tier3Winners.length).toFixed(2))
    : 0;

  // Step 7: Handle jackpot rollover
  let jackpotRollover = false;
  let jackpotAmount = 0;

  if (tier5Winners.length === 0) {
    jackpotRollover = true;
    jackpotAmount = prizePool.tier_5_pool;
  }

  // Step 8: Insert all winners
  const winnersToInsert = [];

  for (const w of tier5Winners) {
    winnersToInsert.push({
      draw_id: drawId,
      user_id: w.user_id,
      tier: 5,
      prize_amount: tier5Prize,
      verification_status: 'pending',
      payout_status: 'pending'
    });
  }

  for (const w of tier4Winners) {
    winnersToInsert.push({
      draw_id: drawId,
      user_id: w.user_id,
      tier: 4,
      prize_amount: tier4Prize,
      verification_status: 'pending',
      payout_status: 'pending'
    });
  }

  for (const w of tier3Winners) {
    winnersToInsert.push({
      draw_id: drawId,
      user_id: w.user_id,
      tier: 3,
      prize_amount: tier3Prize,
      verification_status: 'pending',
      payout_status: 'pending'
    });
  }

  if (winnersToInsert.length > 0) {
    const { error: winnerError } = await supabase
      .from('winners')
      .insert(winnersToInsert);

    if (winnerError) {
      console.error('Error inserting winners:', winnerError.message);
      throw winnerError;
    }
  }

  // Step 9: Update draw status and winning numbers
  const { error: drawUpdateError } = await supabase
    .from('draws')
    .update({
      status: 'simulated',
      winning_numbers: winningNumbers,
      jackpot_rollover: jackpotRollover,
      jackpot_amount: jackpotAmount
    })
    .eq('id', drawId);

  if (drawUpdateError) {
    console.error('Error updating draw:', drawUpdateError.message);
    throw drawUpdateError;
  }

  return {
    winning_numbers: winningNumbers,
    total_entries: entries.length,
    winners: winnersToInsert.map(w => ({
      user_id: w.user_id,
      tier: w.tier,
      prize_amount: w.prize_amount
    })),
    jackpot_rollover: jackpotRollover
  };
};

module.exports = {
  generateUniqueNumbers,
  countMatches,
  getActiveSubscribersWithScores,
  simulateDraw
};
