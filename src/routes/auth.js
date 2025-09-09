const express = require("express");
const jwt = require('jsonwebtoken'); 
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { generateToken } = require("../utils/jwt");

const router = express.Router();

// ROTA PARA MOSTRAR A PÁGINA DE LOGIN (GET)
router.get('/login', (req, res) => {
    // Se o utilizador já estiver logado, redireciona para o dashboard
    if (req.cookies.token) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', {
        title: 'Login',
        error_msg: req.flash('error_msg')
    });
});

// ROTA PARA PROCESSAR O LOGIN (POST)
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        // Procura o utilizador tanto por email quanto por username
        const user = await User.findByLogin(login);

        // Se o utilizador não for encontrado ou a senha estiver incorreta...
        if (!user || !(await user.comparePassword(password))) {
            req.flash('error_msg', 'Email/usuário ou senha inválidos.');
            return res.redirect('/auth/login');
        }

        // Se o utilizador estiver inativo...
        if (!user.is_active) {
            req.flash('error_msg', 'Esta conta foi desativada. Entre em contato com o administrador.');
            return res.redirect('/auth/login');
        }

        // Se tudo estiver correto, cria o token JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '1d', // O token expira em 1 dia
        });

        // Define o token num cookie seguro
        res.cookie('token', token, {
            httpOnly: true, // O cookie não pode ser acedido por JavaScript no navegador
            secure: process.env.NODE_ENV === 'production', // Use https em produção
            maxAge: 24 * 60 * 60 * 1000, // 1 dia em milissegundos
        });

        // Redireciona para o dashboard
        res.redirect('/dashboard');

    } catch (error) {
        console.error("Erro no processo de login:", error);
        req.flash('error_msg', 'Ocorreu um erro interno. Por favor, tente novamente.');
        res.redirect('/auth/login');
    }
});

// ROTA PARA FAZER LOGOUT
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/auth/login');
});



// ROTA PARA MOSTRAR O FORMULÁRIO DE PEDIDO (GET)
router.get('/esqueci-senha', (req, res) => {
    res.render('auth/esqueci-senha', {
        title: 'Recuperar Senha',
        layout: false,
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// ROTA PARA PROCESSAR O PEDIDO E ENVIAR O EMAIL (POST)
router.post('/esqueci-senha', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);

        // Mesmo que o utilizador não exista, damos uma resposta genérica por segurança
        if (!user) {
            req.flash('success_msg', 'Se um utilizador com esse email existir no nosso sistema, um link de recuperação foi enviado.');
            return res.redirect('/auth/esqueci-senha');
        }

        // Gerar e salvar o token
        const token = await User.generatePasswordResetToken(user.id);

        // Enviar o email
        const resetURL = `http://${req.headers.host}/auth/resetar-senha/${token}`;

        await mailer.sendMail({
            to: email,
            from: process.env.EMAIL_USER,
            subject: 'Redefinição de Senha - Banco de Horas',
            html: `<p>Você solicitou uma redefinição de senha. Por favor, clique no link a seguir para continuar: <a href="${resetURL}">${resetURL}</a></p>
                   <p>Este link é válido por 1 hora.</p>`
        });

        req.flash('success_msg', 'Se um utilizador com esse email existir no nosso sistema, um link de recuperação foi enviado.');
        res.redirect('/auth/esqueci-senha');

    } catch (error) {
        console.error("Erro ao processar esqueci a senha:", error);
        req.flash('error_msg', 'Ocorreu um erro. Por favor, tente novamente.');
        res.redirect('/auth/esqueci-senha');
    }
});

module.exports = router;