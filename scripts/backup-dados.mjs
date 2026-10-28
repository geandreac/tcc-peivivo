// Backup só dos DADOS do projeto Supabase linkado (o schema já está nas migrations).
// Grava em backups/dados-AAAA-MM-DD-HHMM.sql — pasta ignorada pelo git: o arquivo tem
// dados de pessoas (LGPD); guarde-o fora do repositório, num local com acesso restrito.
// Uso: npm run db:backup   (exige `npx supabase link` feito e pede a senha do banco)
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const agora = new Date();
const dois = (n) => String(n).padStart(2, "0");
const carimbo = `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}-${dois(agora.getHours())}${dois(agora.getMinutes())}`;
const arquivo = `backups/dados-${carimbo}.sql`;

mkdirSync("backups", { recursive: true });
const r = spawnSync("npx", ["supabase", "db", "dump", "--linked", "--data-only", "-f", arquivo], { stdio: "inherit", shell: true });
if (r.status !== 0) {
  console.error("Backup falhou (projeto linkado? senha do banco?). Nada foi apagado.");
  process.exit(r.status ?? 1);
}
console.log(`OK ${arquivo} — mova para um local seguro fora do repositório.`);
