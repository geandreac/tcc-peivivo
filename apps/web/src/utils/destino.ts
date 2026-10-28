/**
 * Destino depois do login (`location.state.de`, gravado pela RotaProtegida).
 * Só aceita caminho interno do app: começa com "/", não é "//outro-host" nem
 * tem barra invertida (o open redirect corrigido no react-router 7.17.1 usava
 * "\\"), e não volta para as próprias telas de entrada.
 */
export function destinoInterno(estado: unknown, padrao = "/painel"): string {
  const de = (estado as { de?: unknown } | null)?.de;
  if (typeof de !== "string" || !de.startsWith("/") || de.startsWith("//") || de.includes("\\") || de.startsWith("/entrar")) return padrao;
  return de;
}
