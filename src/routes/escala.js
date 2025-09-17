const express = require('express');
const { isAuthenticated, requireStaff } = require('../middleware/auth');
const Profile = require('../models/Profile');
const Escala = require('../models/Escala');
const PDFDocument = require('pdfkit')

const router = express.Router();

// Rota para RENDERIZAR a página de gestão de escalas
router.get('/', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const colaboradores = await Profile.findAll();
        res.render('admin/escala', {
            title: 'Gestão de Escalas',
            layout: 'layouts/main',
            activePage: 'escala',
            user: req.user,
            userProfile: req.userProfile,
            colaboradores: colaboradores,
        });
    } catch (error) {
        console.error("Erro ao carregar página de escalas:", error);
        // Tratar erro
    }
});

// --- ROTAS DE API PARA O CALENDÁRIO INTERATIVO ---

// Rota da API para BUSCAR os dados de uma escala de um mês específico
router.get('/api', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const { ano, mes } = req.query;
        if (!ano || !mes) {
            return res.status(400).json({ success: false, message: 'Ano e mês são obrigatórios.' });
        }
        
        const escalas = await Escala.findByMonth(ano, mes);
        
        // Vamos também buscar os aniversariantes do mês para facilitar no frontend
        const colaboradores = await Profile.findAll();
        const aniversariantes = colaboradores
            .filter(c => c.data_nascimento && new Date(c.data_nascimento).getUTCMonth() + 1 === parseInt(mes))
            .map(c => ({
                perfil_id: c.id,
                dia: new Date(c.data_nascimento).getUTCDate()
            }));

        res.json({ success: true, escalas, aniversariantes });

    } catch (error) {
        console.error("Erro ao buscar dados da escala via API:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// Rota da API para SALVAR (criar ou atualizar) uma entrada na escala
router.post('/api', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const escala = await Escala.upsert(req.body);
        res.status(201).json({ success: true, message: 'Escala salva com sucesso!', escala });
    } catch (error) {
        console.error("Erro ao salvar escala via API:", error);
        res.status(500).json({ success: false, message: 'Erro ao salvar a escala.' });
    }
});

// Rota da API para APAGAR uma entrada na escala
router.delete('/api', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const { perfil_id, data } = req.body;
        const deleted = await Escala.delete(perfil_id, data);
        if (deleted) {
            res.json({ success: true, message: 'Escala removida com sucesso!' });
        } else {
            res.status(404).json({ success: false, message: 'Escala não encontrada para remover.' });
        }
    } catch (error) {
        console.error("Erro ao apagar escala via API:", error);
        res.status(500).json({ success: false, message: 'Erro ao remover a escala.' });
    }
});

// Rota da API para SALVAR um período de FÉRIAS em lote
router.post('/api/ferias', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const { perfil_id, data_inicio, data_fim } = req.body;
        if (!perfil_id || !data_inicio || !data_fim) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
        }

        let diaAtual = new Date(data_inicio + 'T00:00:00');
        const dataFim = new Date(data_fim + 'T00:00:00');

        if (diaAtual > dataFim) {
             return res.status(400).json({ success: false, message: 'A data de início não pode ser posterior à data de fim.' });
        }

        // Itera sobre cada dia no intervalo
        while (diaAtual <= dataFim) {
            await Escala.upsert({
                perfil_id: perfil_id,
                data: diaAtual.toISOString().split('T')[0],
                tipo_escala: 'Férias',
                hora_inicio: null,
                hora_fim: null,
                observacoes: 'Período de Férias'
            });
            // Avança para o próximo dia
            diaAtual.setUTCDate(diaAtual.getUTCDate() + 1);
        }

        res.status(201).json({ success: true, message: 'Período de férias lançado com sucesso!' });

    } catch (error) {
        console.error("Erro ao lançar férias via API:", error);
        res.status(500).json({ success: false, message: 'Erro ao lançar o período de férias.' });
    }
});

//Exportar a escala do mês como PDF
router.get('/exportar-pdf', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const { ano, mes } = req.query;
        if (!ano || !mes) return res.status(400).send('Ano e mês são obrigatórios.');

        // 1. Obter dados
        const colaboradores = await Profile.findAll();
        const escalas = await Escala.findByMonth(ano, mes);
        const feriados = {
            '1-1': 'Ano Novo', '4-21': 'Tiradentes', '5-1': 'Dia do Trabalho',
            '9-7': 'Independência', '10-12': 'N. S. Aparecida', '11-2': 'Finados',
            '11-15': 'Procl. República', '12-25': 'Natal'
        };

        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 25 });
        const filename = `Escala-${ano}-${mes}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // --- CABEÇALHO PROFISSIONAL ---
        const dataReferencia = new Date(ano, mes - 1);
        const nomeMes = dataReferencia.toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
        
        doc.rect(0, 0, doc.page.width, 50).fill('#dc2626');
        try {
            // AJUSTE: Usando o logo branco que você tem.
            doc.image('public/uploads/user-1-1757627256904-77402676.png', 30, 10, { width: 30 });
        } catch (e) {
            console.error("Não foi possível carregar o logo para o PDF.");
        }
        
        doc.fontSize(16).font('Helvetica-Bold').fillColor('white').text(`Red Innovations - Escala de Suporte - ${nomeMes} de ${ano}`, 75, 18);
        doc.y = 75;

        // --- GRELHA FINAL COM TODOS OS AJUSTES ---
        const tableTop = doc.y;
        const colabWidth = 140;
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const dayWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - colabWidth) / diasNoMes;
        const rowHeight = 35; // Aumentei a altura para as horas caberem

        // Cabeçalho dos dias
        let currentX = doc.page.margins.left;
        doc.rect(currentX, tableTop, colabWidth, rowHeight).fillAndStroke('#E5E7EB', '#9CA3AF');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('black').text('Colaborador', currentX + 5, tableTop + 13);
        
        currentX += colabWidth;
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const data = new Date(ano, mes - 1, dia);
            const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3);
            doc.rect(currentX, tableTop, dayWidth, rowHeight).fillAndStroke('#E5E7EB', '#9CA3AF');
            doc.fillColor('black').font('Helvetica-Bold').fontSize(8).text(diaSemana, currentX, tableTop + 8, { width: dayWidth, align: 'center' });
            doc.font('Helvetica').fontSize(8).text(String(dia), currentX, tableTop + 18, { width: dayWidth, align: 'center' });
            currentX += dayWidth;
        }

        // Linhas dos colaboradores
        let currentY = tableTop + rowHeight;
        
        colaboradores.forEach(colab => {
            doc.rect(doc.page.margins.left, currentY, colabWidth, rowHeight).fillAndStroke('white', '#9CA3AF');
            const nomeColab = `${colab.first_name || ''} ${colab.last_name || ''}`;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('black').text(nomeColab.trim(), doc.page.margins.left + 5, currentY + 8);
            doc.fontSize(7).font('Helvetica').text(colab.funcao || 'N/D', doc.page.margins.left + 5, currentY + 18);
            
            let dayX = doc.page.margins.left + colabWidth;
            for (let dia = 1; dia <= diasNoMes; dia++) {
                const data = new Date(ano, mes - 1, dia);
                const isWeekend = [0, 6].includes(data.getDay());
                const isFeriado = !!feriados[`${parseInt(mes)}-${dia}`];
                const dataStr = `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
                const escalaDoDia = escalas.find(e => e.data && e.perfil_id === colab.id && e.data.toISOString().split('T')[0] === dataStr);
                
                let cellContent = '';
                let fillColor = 'white';
                let textColor = 'black';
                let fontSize = 9;

                if (isWeekend) fillColor = '#FEF9C3';
                if (isFeriado) fillColor = '#DBEAFE';
                
                if (escalaDoDia) {
                    switch(escalaDoDia.tipo_escala) {
                        case 'Trabalho':
                            fillColor = '#D1FAE5'; textColor = '#065F46'; fontSize = 7;
                            cellContent = `${(escalaDoDia.hora_inicio || '').substring(0,5)}\n-\n${(escalaDoDia.hora_fim || '').substring(0,5)}`;
                            break;
                        case 'Folga':
                            fillColor = '#FECACA'; textColor = 'black'; cellContent = 'F';
                            break;
                        case 'Férias':
                            fillColor = '#E9D5FF'; textColor = 'black'; cellContent = 'FR';
                            break;
                        case 'Standby':
                            fillColor = '#FDBA74'; textColor = 'black'; cellContent = 'ST';
                            break;
                    }
                }
                
                doc.rect(dayX, currentY, dayWidth, rowHeight).fillAndStroke(fillColor, '#9CA3AF');
                doc.fillColor(textColor).font('Helvetica-Bold').fontSize(fontSize).text(cellContent, dayX, currentY + 7, { width: dayWidth, align: 'center' });
                
                dayX += dayWidth;
            }
            currentY += rowHeight;
        });
        
        // --- LEGENDA NA MESMA PÁGINA ---
        doc.y = currentY + 25;
        if (doc.y + 60 > doc.page.height) { doc.addPage(); doc.y = doc.page.margins.top; }

        doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('Legenda:', doc.page.margins.left, doc.y);
        const legendItems = [
            { color: '#D1FAE5', text: 'Trabalho'}, { color: '#FECACA', text: 'F - Folga'},
            { color: '#E9D5FF', text: 'FR - Férias'}, { color: '#FDBA74', text: 'ST - Standby'},
            { color: '#DBEAFE', text: 'Feriado'}, { color: '#FEF9C3', text: 'Fim de Semana'}
        ];
        let legendY = doc.y + 15;
        let legendX = doc.page.margins.left;
        doc.fontSize(8).font('Helvetica');
        legendItems.forEach(item => {
            if (legendX + 130 > doc.page.width - doc.page.margins.right) {
                legendY += 20;
                legendX = doc.page.margins.left;
            }
            doc.rect(legendX, legendY, 15, 15).fillAndStroke(item.color, 'black');
            doc.fillColor('black').text(item.text, legendX + 20, legendY + 4);
            legendX += 130;
        });

        doc.end();

    } catch (error) {
        console.error("Erro ao gerar PDF da escala:", error);
        res.status(500).send("Erro ao gerar o PDF. Verifique os logs do servidor para mais detalhes.");
    }
});

module.exports = router;