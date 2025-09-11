// Ficheiro: src/notificationService.js

const mailer = require('./config/mailer');
const User = require('./models/User');

class NotificationService {
    /**
     * Envia um e-mail para todos os administradores sobre uma nova solicitação.
     */
    static async newMovementToAdmins(movement, collaborator) {
        try {
            const admins = await User.findAllAdmins();
            if (!admins || admins.length === 0) return;

            const adminEmails = admins.map(admin => admin.email);
            const subject = `Nova Solicitação de Horas de ${collaborator.nome}`;
            const html = `
                <p>Olá Administrador,</p>
                <p>Uma nova solicitação de horas foi feita por <strong>${collaborator.nome}</strong> e aguarda a sua aprovação.</p>
                <ul>
                    <li><strong>Data:</strong> ${new Date(movement.data_movimentacao).toLocaleDateString('pt-BR')}</li>
                    <li><strong>Horas:</strong> ${movement.hora_total} (${movement.entrada ? 'Crédito' : 'Débito'})</li>
                    <li><strong>Motivo:</strong> ${movement.motivo}</li>
                </ul>
                <p>Pode aprovar ou rejeitar esta solicitação no painel de administração.</p>
            `;

            await mailer.sendMail({
                to: adminEmails.join(','),
                from: process.env.EMAIL_USER,
                subject,
                html,
            });
        } catch (error) {
            console.error('Erro ao enviar e-mail de nova movimentação para admins:', error);
        }
    }

    /**
     * Notifica um colaborador sobre a mudança de status de sua solicitação.
     */
    static async movementStatusToCollaborator(movement, collaborator, adminPerformer, status) {
         try {
            const subject = `Sua Solicitação de Horas foi ${status}`;
            const html = `
                <p>Olá ${collaborator.first_name},</p>
                <p>A sua solicitação de horas do dia ${new Date(movement.data_movimentacao).toLocaleDateString('pt-BR')} foi <strong>${status}</strong>.</p>
                <p>A ação foi realizada por: <strong>${adminPerformer.first_name} ${adminPerformer.last_name}</strong>.</p>
                <p><strong>Detalhes da Solicitação:</strong></p>
                <ul>
                    <li><strong>Horas:</strong> ${movement.hora_total}</li>
                    <li><strong>Motivo:</strong> ${movement.motivo}</li>
                </ul>
            `;

            await mailer.sendMail({
                to: collaborator.email,
                from: process.env.EMAIL_USER,
                subject,
                html,
            });
        } catch (error) {
            console.error('Erro ao enviar e-mail de status para o colaborador:', error);
        }
    }

    /**
     * Notifica um colaborador que um admin criou uma movimentação em seu nome.
     */
    static async adminMovementCreationToCollaborator(movement, collaborator, adminPerformer) {
        try {
            const subject = `Uma nova movimentação de horas foi registada para si`;
            const html = `
                <p>Olá ${collaborator.first_name},</p>
                <p>O administrador <strong>${adminPerformer.first_name} ${adminPerformer.last_name}</strong> registou uma nova movimentação de horas em seu nome.</p>
                 <p><strong>Detalhes da Movimentação:</strong></p>
                <ul>
                    <li><strong>Data:</strong> ${new Date(movement.data_movimentacao).toLocaleDateString('pt-BR')}</li>
                    <li><strong>Horas:</strong> ${movement.hora_total} (${movement.entrada ? 'Crédito' : 'Débito'})</li>
                    <li><strong>Motivo:</strong> ${movement.motivo}</li>
                </ul>
                <p>Esta movimentação já foi <strong>aprovada</strong>.</p>
            `;

             await mailer.sendMail({
                to: collaborator.email,
                from: process.env.EMAIL_USER,
                subject,
                html,
            });

        } catch(error) {
             console.error('Erro ao notificar colaborador sobre lançamento do admin:', error);
        }
    }
}

module.exports = NotificationService;