import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import logger from './src/utils/logger.js';
import morgan from 'morgan';
import morganMiddleware from './src/middleware/morgan.middleware.js';
import realtorAuthRoutes from './src/routes/v1/realtor/auth.js';
import propertyRoutes from './src/routes/v1/realtor/property.js';
import publicRoutes from './src/routes/v1/user/property.js';
import adminAuthRoutes from './src/routes/v1/admin/auth.js';
import adminRoutes from './src/routes/v1/admin/property.js';

dotenv.config();
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    // console.log('Connected to MongoDB');
    logger.info('Connected to MongoDB');
  })
  .catch((err) => {
    // console.log(`Error connecting to MongoDB: ${err}`);
    logger.error(`Error connecting to MongoDB: ${err}`);
  });
const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morganMiddleware);
const corsOptions = {
  origin: 'http://localhost:5173' || 'https://www.skenny.org',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'Access-Control-Allow-Credentials',
  ],
};
app.use(cors(corsOptions));

app.use('/api/v1/auth', realtorAuthRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/users', publicRoutes);
app.use('/api/v1/admin/auth', adminAuthRoutes);
app.use('/api/v1/admin', adminRoutes);

app.listen(process.env.PORT, () => {
  // console.log(`Server is running on port ${process.env.PORT}`);
  logger.info(`Server is running on port ${process.env.PORT}`);
});
