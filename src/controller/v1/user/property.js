import { populateUserDetails } from '../../../daos/property-dao.js';
import Realtor from '../../../models/v1/realtor/auth.js';
import RealtorProperties from '../../../models/v1/realtor/property.js';
import { sendEmail } from '../../../utils/emails.js';

/**
 * Retrieves all approved properties from the database based on the provided query parameters.
 *
 * @param {Object} req - The request object containing query parameters.
 * @param {Object} res - The response object.
 * @return {Promise<void>} - A promise that resolves when the properties are fetched and sent as a response.
 *                          - The response includes the fetched properties, a success message, and metadata about the properties.
 * @throws {Error} - If an error occurs while fetching the properties, the error message is sent as a response.
 */

const getAllProperties = async (req, res) => {
  try {
    // Limits retrieved properties to 10 per page when no limit is passed
    let { page = 1, limit = 10, q, state, country, propertyType } = req.query;
    let query = { status: 'approved' };

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
      .limit(limit);
    const totalProperties = await RealtorProperties.countDocuments({
      status: 'approved',
    });
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
/**
 * Retrieves a single property by its ID from the database.
 *
 * @param {Object} req - The request object containing the ID of the property.
 * @param {Object} res - The response object used to send the property data or an error message.
 * @return {Promise<void>} - Returns a promise that resolves when the property data is sent or an error message is sent.
 */
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

const leaseProperty = async (req, res) => {
  const { id } = req.params;
  try {
    const prop = await RealtorProperties.findById(id);
    const realtor = await Realtor.findById(prop.user);

    if (!realtor) return res.status(404).json({ message: 'Realtor not found' });
    if (!prop) return res.status(404).json({ message: 'Property not found' });

    // let tenantImageData = null;
    // if (req.body.tenantImage) {
    //   const featImage = JSON.parse(req.body.tenantImage);
    //   tenantImageData = featImage?.public_id
    //     ? await moveToPermamentFolder(featImage.public_id)
    //     : featImage;
    // }

    const tenancyRequest = {
      ...req.body,
      // tenantImage: tenantImageData,
    };

    // Push new request into property tenancyRequests array
    prop.tenancyRequests.push(tenancyRequest);
    await prop.save();

    const dashboardLink =
      process.env.NODE_ENV === 'production'
        ? 'https://fkglobalproperties.com/login'
        : 'http://localhost:5174/login';

    const subject = `New Tenancy Request – ${prop.property_name}`;
    const email = realtor.email;
    const tenantEmail = req.body.email;

    await sendEmail(
      email,
      'lease-request',
      subject,
      {
        realtor_name: realtor.first_name,
        property_name: prop.property_name,
        dashboard_link: dashboardLink,
        // spread all tenant fields directly so the template can access them by name
        ...req.body,
      },
      { replyTo: tenantEmail }
    );

    res.status(200).json({
      message: 'Lease request submitted successfully',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
    logger.error(err);
  }
};

export { getAllProperties, getSingleProperty, leaseProperty };
