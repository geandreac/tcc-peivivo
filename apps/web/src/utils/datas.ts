const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtLonga = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

const paraDate = (iso: string) => (iso.length === 10 ? new Date(iso + "T12:00:00") : new Date(iso));

export const formatarData = (iso: string | null | undefined) => (iso ? fmtData.format(paraDate(iso)) : "—");
export const formatarDataHora = (iso: string | null | undefined) => (iso ? fmtDataHora.format(paraDate(iso)) : "—");
export const formatarDataLonga = (iso: string | null | undefined) => (iso ? fmtLonga.format(paraDate(iso)) : "—");

export function idade(dataNascimento: string): number {
  const n = paraDate(dataNascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) anos--;
  return anos;
}

export function segundos(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}
