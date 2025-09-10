// Ficheiro: src/routes/sugestao.js

const express = require('express');
const { isApiAuthenticated, requireStaff } = require('../middleware/auth');
const upload = require('../config/multer'); // Usaremos o multer para o anexo

const router = express.Router();

// Usamos upload.single('anexo') para processar o ficheiro
router.post('/', isApiAuthenticated, requireStaff, upload.single('anexo'), async (req, res) => {
    try {
        const { nome, categoria, categoria_outro, detalhes } = req.body;
        
        let issueTitle = '';
        const finalCategory = categoria === 'Outro' ? categoria_outro : categoria;
        
        // Criamos um título mais descritivo
        issueTitle = `[Sugestão] ${finalCategory}: Enviado por ${nome}`;

        let issueBody = `
**Enviado por:** ${nome}
**Categoria:** ${finalCategory}

---

### Detalhes:
${detalhes}
        `;

        // Se houver um anexo, adicionamos o link no corpo da issue
        if (req.file) {
            // O URL dependerá de como a sua aplicação está hospedada
            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            issueBody += `

---
### Anexo:
[Ver anexo](${fileUrl})
            `;
        }
        
        const githubResponse = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody,
                labels: ['feedback', categoria.toLowerCase()] // Adiciona etiquetas à issue
            })
        });

        const githubResult = await githubResponse.json();

        if (!githubResponse.ok) {
            throw new Error(`Erro do GitHub: ${githubResult.message || 'Falha ao criar a issue.'}`);
        }

        res.status(201).json({ success: true, message: `Sugestão enviada com sucesso! Issue #${githubResult.number} criada no GitHub.` });

    } catch (error) {
        console.error("Erro ao enviar sugestão para o GitHub:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;