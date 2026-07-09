import { randomBytes } from "crypto";
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Adicione ao .env.local e à Vercel:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:contato@moveisunghero.com.br");
console.log(`CRON_SECRET=${randomBytes(24).toString("hex")}`);
