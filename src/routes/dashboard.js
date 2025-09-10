const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const Movement = require('../models/Movement');
const Department = require('../models/Department');
const User = require('../models/User');
const Profile = require('../models/Profile');
const MovementLog = require('../models/MovementLog');
const PDFDocument = require("pdfkit");

const router = express.Router();

router.get('/', (req, res) => {
    if (req.cookies.token) {
        res.redirect('/dashboard');
    } else {
        // Redireciona para a rota de login padrão.
        res.redirect('/auth/login');
    }
});
// Dashboard principal
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    if (!req.user.is_staff) {
      return res.redirect('/meu-perfil');
    }

    const stats = await Movement.getMovementStats();
    const pendingMovements = await Movement.getPendingMovements();
    const recentMovements = await Movement.findAll({ limit: 5 });
    const departmentStats = await Department.getDepartmentStats();
    const allUsers = await User.findAll();
    const totalUsers = allUsers.length;

    res.render('dashboard/index', {
      title: 'Dashboard do Administrador',
      user: req.user,
      userProfile: req.userProfile || {},
      stats,
      pendingMovements,
      recentMovements,
      departmentStats,
      totalUsers,
      activePage: 'dashboard'
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).render('error', {
      layout: 'layouts/main',
      title: 'Erro no Servidor',
      message: 'Não foi possível carregar o dashboard.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Página do perfil do usuário
router.get('/meu-perfil', isAuthenticated, async (req, res) => {
  try {
    if (!req.userProfile) {
      return res.status(404).render('error', {
        layout: 'layouts/main',
        title: 'Perfil não encontrado',
        message: 'O seu usuário não possui um perfil de funcionário associado.',
        user: req.user,
        userProfile: null,
        error: {}
      });
    }

    const profileStats = await Profile.getProfileStats(req.userProfile.id);
    const hourBalance = await Profile.calculateHourBalance(req.userProfile.id);
    const recentMovements = await Movement.getMovementsByProfile(req.userProfile.id, { limit: 10 });

        // Lógica para adicionar o nome do aprovador/rejeitador
    for (const mov of recentMovements) {
        if (mov.status_nome !== 'Pendente') { // Se o status não for 'Pendente'
            const logs = await MovementLog.findByMovementId(mov.id);
            if (logs.length > 0) {
                const approvalLog = logs.find(l => l.acao === 'APROVADO' || l.acao === 'REJEITADO');
                if (approvalLog) {
                    mov.aprovado_por = approvalLog.perfil_nome;
                }
            }
        }
    }

    res.render('collaborator/home', {
      title: 'Meu Perfil',
      user: req.user,
      userProfile: req.userProfile,
      profileStats,
      hourBalance,
      recentMovements,
      layout: 'layouts/collaborator',
      activePage: 'home'
    });
  } catch (error) {
    console.error('Erro ao carregar a página de perfil:', error);
    res.status(500).render('error', {
      layout: 'layouts/main',
      title: 'Erro no Servidor',
      message: 'Não foi possível carregar a sua página de perfil.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Rota para a página de relatórios do colaborador
router.get("/meu-perfil/relatorios", isAuthenticated, async (req, res) => {
    try {
        const todosStatus = await Status.findAll();
        res.render("collaborator/relatorios", {
            title: "Meus Relatórios",
            user: req.user,
            userProfile: req.userProfile,
            layout: "layouts/collaborator",
            activePage: "relatorios",
            status: todosStatus,
        });
    } catch (error) {
        console.error("Erro ao carregar a página de relatórios do colaborador:", error);
        res.status(500).render("error", {
            layout: "layouts/main",
            title: "Erro no Servidor",
            message: "Não foi possível carregar a página de relatórios.",
            error: process.env.NODE_ENV === "development" ? error : {},
        });
    }
});

// Rota para exportar o relatório do colaborador em PDF
router.get("/meu-perfil/relatorios/exportar-pdf", isAuthenticated, async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        const profileId = req.userProfile.id;

        const filters = { profile_id: profileId, from_date: startDate, to_date: endDate, status_id: status };
        
        const movimentacoes = await Movement.findAll(filters);

        const filename = `relatorio_movimentacoes_${new Date().toISOString().split("T")[0]}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 30, size: "A4" });
        doc.pipe(res);

        doc.fontSize(16).text("Relatório de Movimentações", { align: "center" });
        doc.fontSize(12).text(`Colaborador: ${req.userProfile.nome}`, { align: "center" });
        doc.moveDown();

        const tableTop = 100;
        const rowData = ["Data", "Tipo", "Horas", "Status", "Motivo"];
        const colWidths = [70, 50, 50, 80, 200];
        
        // Desenha o cabeçalho da tabela
        doc.fontSize(10).font("Helvetica-Bold");
        let currentX = 30;
        rowData.forEach((header, i) => {
            doc.text(header, currentX, tableTop);
            currentX += colWidths[i] + 10;
        });

        doc.font("Helvetica");
        let y = tableTop + 20;

        movimentacoes.forEach((mov) => {
            const row = [
                new Date(mov.data_movimentacao).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
                mov.entrada ? "Crédito" : "Débito",
                mov.hora_total.substring(0, 5),
                mov.status_nome,
                mov.motivo,
            ];

            let cellX = 30;
            row.forEach((cell, i) => {
                doc.text(cell, cellX, y, { width: colWidths[i], ellipsis: true });
                cellX += colWidths[i] + 10;
            });

            y += 20;
            if (y > 750) {
                doc.addPage();
                y = tableTop + 20;
                let newX = 30;
                rowData.forEach((header, i) => {
                    doc.text(header, newX, tableTop);
                    newX += colWidths[i] + 10;
                });
            }
        });

        doc.end();
    } catch (error) {
        console.error("Erro ao exportar PDF de relatório do colaborador:", error);
        res.status(500).send("Não foi possível gerar o relatório em PDF.");
    }
});


module.exports = router;