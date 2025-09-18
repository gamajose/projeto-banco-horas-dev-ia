const express = require("express");
const { body, validationResult } = require("express-validator");
const { isAuthenticated, isApiAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Profile = require("../models/Profile");
const upload = require("../config/multer");
const Movement = require('../models/Movement');
const Status = require('../models/Status');
const Escala = require('../models/Escala');
const csv = require('fast-csv');
const PDFDocument = require('pdfkit');

const router = express.Router();


// ROTA PARA LISTAR TODOS OS PERFIS (agora com filtro por setor)
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const profiles = await Profile.findAll(req.query);
        res.json({ success: true, profiles });
    } catch (error) {
        console.error("Erro ao buscar perfis:", error);
        res.status(500).json({ success: false, error: 'Erro ao buscar perfis.' });
    }
});

// Rota para MOSTRAR o formulário de edição de perfil
router.get("/editar", isAuthenticated, async (req, res) => {
  try {
    if (!req.userProfile) {
      return res
        .status(404)
        .render("error", {
          title: "Perfil não encontrado",
          message:
            "Não foi possível encontrar um perfil associado a este usuário.",
        });
    }
    res.render("profile/editar", {
      title: "Editar Meu Perfil",
      user: req.user,
      profile: req.userProfile,
      layout: "layouts/main",
      activePage: 'profile'
    });
  } catch (error) {
    console.error("Erro ao carregar a página de edição de perfil:", error);
    res
      .status(500)
      .render("error", {
        title: "Erro de Servidor",
        message: "Ocorreu um erro ao carregar a página.",
      });
  }
});

// Rota para PROCESSAR os dados do formulário de edição
router.post("/editar", isAuthenticated, [
    body("email").isEmail().withMessage("Por favor, insira um email válido."),
    body("nome").notEmpty().withMessage("O nome completo é obrigatório."),
    // Adicione outras validações se desejar
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("profile/editar", {
        title: "Editar Meu Perfil",
        user: req.user,
        profile: { ...req.userProfile, ...req.body },
        errors: errors.array(),
        layout: "layouts/main",
        activePage: 'profile'
      });
    }

    try {
      const { id: userId } = req.user;
      const { id: profileId } = req.userProfile;

      const userData = { email: req.body.email };
      const profileData = {
        nome: req.body.nome,
        data_nascimento: req.body.data_nascimento || null,
        sexo: req.body.sexo,
        cpf: req.body.cpf,
        telefone: req.body.telefone,
        linkedin: req.body.linkedin,
        cep: req.body.cep,
        logradouro: req.body.logradouro,
        bairro: req.body.bairro,
        cidade: req.body.cidade,
        estado: req.body.estado,
        numero: req.body.numero,
        funcao: req.body.funcao,
      };

      await User.update(userId, userData);
      await Profile.update(profileId, profileData);

      // CRIA A MENSAGEM DE SUCESSO
      req.flash("success_msg", "Perfil atualizado com sucesso!");
      res.redirect("/profile/editar");
    } catch (error) {
      console.error("Erro ao salvar o perfil:", error);
      req.flash("error_msg", "Não foi possível salvar as suas alterações.");
      res.redirect("/profile/editar");
    }
  }
);

// Rota para PROCESSAR o upload da foto
// A rota foi corrigida para /profile/foto para consistência
router.post("/foto", isAuthenticated,
  upload.single("foto"),
  async (req, res) => {
    try {
      if (!req.file) {
        req.flash("error_msg", "Nenhum ficheiro foi selecionado.");
        return res.redirect("/profile/editar");
      }

      const foto_url = `/uploads/${req.file.filename}`;
      await Profile.update(req.userProfile.id, { foto_url });

      req.flash("success_msg", "Foto do perfil atualizada com sucesso!");
      res.redirect("/profile/editar");
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      req.flash("error_msg", "Ocorreu um erro ao fazer o upload da sua foto.");
      res.redirect("/profile/editar");
    }
  }
);

// As rotas de alteração de senha permanecem as mesmas
router.get("/change-password", isAuthenticated, (req, res) => {
  res.render("profile/change-password", {
    title: "Alterar Senha",
    user: req.user,
    errors: [],
    layout: "layouts/main",
    activePage: 'profile'
  });
});

router.post("/change-password", isAuthenticated, [
    body("password")
      .isLength({ min: 6 })
      .withMessage("A nova senha deve ter no mínimo 6 caracteres."),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("As senhas não coincidem.");
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("profile/change-password", {
        title: "Alterar Senha",
        user: req.user,
        errors: errors.array(),
        layout: "layouts/main",
        activePage: 'profile'
      });
    }

    try {
      await User.update(req.user.id, {
        password: req.body.password,
        force_password_change: false,
      });
      res.redirect("/meu-perfil");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      res
        .status(500)
        .render("error", {
          title: "Erro",
          message: "Não foi possível alterar a sua senha.",
        });
    }
  }
);

// Rota para a página "Gerenciar Horas" do colaborador (com ações rápidas)
router.get('/gerenciar', isAuthenticated, async (req, res) => {
    try {
        const filtroSeguro = { colaborador_id: req.userProfile.id };
        const todasMovimentacoes = await Movement.findAll(filtroSeguro);
        const hourBalance = await Profile.calculateHourBalance(req.userProfile.id);

        res.render('collaborator/gerenciar-horas', {
            title: 'Gerenciar Horas',
            movimentacoes: todasMovimentacoes,
            user: req.user,
            userProfile: req.userProfile,
            hourBalance,
            layout: 'layouts/collaborator',
            activePage: 'gerenciar'
        });
    } catch (error) {
        console.error("Erro ao carregar a página de gerenciamento de horas:", error);
        res.status(500).render('error', { title: 'Erro', message: 'Não foi possível carregar a página.' });
    }
});

// Rota para a nova página de Relatório com filtros
router.get('/relatorio', isAuthenticated, async (req, res) => {
    try {
        const todosStatus = await Status.findAll();
        const movimentacoes = await Movement.findAll({ colaborador_id: req.userProfile.id });

        const hourBalance = await Profile.calculateHourBalance(req.userProfile.id);

        res.render('collaborator/relatorios', {
            title: 'Relatório de Horas',
            movimentacoes,
            status: todosStatus,
            hourBalance: hourBalance,
            user: req.user,
            userProfile: req.userProfile,
            layout: 'layouts/collaborator',
            activePage: 'relatorio'
        });
    } catch (error) {
        console.error("Erro ao carregar a página de relatórios do colaborador:", error);
        res.status(500).render('error', { title: 'Erro', message: 'Não foi possível carregar seus relatórios.' });
    }
});


// ROTA PARA A PÁGINA "CENTRAL DE FOLGAS"
router.get('/folgas', isAuthenticated, async (req, res) => {
    try {
        const filtro = { colaborador_id: req.userProfile.id, entrada: false };
        const movimentacoesDeFolga = await Movement.findAll(filtro);
        const hourBalance = await Profile.calculateHourBalance(req.userProfile.id);

        res.render('collaborator/folgas', {
            title: 'Central de Folgas',
            movimentacoes: movimentacoesDeFolga,
            hourBalance,
            user: req.user,
            layout: 'layouts/collaborator',
            activePage: 'folga'
        });
    } catch (error) {
        res.status(500).render('error', { title: 'Erro', message: 'Não foi possível carregar a página.' });
    }
});

// Rota de API para filtrar os relatórios do colaborador
router.get('/api/relatorio', isAuthenticated, async (req, res) => {
    try {
        const filtroSeguro = {
            ...req.query,
            colaborador_id: req.userProfile.id
        };

        const movimentacoesFiltradas = await Movement.findAll(filtroSeguro);

        // Lógica para calcular os totais do período filtrado
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
        console.error("Erro ao filtrar relatórios do colaborador via API:", error);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados.' });
    }
});

// Rota para exportar o relatório do colaborador em PDF
router.get('/relatorio/exportar-pdf', isAuthenticated, async (req, res) => {
    try {
        const { data_inicio, data_fim, status_id } = req.query;
        const profileId = req.userProfile.id;

        const filters = { colaborador_id: profileId, data_inicio, data_fim, status_id };
        const movimentacoes = await Movement.findAll(filters);

        const filename = `relatorio_movimentacoes_${new Date().toISOString().split("T")[0]}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 30, size: "A4" });
        doc.pipe(res);

        doc.fontSize(16).text("Relatório de Movimentações", { align: "center" });
        doc.fontSize(12).text(`Colaborador: ${req.userProfile.nome}`, { align: "center" });
        doc.moveDown();

        let totalHorasPositivas = 0;
        let totalHorasNegativas = 0;
        movimentacoes.forEach(mov => {
            if (mov.status_nome === 'Aprovado') {
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

        doc.fontSize(12).font("Helvetica-Bold").text('Resumo de Horas Aprovadas (Período Filtrado)');
        doc.fontSize(10).font("Helvetica").text(`Total de Créditos: +${formatTotalMinutes(totalHorasPositivas)} | Total de Débitos: -${formatTotalMinutes(totalHorasNegativas)}`);
        doc.fontSize(10).font("Helvetica-Bold").text(`Saldo do Período: ${sign}${formatTotalMinutes(absSaldoGeral)}`);
        doc.moveDown(2);

        const tableTop = doc.y;
        const rowData = ["Data", "Tipo", "Horas", "Status", "Motivo"];
        const colWidths = [70, 50, 50, 80, 200];
        
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

// ROTA PARA RENDERIZAR A PÁGINA "MINHA ESCALA"
router.get('/escala', isAuthenticated, async (req, res) => {
    try {
        res.render('collaborator/escala', {
            title: 'Minha Escala',
            layout: 'layouts/collaborator', // Usando o layout do colaborador
            user: req.user,
            userProfile: req.userProfile,
            activePage: 'escala' // Para o botão de navegação ficar ativo
        });
    } catch (error) {
        console.error("Erro ao carregar a página da minha escala:", error);
        res.status(500).render('error', { title: 'Erro', message: 'Não foi possível carregar a sua escala.' });
    }
});

// ROTA DE API PARA BUSCAR OS DADOS DA ESCALA DO COLABORADOR LOGADO
router.get('/api/escala', isApiAuthenticated, async (req, res) => {
    try {
        const { ano, mes } = req.query;
        if (!ano || !mes) {
            return res.status(400).json({ success: false, message: 'Ano e mês são obrigatórios.' });
        }

        const profileId = req.userProfile.id; // Pega o ID do utilizador logado de forma segura

        // Usaremos um novo método que busca a escala por perfil e por mês
        const escalas = await Escala.findByProfileAndMonth(profileId, ano, mes);

        // Lógica de aniversário (opcional, mas um detalhe simpático)
        const aniversariantes = [];
        if (req.userProfile.data_nascimento && new Date(req.userProfile.data_nascimento).getUTCMonth() + 1 === parseInt(mes)) {
            aniversariantes.push({
                perfil_id: profileId,
                dia: new Date(req.userProfile.data_nascimento).getUTCDate()
            });
        }

        res.json({ success: true, escalas, aniversariantes });

    } catch (error) {
        console.error("Erro ao buscar dados da escala do colaborador via API:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});


module.exports = router;
