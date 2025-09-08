const express = require("express");
const { body, validationResult } = require("express-validator");
const { isAuthenticated, requireStaff } = require("../middleware/auth");
const Profile = require("../models/Profile");
const User = require("../models/User");
const Department = require("../models/Department");
const Status = require("../models/Status");
const Movement = require("../models/Movement");

const csv = require("fast-csv");
const PDFDocument = require("pdfkit");

const router = express.Router();

// Middleware para garantir que todas as rotas neste ficheiro são apenas para Admins
router.use(isAuthenticated, requireStaff);

// Rota para a página de LISTAGEM de colaboradores
router.get("/colaboradores", async (req, res) => {
  try {
    const colaboradores = await Profile.findAll();
    res.render("admin/colaboradores", {
      title: "Gestão de Colaboradores",
      layout: "layouts/main",
      activePage: "colaboradores",
      user: req.user,
      colaboradores,
    });
  } catch (error) {
    res.status(500).render("error", {
      title: "Erro",
      message: "Não foi possível carregar a lista de colaboradores.",
    });
  }
});

// Rota para MOSTRAR o formulário de novo colaborador
router.get("/colaboradores/novo", async (req, res) => {
  try {
    const setores = await Department.findAll();
    res.render("admin/novo-colaborador", {
      title: "Adicionar Colaborador",
      user: req.user,
      userProfile: req.userProfile,
      setores,
    });
  } catch (error) {
    console.error("Erro ao carregar o formulário de novo colaborador:", error);
    res.status(500).render("error", {
      title: "Erro de Servidor",
      message: "Não foi possível carregar o formulário.",
    });
  }
});

// Rota para PROCESSAR o formulário de novo colaborador
router.post("/colaboradores", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      setor_id,
      gerente,
      ch_primeira,
      ch_segunda,
    } = req.body;

    // 1. Criar o Usuário
    const novoUsuario = await User.create({
      username,
      email,
      password,
      first_name,
      last_name,
      is_staff: false, // Novos usuários não são admins por padrão
    });

    // 2. Criar o Perfil associado ao Usuário
    await Profile.create({
      nome: `${first_name} ${last_name}`,
      gerente: gerente === "true", // Converte string para booleano
      ch_primeira,
      ch_segunda,
      setor_id: parseInt(setor_id), // Converte para número
      usuario_id: novoUsuario.id,
    });

    // 3. Redirecionar para a lista de colaboradores com uma mensagem de sucesso
    res.redirect("/admin/colaboradores");
  } catch (error) {
    console.error("Erro ao criar novo colaborador:", error);
    res.status(500).render("error", {
      title: "Erro de Servidor",
      message: "Não foi possível criar o novo colaborador.",
    });
  }
});

// ROTA PARA MOSTRAR O FORMULÁRIO DE EDIÇÃO
router.get("/colaboradores/editar/:id", async (req, res) => {
  try {
    const profileId = req.params.id;
    const colaborador = await Profile.findById(profileId);
    const setores = await Department.findAll();

    if (!colaborador) {
      return res.status(404).render("error", {
        title: "Erro",
        message: "Colaborador não encontrado.",
      });
    }

    res.render("admin/editar-colaborador", {
      title: `Editar ${colaborador.first_name}`,
      layout: "layouts/main",
      activePage: "colaboradores",
      user: req.user,
      colaborador,
      setores,
    });
  } catch (error) {
    console.error("Erro detalhado ao carregar página de edição:", error);
    res.status(500).render("error", {
      title: "Erro",
      message: "Não foi possível carregar a página de edição.",
    });
  }
});

// ROTA PARA PROCESSAR A ATUALIZAÇÃO
router.post("/colaboradores/editar/:id", async (req, res) => {
    try {
        const profileId = req.params.id;
        const { username, email, password, first_name, last_name, setor_id, gerente, ch_primeira, ch_segunda, is_active } = req.body;
        const profileData = { nome: `${first_name} ${last_name}`, gerente: gerente === 'true', ch_primeira, ch_segunda, setor_id: parseInt(setor_id) };
        const perfilAtualizado = await Profile.update(profileId, profileData);
        const userData = { username, email, first_name, last_name, is_active: is_active === "true" };
        if (password) { userData.password = password; }
        await User.update(perfilAtualizado.usuario_id, userData);
        req.flash('success_msg', 'Colaborador atualizado com sucesso!');
        res.redirect("/admin/colaboradores");
    } catch (error) {
        req.flash('error_msg', 'Não foi possível atualizar o colaborador.');
        res.redirect(`/admin/colaboradores/editar/${req.params.id}`);
    }
});

// ROTA PARA ALTERAR O STATUS (ATIVO/INATIVO) DE UM COLABORADOR
router.patch("/colaboradores/:id/status", async (req, res) => {
  try {
    const profileId = req.params.id;
    const { isActive } = req.body; // Esperamos receber { isActive: true } ou { isActive: false }

    // O status 'is_active' pertence à tabela 'usuarios', não 'perfis'.
    // Portanto, primeiro encontramos o perfil para obter o ID do usuário.
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Perfil do colaborador não encontrado.",
      });
    }

    // Agora, atualizamos o usuário correspondente.
    await User.update(profile.usuario_id, { is_active: isActive });

    res.json({ success: true, message: "Status atualizado com sucesso." });
  } catch (error) {
    console.error("Erro ao alterar status do colaborador:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro interno ao atualizar o status." });
  }
});

// Rota para a página de LISTAGEM de setores
router.get("/setores", async (req, res) => {
  try {
    const setores = await Department.findAll();
    res.render("admin/setores", {
      title: "Gestão de Setores",
      layout: "layouts/main",
      activePage: "setores",
      user: req.user,
      setores,
    });
  } catch (error) {
    console.error("Erro ao carregar a página de setores:", error);
    res.status(500).render("error", {
      title: "Erro de Servidor",
      message: "Não foi possível carregar a lista de setores.",
    });
  }
});

// ROTA PARA MOSTRAR O FORMULÁRIO DE EDIÇÃO DE SETOR (GET)
router.get("/setores/:id/editar", async (req, res) => {
  try {
    const setor = await Department.findById(req.params.id);
    if (!setor) {
      req.flash("error_msg", "Setor não encontrado.");
      return res.redirect("/admin/setores");
    }
    res.render("admin/editar-setor", {
      title: `Editar Setor: ${setor.nome}`,
      layout: "layouts/main",
      activePage: "setores",
      user: req.user,
      setor,
    });
  } catch (error) {
    req.flash("error_msg", "Não foi possível carregar a página de edição.");
    res.redirect("/admin/setores");
  }
});

// ROTA PARA PROCESSAR A EDIÇÃO DE SETOR (POST)
router.post(
  "/setores/:id/editar",
  [body("nome").notEmpty().withMessage("O nome do setor é obrigatório.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("error_msg", errors.array()[0].msg);
      return res.redirect(`/admin/setores/${req.params.id}/editar`);
    }

    try {
      await Department.update(req.params.id, { nome: req.body.nome });
      req.flash("success_msg", "Setor atualizado com sucesso!");
      res.redirect("/admin/setores");
    } catch (error) {
      req.flash("error_msg", "Não foi possível atualizar o setor.");
      res.redirect("/admin/setores");
    }
  }
);

// ROTA PARA APAGAR UM SETOR (POST)
router.post("/setores/:id/apagar", async (req, res) => {
  try {
    const setor = await Department.findById(req.params.id);
    if (setor.colaborador_count > 0) {
      req.flash(
        "error_msg",
        "Não é possível apagar um setor que possui colaboradores."
      );
      return res.redirect("/admin/setores");
    }

    await Department.delete(req.params.id);
    req.flash("success_msg", "Setor apagado com sucesso!");
    res.redirect("/admin/setores");
  } catch (error) {
    req.flash("error_msg", "Não foi possível apagar o setor.");
    res.redirect("/admin/setores");
  }
});

// Rota para MOSTRAR o formulário de novo setor
router.get("/setores/novo", (req, res) => {
  res.render("admin/novo-setor", {
    title: "Adicionar Novo Setor",
    layout: "layouts/main",
    activePage: "setores",
    user: req.user,
  });
});

// Rota para PROCESSAR o formulário de novo setor
router.post(
  "/setores",
  [body("nome").notEmpty().withMessage("O nome do setor é obrigatório.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Lógica para lidar com erros de validação (pode ser adicionada depois)
      return res.redirect("/admin/setores/novo");
    }
    try {
      await Department.create({ nome: req.body.nome });
      res.redirect("/admin/setores");
    } catch (error) {
      console.error("Erro ao criar novo setor:", error);
      res.status(500).render("error", {
        title: "Erro de Servidor",
        message: "Não foi possível criar o novo setor.",
      });
    }
  }
);

// ROTA PARA A PÁGINA DEDICADA DE APROVAÇÃO DE FOLGAS
router.get("/aprovacoes", async (req, res) => {
  try {
    const solicitacoesPendentes = await Movement.getPendingMovements();
    res.render("admin/aprovacoes", {
      title: "Aprovação de Solicitações",
      solicitacoes: solicitacoesPendentes,
      user: req.user,
      layout: "layouts/main",
      activePage: "aprovacoes",
    });
  } catch (error) {
    console.error("Erro ao carregar a página de aprovações:", error);
    res.status(500).render("error", {
      title: "Erro",
      message: "Não foi possível carregar a página.",
    });
  }
});

router.patch("/movimentacoes/:id/aprovar", async (req, res) => {
  try {
    const movementId = req.params.id;
    const statusAprovado = await Status.findByName("Aprovado"); // Busca o ID do status 'Aprovado'
    if (!statusAprovado) {
      return res.status(500).json({
        success: false,
        message: 'Status "Aprovado" não encontrado no sistema.',
      });
    }

    await Movement.update(movementId, { status_id: statusAprovado.id });
    res.json({ success: true, message: "Movimentação aprovada com sucesso." });
  } catch (error) {
    console.error("Erro ao aprovar movimentação:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao aprovar movimentação." });
  }
});

router.patch("/movimentacoes/:id/rejeitar", async (req, res) => {
  try {
    const movementId = req.params.id;
    const statusRejeitado = await Status.findByName("Rejeitado"); // Busca o ID do status 'Rejeitado'
    if (!statusRejeitado) {
      return res.status(500).json({
        success: false,
        message: 'Status "Rejeitado" não encontrado no sistema.',
      });
    }

    await Movement.update(movementId, { status_id: statusRejeitado.id });
    res.json({ success: true, message: "Movimentação rejeitada com sucesso." });
  } catch (error) {
    console.error("Erro ao rejeitar movimentação:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao rejeitar movimentação." });
  }
});

router.get("/movimentacoes/pendentes", async (req, res) => {
  try {
    // Usamos o método que já existe no seu Model para buscar os dados
    const pendingMovements = await Movement.getPendingMovements();

    res.render("admin/pendentes", {
      title: "Analisar Solicitações Pendentes",
      pendingMovements, // Envia os dados para a página
      user: req.user,
      layout: "layouts/main",
      activePage: "pendentes", // Para manter o menu ativo, se desejar
    });
  } catch (error) {
    console.error(
      "Erro ao carregar a página de solicitações pendentes:",
      error
    );
    res.status(500).render("error", {
      title: "Erro",
      message: "Não foi possível carregar a página.",
    });
  }
});

router.get("/movimentacoes/pendentes/api", async (req, res) => {
  try {
    const pendingMovements = await Movement.getPendingMovements();
    res.json({ success: true, pendingMovements });
  } catch (error) {
    console.error("Erro ao buscar movimentações pendentes via API:", error);
    res.status(500).json({ success: false, message: "Erro ao buscar dados." });
  }
});

router.get("/api/dashboard-stats", async (req, res) => {
  try {
    const pendingMovements = await Movement.getPendingMovements();
    const stats = await Movement.getMovementStats();
    // Retorna os dados em formato JSON
    res.json({ success: true, pendingMovements, stats });
  } catch (error) {
    console.error("Erro ao buscar dados para o dashboard via API:", error);
    res.status(500).json({ success: false, message: "Erro ao buscar dados." });
  }
});

// ROTA PARA MOSTRAR A PÁGINA PRINCIPAL DE RELATÓRIOS (GET)
router.get("/relatorios", async (req, res) => {
  try {
    // Busca os dados iniciais para preencher os filtros
    const todosColaboradores = await Profile.findAll();
    const todosStatus = await Status.findAll();
    const todasMovimentacoes = await Movement.findAll(); // Carga inicial

    res.render("admin/relatorios", {
      title: "Relatórios",
      colaboradores: todosColaboradores,
      status: todosStatus,
      movimentacoes: todasMovimentacoes,
      activePage: "relatorios",
      user: req.user,
      layout: "layouts/main",
    });
  } catch (error) {
    console.error("Erro ao carregar a página de relatórios:", error);
    res.status(500).render("error", {
      title: "Erro",
      message: "Não foi possível carregar a página de relatórios.",
    });
  }
});

// ROTA DE API PARA BUSCAR DADOS FILTRADOS (GET)
router.get("/api/relatorios", async (req, res) => {
  try {
    // req.query contém os filtros enviados pelo JavaScript (ex: { status_id: '3', ... })
    const movimentacoesFiltradas = await Movement.findAll(req.query);
    res.json({ success: true, movimentacoes: movimentacoesFiltradas });
  } catch (error) {
    console.error("Erro ao filtrar relatórios via API:", error);
    res.status(500).json({ success: false, message: "Erro ao buscar dados." });
  }
});

//relatorio exporta csv
router.get("/relatorios/exportar", async (req, res) => {
  try {
    const movimentacoes = await Movement.findAll(req.query); // Usa os mesmos filtros da página

    const filename = `relatorio_movimentacoes_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    // Configura os cabeçalhos da resposta para forçar o download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.write("\ufeff");

    // Usa o fast-csv para formatar os dados e enviá-los
    const csvStream = csv.format({ headers: true });
    csvStream.pipe(res);

    if (movimentacoes.length > 0) {
      movimentacoes.forEach((mov) => {
        csvStream.write({
          Colaborador: mov.colaborador_nome,
          Setor: mov.setor_nome,
          Data: new Date(mov.data_movimentacao).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          }),
          Tipo: mov.entrada ? "Crédito" : "Débito",
          Horas: mov.hora_total,
          Status: mov.status_nome,
          Motivo: mov.motivo,
        });
      });
    }

    csvStream.end();
  } catch (error) {
    console.error("Erro ao exportar relatório:", error);
    res.status(500).send("Não foi possível gerar o relatório.");
  }
});

router.get("/relatorios/exportar-pdf", async (req, res) => {
  try {
    const movimentacoes = await Movement.findAll(req.query);
    const filename = `relatorio_${new Date().toISOString().split("T")[0]}.pdf`;

    // Configura os cabeçalhos para forçar o download do PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Cria um novo documento PDF
    const doc = new PDFDocument({ margin: 30, size: "A4" });
    doc.pipe(res);

    // Cabeçalho do Documento
    doc.fontSize(16).text("Relatório de Movimentações", { align: "center" });
    doc.moveDown();

    // Cabeçalhos da Tabela
    const tableTop = 100;
    const rowData = ["Colaborador", "Data", "Tipo", "Horas", "Status"];

    // Função para desenhar a tabela
    const drawTable = (data) => {
      let y = tableTop;
      const rowHeight = 20;
      const colWidths = [120, 70, 50, 50, 80];

      // Desenha o cabeçalho
      doc.fontSize(10).font("Helvetica-Bold");
      rowData.forEach((header, i) => {
        doc.text(
          header,
          30 + (i > 0 ? colWidths.slice(0, i).reduce((a, b) => a + b) : 0),
          y
        );
      });
      doc.font("Helvetica");
      y += rowHeight;

      // Desenha as linhas de dados
      data.forEach((mov) => {
        const row = [
          mov.colaborador_nome,
          new Date(mov.data_movimentacao).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          }),
          mov.entrada ? "Crédito" : "Débito",
          mov.hora_total,
          mov.status_nome,
        ];

        row.forEach((cell, i) => {
          doc.text(
            cell,
            30 + (i > 0 ? colWidths.slice(0, i).reduce((a, b) => a + b) : 0),
            y,
            { width: colWidths[i], ellipsis: true }
          );
        });
        y += rowHeight;
        if (y > 750) {
          // Cria uma nova página se o conteúdo for muito grande
          doc.addPage();
          y = tableTop;
        }
      });
    };

    drawTable(movimentacoes);

    // Finaliza o PDF
    doc.end();
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    res.status(500).send("Não foi possível gerar o relatório em PDF.");
  }
});

module.exports = router;
