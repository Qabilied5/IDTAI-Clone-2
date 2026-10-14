// Pemakaian: node scripts/hash-password.mjs "PasswordAnda123"
import bcrypt from "bcryptjs";

const pwd = process.argv[2];
if (!pwd) {
  console.error('Pemakaian: node scripts/hash-password.mjs "password"');
  process.exit(1);
}
console.log(await bcrypt.hash(pwd, 12));
