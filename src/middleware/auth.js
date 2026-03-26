const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided.' 
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', decoded.id)
      .single();

    req.user.subscription_status = sub ? sub.status : 'inactive';
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }
};

module.exports = authMiddleware;
