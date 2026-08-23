const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const fp = await prisma.floorplan.findFirst({
    include: { svgFile: true }
  });
  console.log(JSON.stringify(fp, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
