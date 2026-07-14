import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { UserSchema } from '../modules/users/schemas/user.schema';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinora_gullari';
  await mongoose.connect(uri);
  const User = mongoose.model('User', UserSchema);
  const email = process.env.ADMIN_EMAIL || 'admin@dinora.uz';
  const phone = process.env.ADMIN_PHONE || '+998901234567';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  await User.findOneAndUpdate(
    { email },
    {
      fullName: 'Dinora Admin',
      email,
      phone,
      password: await bcrypt.hash(password, 10),
      role: 'admin',
    },
    { upsert: true, new: true },
  );

  await mongoose.disconnect();
  console.log(`Demo admin ready: ${email} / ${password}`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
