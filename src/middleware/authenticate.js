import jwt from 'jsonwebtoken';
import Realtor from '../models/auth/realtor.js';

const authenticate = async (req, res, next) => {
  console.log(req);
  try {
    const authorization = req.headers.authorization;
    if (authorization === undefined) {
      return res.status(401).send({ message: 'Token needed' });
    }
    const [bearer, token] = authorization?.split(' ');

    if (bearer !== 'Bearer' && bearer !== undefined) {
      return res.status(401).send({ message: 'Malformed Header' });
    }
    if (token === undefined || token === '') {
      return res.status(401).send({ message: 'No token provided' });
    }

    const { email, _id } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await Realtor.findOne({
      email,
      _id,
      'auth.token': token,
    });

    if (!user) {
      return res.status(401).send({ message: 'Authentication failed' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: err.message });
  }
};

export default authenticate;
