const express = require("express");
const { body, validationResult } = require("express-validator");
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Profile = require("../models/Profile");
const upload = require("../config/multer");
const Movement = require('../models/Movement');
const Status = require('../models/Status');

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

// Rota para a página "Gerenciar Horas" do colaborador
router.get('/relatorio', isAuthenticated, async (req, res) => {
    try {
        // Filtro de segurança: força que a busca seja apenas para o ID do perfil do usuário logado
        const filtroSeguro = { colaborador_id: req.userProfile.id };
        const hourBalance = await Profile.calculateHourBalance(req.userProfile.id);
        const todasMovimentacoes = await Movement.findAll(filtroSeguro);
        const todosStatus = await Status.findAll();

        res.render('collaborator/gerenciar-horas', {
            title: 'Gerenciar Horas',
            movimentacoes: todasMovimentacoes,
            status: todosStatus,
            user: req.user,
            hourBalance,
            layout: 'layouts/collaborator',
            activePage: 'gerenciar'
        });
    } catch (error) {
        console.error("Erro ao carregar a página de relatório do colaborador:", error);
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

router.get('/api/relatorio', isAuthenticated, async (req, res) => {
    try {

        const filtroSeguro = { 
            ...req.query,
            colaborador_id: req.userProfile.id
        };

        const movimentacoesFiltradas = await Movement.findAll(filtroSeguro);
        res.json({ success: true, movimentacoes: movimentacoesFiltradas });
    } catch (error) {
        console.error("Erro ao filtrar relatórios do colaborador via API:", error);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados.' });
    }
});

router.get('/relatorio/exportar-csv', isAuthenticated, async (req, res) => {
    try {
        const filtroSeguro = { ...req.query, colaborador_id: req.userProfile.id };
        const movimentacoes = await Movement.findAll(filtroSeguro);
        
        const filename = `meu_relatorio_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.write('\ufeff'); // BOM para o Excel entender a acentuação

        const csvStream = csv.format({ headers: true });
        csvStream.pipe(res);
        movimentacoes.forEach(mov => csvStream.write({
            'Data': new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
            'Tipo': mov.entrada ? 'Crédito' : 'Débito', 'Horas': mov.hora_total,
            'Status': mov.status_nome, 'Motivo': mov.motivo,
        }));
        csvStream.end();
    } catch (error) {
        res.status(500).send("Não foi possível gerar o relatório CSV.");
    }
});

// Rota para exportar para PDF
router.get('/relatorio/exportar-pdf', isAuthenticated, async (req, res) => {
    try {
        const filtroSeguro = { ...req.query, colaborador_id: req.userProfile.id };
        const movimentacoes = await Movement.findAll(filtroSeguro);
        
        const filename = `meu_relatorio_${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        doc.pipe(res);
        // Lógica para gerar o PDF (título, tabela, etc.)
        doc.fontSize(16).text(`Relatório de Movimentações - ${req.userProfile.nome}`, { align: 'center' });
        doc.moveDown();
        // ... (código para desenhar a tabela, como fizemos para o admin)
        doc.end();
    } catch (error) {
        res.status(500).send("Não foi possível gerar o relatório em PDF.");
    }
});

module.exports = router;
