import { config } from 'dotenv';
config({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = '0909090909';
  const password = 'admin123*';
  const name = 'admin';

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { phone },
    update: {
      password: hashedPassword,
      name: name,
      role: 'ADMIN',
    },
    create: {
      phone,
      name,
      password: hashedPassword,
      role: 'ADMIN',
      referralCode: 'ADMIN_' + Date.now().toString(36),
    },
  });

  console.log(`[SEED] Admin account ensured: ${admin.phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
