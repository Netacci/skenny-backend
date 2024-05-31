import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import realtorAuthRoutes from './src/routes/realtor/realtor.js';

dotenv.config();
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
});
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(cors());

app.use('/api/auth', realtorAuthRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
