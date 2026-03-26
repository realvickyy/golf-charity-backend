const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const { sendWelcomeEmail } = require('../services/emailService');

const SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

const setCookie = (res, token, rememberMe = false) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
  if (rememberMe) {
    options.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }
  res.cookie('token', token, options);
};

const signToken = (user, rememberMe = false) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? '30d' : '1d' }
  );
};

const register = async (req, res) => {
  try {
    const { full_name, email, password, charity_id, contribution_percentage } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'An account with this email already exists.'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert profile
    const { data: newUser, error: insertError } = await supabase
      .from('profiles')
      .insert({
        full_name,
        email,
        password_hash,
        role: 'user'
      })
      .select('id, email, full_name, role')
      .single();

    if (insertError) {
      console.error('Registration insert error:', insertError.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to create account.'
      });
    }

    // Create charity contribution if provided
    if (charity_id) {
      const { error: contribError } = await supabase
        .from('charity_contributions')
        .insert({
          user_id: newUser.id,
          charity_id,
          percentage: contribution_percentage || 10
        });

      if (contribError) {
        console.error('Charity contribution error:', contribError.message);
      }
    }

    // Sign JWT and set cookie
    const token = signToken(newUser);
    setCookie(res, token);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(newUser).catch(err => console.error('Welcome email error:', err));

    return res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role
      },
      message: 'Registration successful.'
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find profile by email
    const { data: user, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (findError || !user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid email or password.'
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid email or password.'
      });
    }

    // Sign JWT and set cookie
    const token = signToken(user, rememberMe);
    setCookie(res, token, rememberMe);

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      message: 'Login successful.'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Logged out'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User profile retrieved.'
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name } = req.body;

    if (!full_name || full_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Full name must be at least 2 characters.'
      });
    }

    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update({ full_name: full_name.trim() })
      .eq('id', req.user.id)
      .select('id, full_name, email, role, avatar_url, created_at')
      .single();

    if (error || !updatedUser) {
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to update profile.'
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile
};
