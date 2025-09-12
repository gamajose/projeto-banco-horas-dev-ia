const express = require("express");
const { body, validationResult } = require("express-validator");
const { isAuthenticated, requireStaff } = require("../middleware/auth");
const NotificationService = require("../notificationService");
const Profile = require("../models/Profile");
const User = require("../models/User");
const Department = require("../models/Department");
const Status = require("../models/Status");
const Movement = require("../models/Movement");
const MovementLog = require("../models/MovementLog");
const csv = require("fast-csv");
const PDFDocument = require("pdfkit");
const router = express.Router();

const db = require("../config/database");

router.use(isAuthenticated, requireStaff);

// Rota para a página de LISTAGEM de colaboradores
router.get("/colaboradores", async (req, res) => {
  try {
    const colaboradores = await Profile.findAll();
    let totalHorasPositivas = 0;
    let totalHorasNegativas = 0;

    // Itera sobre cada colaborador para calcular seu saldo
    for (const colab of colaboradores) {
      const balance = await Profile.calculateHourBalance(colab.id);
      colab.saldoPositivo = balance.positive;
      colab.saldoNegativo = balance.negative;
      colab.saldoTotal = balance.formatted;

      // Soma os minutos para o total geral
      totalHorasPositivas += parseFloat(balance.positive.replace('+', '').replace(':', '.')) * 60;
      totalHorasNegativas += parseFloat(balance.negative.replace('-', '').replace(':', '.')) * 60;
    }

    // Função para formatar o total de minutos para HH:MM
    const formatTotalMinutes = (mins) => {
        const hours = Math.floor(mins / 60).toString().padStart(2, '0');
        const minutes = Math.round(mins % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };
    
    const saldoGeral = totalHorasPositivas - totalHorasNegativas;
    const sign = saldoGeral < 0 ? "-" : "+";
    const absSaldoGeral = Math.abs(saldoGeral);
    
    const formattedTotalPositive = `+${formatTotalMinutes(totalHorasPositivas)}`;
    const formattedTotalNegative = `-${formatTotalMinutes(totalHorasNegativas)}`;
    const formattedTotalSaldo = `${sign}${formatTotalMinutes(absSaldoGeral)}`;


    res.render("admin/colaboradores", {
      title: "Gestão de Colaboradores",
      layout: "layouts/main",
      activePage: "colaboradores",
      user: req.user,
      userProfile: req.userProfile,
      colaboradores,
      totalHorasPositivas: formattedTotalPositive,
      totalHorasNegativas: formattedTotalNegative,
      saldoTotalHoras: formattedTotalSaldo,
    });
  } catch (error) {
    console.error("Erro ao carregar a lista de colaboradores:", error);
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
    const novoUsuario = await User.create({
      username,
      email,
      password,
      first_name,
      last_name,
      is_staff: false,
    });
    await Profile.create({
      nome: `${first_name} ${last_name}`,
      gerente: gerente === "true",
      ch_primeira,
      ch_segunda,
      setor_id: parseInt(setor_id),
      usuario_id: novoUsuario.id,
    });
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
      userProfile: req.userProfile,
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
      is_active,
    } = req.body;
    const profileData = {
      nome: `${first_name} ${last_name}`,
      gerente: gerente === "true",
      ch_primeira,
      ch_segunda,
      setor_id: parseInt(setor_id),
    };
    const perfilAtualizado = await Profile.update(profileId, profileData);
    const userData = {
      username,
      email,
      first_name,
      last_name,
      is_active: is_active === "true",
    };
    if (password) {
      userData.password = password;
    }
    await User.update(perfilAtualizado.usuario_id, userData);
    req.flash("success_msg", "Colaborador atualizado com sucesso!");
    res.redirect("/admin/colaboradores");
  } catch (error) {
    req.flash("error_msg", "Não foi possível atualizar o colaborador.");
    res.redirect(`/admin/colaboradores/editar/${req.params.id}`);
  }
});

// ROTA PARA ALTERAR O STATUS (ATIVO/INATIVO) DE UM COLABORADOR
router.patch("/colaboradores/:id/status", async (req, res) => {
  try {
    const profileId = req.params.id;
    const { isActive } = req.body;
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Perfil do colaborador não encontrado.",
      });
    }
    await User.update(profile.usuario_id, { is_active: isActive });
    res.json({ success: true, message: "Status atualizado com sucesso." });
  } catch (error) {
    console.error("Erro ao alterar status do colaborador:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro interno ao atualizar o status." });
  }
});

// Rota para a API de atividade recente
router.get("/api/recent-activity", requireStaff, async (req, res) => {
  try {
    const sql = `
        SELECT
            ml.id,
            ml.detalhes AS description,
            ml.created_at AS "createdAt",
            p.foto_url,
            p.nome AS user_name,
            d.nome AS department_name
        FROM
            movimentacoes_logs ml
        JOIN
            perfis p ON ml.usuario_id = p.id
        JOIN
            setores d ON p.setor_id = d.id
        ORDER BY
            ml.created_at DESC
        LIMIT 10;
    `;
    const result = await db.query(sql);
    const recentActivity = result.rows;
    res.status(200).json({ success: true, activities: recentActivity });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao carregar a atividade recente.",
    });
  }
});

router.get("/setores", async (req, res) => {
  try {
    const setores = await Department.findAll();
    res.render("admin/setores", {
      title: "Gestão de Setores",
      layout: "layouts/main",
      activePage: "setores",
      user: req.user,
      userProfile: req.userProfile, // CORRIGIDO: userProfile é passado
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
      userProfile: req.userProfile, // CORRIGIDO: userProfile é passado
      setor,
    });
  } catch (error) {
    req.flash("error_msg", "Não foi possível carregar a página de edição.");
    res.redirect("/admin/setores");
  }
});

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

router.get("/setores/novo", (req, res) => {
  res.render("admin/novo-setor", {
    title: "Adicionar Novo Setor",
    layout: "layouts/main",
    activePage: "setores",
    user: req.user,
    userProfile: req.userProfile, // CORRIGIDO: userProfile é passado
  });
});

router.post(
  "/setores",
  [body("nome").notEmpty().withMessage("O nome do setor é obrigatório.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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

router.get("/aprovacoes", async (req, res) => {
  try {
    const solicitacoesPendentes = await Movement.getPendingMovements();
    res.render("admin/aprovacoes", {
      title: "Aprovação de Solicitações",
      solicitacoes: solicitacoesPendentes,
      user: req.user,
      userProfile: req.userProfile,
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
    const statusAprovado = await Status.findByName("Aprovado");
    if (!statusAprovado) {
      return res.status(500).json({
        success: false,
        message: 'Status "Aprovado" não encontrado no sistema.',
      });
    }
    await Movement.update(movementId, { status_id: statusAprovado.id });
    if (req.userProfile) {
      await MovementLog.create({
        movimentacao_id: movementId,
        usuario_id: req.userProfile.id,
        acao: "APROVADO",
        detalhes: `Movimentação aprovada pelo administrador.`,
      });
    }

    const movement = await Movement.findById(movementId);
    const collaboratorProfile = await Profile.findById(movement.colaborador_id);
    await NotificationService.movementStatusToCollaborator(
      movement,
      collaboratorProfile,
      req.user,
      "Aprovada"
    );

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
    const statusRejeitado = await Status.findByName("Rejeitado");
    if (!statusRejeitado) {
      return res.status(500).json({
        success: false,
        message: 'Status "Rejeitado" não encontrado no sistema.',
      });
    }
    await Movement.update(movementId, { status_id: statusRejeitado.id });

    if (req.userProfile) {
      await MovementLog.create({
        movimentacao_id: movementId,
        usuario_id: req.userProfile.id,
        acao: "REJEITADO",
        detalhes: `Movimentação rejeitada pelo administrador.`,
      });
    }

    // Enviar notificação por e-mail
    const movement = await Movement.findById(movementId);
    const collaboratorProfile = await Profile.findById(movement.colaborador_id);
    await NotificationService.movementStatusToCollaborator(
      movement,
      collaboratorProfile,
      req.user,
      "Rejeitada"
    );

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
    const pendingMovements = await Movement.getPendingMovements();
    res.render("admin/pendentes", {
      title: "Analisar Solicitações Pendentes",
      pendingMovements,
      user: req.user,
      userProfile: req.userProfile, // CORRIGIDO: userProfile é passado
      layout: "layouts/main",
      activePage: "pendentes",
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
    res.json({ success: true, pendingMovements, stats });
  } catch (error) {
    console.error("Erro ao buscar dados para o dashboard via API:", error);
    res.status(500).json({ success: false, message: "Erro ao buscar dados." });
  }
});

router.get("/relatorios", async (req, res) => {
  try {
    const todosColaboradores = await Profile.findAll();
    const todosStatus = await Status.findAll();
    const todasMovimentacoes = await Movement.findAll();
    res.render("admin/relatorios", {
      title: "Relatórios",
      colaboradores: todosColaboradores,
      status: todosStatus,
      movimentacoes: todasMovimentacoes,
      activePage: "relatorios",
      user: req.user,
      userProfile: req.userProfile,
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

router.patch("/movimentacoes/aprovar-todas", async (req, res) => {
  try {
    const pendingStatus = await Status.findByName("Pendente");
    const approvedStatus = await Status.findByName("Aprovado"); // Nome do status corrigido

    if (!pendingStatus || !approvedStatus) {
      console.error("Erro: Status 'Pendente' ou 'Aprovado' não encontrado.");
      return res.status(500).json({
        success: false,
        message: 'Status "Pendente" ou "Aprovado" não encontrado.',
      });
    }

    const pendingMovements = await Movement.findAll({
      status_id: pendingStatus.id,
    });

    if (pendingMovements.length === 0) {
      return res.json({
        success: true,
        message: "Nenhuma solicitação pendente para aprovar.",
        approved: 0,
      });
    }

    for (const mov of pendingMovements) {
      await Movement.update(mov.id, { status_id: approvedStatus.id });

      if (req.userProfile) {
        await MovementLog.create({
          movimentacao_id: mov.id,
          usuario_id: req.userProfile.id,
          acao: "APROVADO",
          detalhes: `Movimentação aprovada em massa pelo administrador.`,
        });
      }
    }

    res.json({
      success: true,
      message: "Todas as solicitações pendentes foram aprovadas.",
      approved: pendingMovements.length,
    });
  } catch (error) {
    console.error("Erro detalhado ao aprovar todas as movimentações:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao processar as aprovações." });
  }
});

router.get("/api/relatorios", async (req, res) => {
    try {
        const movimentacoesFiltradas = await Movement.findAll(req.query);

        // Lógica para calcular os totais
        let totalHorasPositivas = 0;
        let totalHorasNegativas = 0;

        movimentacoesFiltradas.forEach(mov => {
            if (mov.status_nome === 'Aprovado') { // Apenas horas aprovadas contam para o saldo
                const [hours, minutes] = mov.hora_total.split(':').map(Number);
                const timeInMinutes = (hours * 60) + minutes;
                if (mov.entrada) {
                    totalHorasPositivas += timeInMinutes;
                } else {
                    totalHorasNegativas += timeInMinutes;
                }
            }
        });

        const formatTotalMinutes = (mins) => {
            const hours = Math.floor(mins / 60).toString().padStart(2, '0');
            const minutes = Math.round(mins % 60).toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        };

        const saldoGeral = totalHorasPositivas - totalHorasNegativas;
        const sign = saldoGeral < 0 ? "-" : "";
        const absSaldoGeral = Math.abs(saldoGeral);

        const summary = {
            totalHorasPositivas: `+${formatTotalMinutes(totalHorasPositivas)}`,
            totalHorasNegativas: `-${formatTotalMinutes(totalHorasNegativas)}`,
            saldoTotalHoras: `${sign}${formatTotalMinutes(absSaldoGeral)}`
        };

        res.json({ success: true, movimentacoes: movimentacoesFiltradas, summary: summary });
    } catch (error) {
        console.error("Erro ao filtrar relatórios via API:", error);
        res.status(500).json({ success: false, message: "Erro ao buscar dados." });
    }
});

router.get("/relatorios/exportar", async (req, res) => {
  try {
    const movimentacoes = await Movement.findAll(req.query);
    const filename = `relatorio_movimentacoes_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.write("\ufeff");
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
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        const doc = new PDFDocument({ margin: 30, size: "A4" });
        doc.pipe(res);
        
        doc.fontSize(16).text("Relatório Geral de Movimentações", { align: "center" });
        doc.moveDown();

        // Se um colaborador específico foi selecionado, adiciona o resumo
        if (req.query.colaborador_id && movimentacoes.length > 0) {
            const profileId = req.query.colaborador_id;
            const balance = await Profile.calculateHourBalance(profileId);
            
            doc.fontSize(12).font("Helvetica-Bold").text('Resumo de Horas Aprovadas (Período Filtrado)');
            doc.fontSize(10).font("Helvetica").text(`Total de Créditos: ${balance.positive} | Total de Débitos: ${balance.negative}`);
            doc.fontSize(10).font("Helvetica-Bold").text(`Saldo do Período: ${balance.formatted}`);
            doc.moveDown(2);
        }


        const tableTop = doc.y;
        const rowData = ["Colaborador", "Data", "Tipo", "Horas", "Status", "Motivo"];
        const colWidths = [100, 60, 50, 50, 70, 150];
        
        doc.fontSize(10).font("Helvetica-Bold");
        let currentX = 30;
        rowData.forEach((header, i) => {
            doc.text(header, currentX, tableTop);
            currentX += colWidths[i] + 5;
        });

        doc.font("Helvetica");
        let y = tableTop + 20;

        movimentacoes.forEach((mov) => {
            const row = [
                mov.colaborador_nome,
                new Date(mov.data_movimentacao).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                }),
                mov.entrada ? "Crédito" : "Débito",
                mov.hora_total,
                mov.status_nome,
                mov.motivo || ''
            ];

            let cellX = 30;
            row.forEach((cell, i) => {
                doc.text(cell.toString(), cellX, y, { width: colWidths[i], ellipsis: true });
                cellX += colWidths[i] + 5;
            });

            y += 20;
            if (y > 750) {
                doc.addPage();
                y = 50;
            }
        });

        doc.end();
    } catch (error) {
        console.error("Erro ao exportar PDF:", error);
        res.status(500).send("Não foi possível gerar o relatório em PDF.");
    }
});

module.exports = router;