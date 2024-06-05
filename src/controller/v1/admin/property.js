import RealtorProperties from '../../../models/v1/realtor/property.js';
import Realtor from '../../../models/v1/realtor/auth.js';
import { populateUserDetails } from '../../../daos/property-dao.js';
import { checkAdminStatus } from '../../../daos/superadmin-dao.js';

const getAllProperties = async (req, res) => {
  try {
    let { page = 1, limit = 10, q, state, country, propertyType } = req.query;
    let query = {};

    if (q) {
      query['$text'] = { $search: q, $language: 'en' };
    }

    if (state) {
      query.state = state;
    }
    if (country) {
      query.country = country;
    }
    if (propertyType) {
      query['property_details.property_type'] = propertyType;
    }

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;
    const properties = await RealtorProperties.find(query)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'user',
        select: 'first_name last_name phone_number',
      });
    const totalProperties = await RealtorProperties.countDocuments(query);
    res.status(200).json({
      properties,
      message: 'Properties fetched successfully',
      metadata: {
        totalProperties,
        totalPages: Math.ceil(totalProperties / limit),
        currentPage: page,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const getAllRealtors = async (req, res) => {
  try {
    const realtors = await Realtor.find({});
    res
      .status(200)
      .json({ realtors, message: 'Realtors fetched successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const getSingleProperty = async (req, res) => {
  const { id } = req.params;
  try {
    const prop = await RealtorProperties.findOne({ _id: id });
    if (!prop) {
      return res.status(404).json({ message: 'Property not found' });
    }
    const property = await populateUserDetails(prop);
    res
      .status(200)
      .json({ property, message: 'Property fetched successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const getSingleRealtor = async (req, res) => {
  const { id } = req.params;
  try {
    const realtor = await Realtor.findOne({ _id: id });
    if (!realtor) {
      return res.status(404).json({ message: 'Realtor not found' });
    }
    res.status(200).json({ realtor, message: 'Realtor fetched successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const deleteRealtor = async (req, res) => {
  const { id } = req.params;
  try {
    // only super admin can delete admin
    const result = await checkAdminStatus(req.user.role);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Unauthorized' });
    }

    const realtor = await Realtor.findByIdAndDelete(id);
    if (!realtor) {
      return res.status(404).json({ message: 'Realtor not found' });
    }
    res.status(result.code).json({ message: 'Realtor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const deleteProperty = async (req, res) => {
  const { id } = req.params;
  try {
    // only super admin can delete admin
    const result = await checkAdminStatus(req.user.role);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Unauthorized' });
    }
    const property = await RealtorProperties.findByIdAndDelete(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.status(result.code).json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const banRealtor = async (req, res) => {
  const { id } = req.params;
  try {
    // only super admin can ban admin
    const result = await checkAdminStatus(req.user.role);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Unauthorized' });
    }
    const realtor = await Realtor.findById(id);
    if (!realtor) {
      return res.status(404).json({ message: 'Realtor not found' });
    }
    realtor.isBanned = !realtor.isBanned;
    await realtor.save();
    res.status(result.code).json({
      message: `Realtor ${
        realtor.isBanned ? 'banned' : 'unbanned'
      } successfully`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const changePropertyStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    // only super admin can disable/enable property
    if (req.user.role !== 'superAdmin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (
      status !== 'rejected' &&
      status !== 'approved' &&
      status !== 'pending'
    ) {
      return res
        .status(401)
        .json({ message: 'Status value has to be rejected/approved/pending' });
    }
    const result = await checkAdminStatus(req.user.role);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Unauthorized' });
    }
    const property = await RealtorProperties.findById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    property.status = status;
    await property.save();
    res
      .status(result.code)
      .json({ message: `Property ${status} successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export {
  getAllProperties,
  getAllRealtors,
  getSingleProperty,
  getSingleRealtor,
  deleteRealtor,
  deleteProperty,
  banRealtor,
  changePropertyStatus,
};
