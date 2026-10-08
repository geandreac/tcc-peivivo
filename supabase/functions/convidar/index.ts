// Edge Function convidar (R2.1, F1/F2/F4/F5, D-32): a coordenação convida
// docente, responsável ou profissional de saúde. O banco decide se ela pode
// (fn_preparar_convite com o JWT dela, aal2); o Auth envia o e-mail com o
// link de definir senha (uso único); o banco grava com service role.
import { convidar, type DadosConvite } from "../_shared/gerado/funcoes/index.ts";
import { rpc, servir } from "../_shared/http.ts";

const ORIGEM = Deno.env.get("ORIGEM_APP") ?? "http://localhost:5173";

servir("convidar", (corpo, { usuario, servico }) =>
  convidar(corpo, {
    preparar: (e: DadosConvite) =>
      rpc(usuario, "fn_preparar_convite", {
        p_escola: e.escolaId,
        p_email: e.email,
        p_papel: e.papel,
        p_estudante: e.estudanteId,
        p_registro_conselho: e.registroConselho,
        p_conferido_presencialmente: e.conferidoPresencialmente,
      }),
    convidarNoAuth: async (email) => {
      const { data, error } = await servico.auth.admin.inviteUserByEmail(email, { redirectTo: `${ORIGEM}/definir-senha?convite=1` });
      if (!error) return data.user.id;
      // conta já existe no Auth (convite anterior não aceito): registra sem reenviar
      if (error.status === 422 || /already/iu.test(error.message)) return null;
      throw error;
    },
    registrar: (r) =>
      rpc(servico, "fn_registrar_convite", {
        p_autor: r.autorId,
        p_auth_user: r.authUserId,
        p_nome: r.nome,
        p_email: r.email,
        p_escola: r.escolaId,
        p_papel: r.papel,
        p_estudante: r.estudanteId,
        p_registro_conselho: r.registroConselho,
        p_conferido_presencialmente: r.conferidoPresencialmente,
      }),
  }),
);
