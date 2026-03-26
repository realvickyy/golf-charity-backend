const supabase = require('../lib/supabase');

const getCharities = async (req, res) => {
  try {
    const { search, featured } = req.query;

    let query = supabase.from('charities').select('*');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Get charities error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve charities.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      message: 'Charities retrieved.'
    });
  } catch (error) {
    console.error('GetCharities error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getFeaturedCharities = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('charities')
      .select('*')
      .eq('featured', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get featured charities error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve featured charities.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      message: 'Featured charities retrieved.'
    });
  } catch (error) {
    console.error('GetFeaturedCharities error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getCharityById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('charities')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Charity not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Charity retrieved.'
    });
  } catch (error) {
    console.error('GetCharityById error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const createCharity = async (req, res) => {
  try {
    const { name, description, image_url, website, featured, events } = req.body;

    const { data, error } = await supabase
      .from('charities')
      .insert({
        name,
        description: description || null,
        image_url: image_url || null,
        website: website || null,
        featured: featured || false,
        events: events || []
      })
      .select()
      .single();

    if (error) {
      console.error('Create charity error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to create charity.'
      });
    }

    return res.status(201).json({
      success: true,
      data,
      message: 'Charity created.'
    });
  } catch (error) {
    console.error('CreateCharity error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const updateCharity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image_url, website, featured, events } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (image_url !== undefined) updates.image_url = image_url;
    if (website !== undefined) updates.website = website;
    if (featured !== undefined) updates.featured = featured;
    if (events !== undefined) updates.events = events;

    const { data, error } = await supabase
      .from('charities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update charity error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to update charity.'
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Charity updated.'
    });
  } catch (error) {
    console.error('UpdateCharity error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const deleteCharity = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('charities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete charity error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to delete charity.'
      });
    }

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Charity deleted.'
    });
  } catch (error) {
    console.error('DeleteCharity error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const createContribution = async (req, res) => {
  try {
    const userId = req.user.id;
    const { charity_id, percentage } = req.body;

    // Check if contribution already exists for this user
    const { data: existing } = await supabase
      .from('charity_contributions')
      .select('id')
      .eq('user_id', userId)
      .single();

    let contribution;

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('charity_contributions')
        .update({
          charity_id,
          percentage: percentage || 10
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Update contribution error:', error.message);
        return res.status(500).json({
          success: false,
          data: null,
          message: 'Failed to update contribution.'
        });
      }
      contribution = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('charity_contributions')
        .insert({
          user_id: userId,
          charity_id,
          percentage: percentage || 10
        })
        .select()
        .single();

      if (error) {
        console.error('Create contribution error:', error.message);
        return res.status(500).json({
          success: false,
          data: null,
          message: 'Failed to create contribution.'
        });
      }
      contribution = data;
    }

    return res.status(201).json({
      success: true,
      data: contribution,
      message: 'Contribution saved.'
    });
  } catch (error) {
    console.error('CreateContribution error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

const getMyContributions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('charity_contributions')
      .select('*, charities(*)')
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Get contributions error:', error.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to retrieve contributions.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      message: 'Contributions retrieved.'
    });
  } catch (error) {
    console.error('GetMyContributions error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  getCharities,
  getFeaturedCharities,
  getCharityById,
  createCharity,
  updateCharity,
  deleteCharity,
  createContribution,
  getMyContributions
};
