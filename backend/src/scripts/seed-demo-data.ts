import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import mongoose, { Types } from 'mongoose';
import { OrderSchema, OrderStatus } from '../modules/orders/schemas/order.schema';
import { PaymentType, SaleSchema } from '../modules/sales/schemas/sale.schema';
import { UserSchema } from '../modules/users/schemas/user.schema';

function loadLocalEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function daysAgo(days: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return date;
}

function phone(index: number) {
  return `+99890${String(1000000 + index).slice(1)}`;
}

const names = [
  'Abdusamad', 'Eldor Alijonov', 'Dinora', 'Madina', 'Aziza', 'Jamshid', 'Sardor', 'Nilufar',
  'Diyor', 'Shahnoza', 'Jasur', 'Mohira', 'Bekzod', 'Gulnoza', 'Oybek', 'Malika',
];

const flowers = [
  'Atirgul buketi', 'Piona gul dasta', 'Lola guldasta', 'Orkideya kompozitsiya',
  'Tugilgan kun buketi', 'Nikoh guldastasi', 'Premium savat', 'Mini bouquet',
];

const products = ['Atir', 'Shokolad', 'Ayiqcha', 'Sovga qutisi', 'Sharlar', 'Parfyum', 'Tort', 'Premium box'];
const statuses: OrderStatus[] = ['new', 'in_progress', 'ready', 'picked_up', 'cancelled'];
const payments: PaymentType[] = ['cash', 'card', 'click', 'payme', 'debt'];

async function seed() {
  loadLocalEnv();
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinora_gullari';
  await mongoose.connect(uri);

  const User = mongoose.model('User', UserSchema);
  const Order = mongoose.model('Order', OrderSchema);
  const Sale = mongoose.model('Sale', SaleSchema);
  const admin = await User.findOne().select('_id').lean<{ _id: Types.ObjectId }>().exec();
  const createdBy = admin?._id || new Types.ObjectId();

  const now = new Date();
  const batchId = `demo-${now.toISOString()}`;
  const orders = Array.from({ length: 125 }, (_, index) => {
    const amount = 80000 + (index % 12) * 25000;
    const prepaidAmount = index % 4 === 0 ? Math.floor(amount * 0.45) : amount;
    const createdAt = daysAgo(index % 45, 9 + (index % 9));
    const pickupDate = new Date(createdAt);
    pickupDate.setDate(pickupDate.getDate() + (index % 7));

    return {
      customerName: names[index % names.length],
      phone: phone(index),
      telegramPhone: phone(index),
      orderText: `${flowers[index % flowers.length]} - demo test ${index + 1}`,
      totalAmount: amount,
      prepaidAmount,
      debtAmount: Math.max(amount - prepaidAmount, 0),
      pickupDate,
      status: statuses[index % statuses.length],
      note: batchId,
      isTelegramNotified: index % 3 === 0,
      payments: [],
      createdBy,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const sales = Array.from({ length: 35 }, (_, index) => {
    const amount = 50000 + (index % 10) * 20000;
    const paidAmount = index % 5 === 0 ? Math.floor(amount * 0.5) : amount;
    const createdAt = daysAgo(index % 35, 11 + (index % 7));

    return {
      productName: `${products[index % products.length]} demo ${index + 1}`,
      customerName: names[(index + 4) % names.length],
      phone: index % 3 === 0 ? '' : phone(300 + index),
      telegramPhone: phone(300 + index),
      amount,
      paidAmount,
      debtAmount: Math.max(amount - paidAmount, 0),
      costPrice: Math.floor(amount * 0.55),
      profit: paidAmount,
      paymentType: payments[index % payments.length],
      note: batchId,
      payments: [],
      createdBy,
      createdAt,
      updatedAt: createdAt,
    };
  });

  await Order.collection.insertMany(orders);
  await Sale.collection.insertMany(sales);

  console.log(`Demo data added: ${orders.length} orders, ${sales.length} gift/product sales`);
  console.log(`Batch note: ${batchId}`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
