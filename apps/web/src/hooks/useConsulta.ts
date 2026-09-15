import { useCallback, useEffect, useRef, useState } from "react";

const normalizar = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

/**
 * Estado explícito de uma consulta assíncrona: carregando · erro · dados.
 * Toda tela renderiza os quatro estados (carregando / vazio / sucesso / erro)
 * a partir daqui — heurística 1 de Nielsen e WCAG 4.1.3.
 */
export interface Consulta<T> {
  dados: T | null;
  carregando: boolean;
  erro: Error | null;
  recarregar: () => void;
  /** Atualiza os dados localmente (após uma mutação) sem nova requisição. */
  definir: (dados: T) => void;
}

export function useConsulta<T>(fn: () => Promise<T>, deps: unknown[] = []): Consulta<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);
  const [versao, setVersao] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    fnRef
      .current()
      .then((r) => {
        if (ativo) setDados(r);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(normalizar(e));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const definir = useCallback((d: T) => setDados(d), []);

  return { dados, carregando, erro, recarregar, definir };
}

/** Estado de uma mutação (submit). */
export interface Mutacao<A extends unknown[], R> {
  executar: (...args: A) => Promise<R | undefined>;
  ocupado: boolean;
  erro: Error | null;
  limparErro: () => void;
}

export function useMutacao<A extends unknown[], R>(fn: (...args: A) => Promise<R>): Mutacao<A, R> {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<Error | null>(null);

  const executar = useCallback(
    async (...args: A) => {
      setOcupado(true);
      setErro(null);
      try {
        return await fn(...args);
      } catch (e) {
        setErro(normalizar(e));
        return undefined;
      } finally {
        setOcupado(false);
      }
    },
    [fn]
  );

  return { executar, ocupado, erro, limparErro: () => setErro(null) };
}
