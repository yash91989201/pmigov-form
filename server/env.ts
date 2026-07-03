// Must be imported before any module that reads process.env.
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });
