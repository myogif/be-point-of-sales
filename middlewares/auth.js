import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseClient.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log('Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', { userId: decoded.userId, username: decoded.username });
    
    // Verify user exists in database
    console.log('Checking user in database...');
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error) {
      console.error('Database error when checking user:', error);
      return res.status(403).json({ error: 'Invalid token' });
    }

    if (!user) {
      console.log('User not found in database');
      return res.status(403).json({ error: 'Invalid token' });
    }

    console.log('User authenticated successfully:', user.username);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token format' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error', details: error.message });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};