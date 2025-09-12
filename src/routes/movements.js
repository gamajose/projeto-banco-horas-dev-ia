const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  isAuthenticated,
  requireManager,
  isApiAuthenticated,
} = require("../middleware/auth");
const Movement = require("../models/Movement");
const NotificationService = require("../notificationService");
const Profile = require("../models/Profile");
const Status = require("../models/Status");
const MovementLog = require("../models/MovementLog");

const router = express.Router();

// Rota para CRIAR uma nova movimentação (Lançar Horas via Modal)
console.log("isApiAuthenticated:", typeof isApiAuthenticated);

router.get("/:id", isApiAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const movement = await Movement.findById(id);

    if (!movement) {
      return res
        .status(404)
        .json({ success: false, message: "Movimentação não encontrada." });
    }

    // Retorna todos os detalhes, incluindo o nome do colaborador e setor
    res.json({ success: true, movement });
  } catch (error) {
    console.error("Erro ao buscar movimentação por ID:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro interno do servidor." });
  }
});

router.post(
  "/",
  isApiAuthenticated,
  body("data_movimentacao")
    .isISO8601()
    .withMessage("Data da movimentação inválida"),
  body("entrada").isBoolean().withMessage("Entrada deve ser um valor booleano"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Dados inválidos.", details: errors.array() });
      }

      const {
        data_movimentacao,
        hora_total,
        motivo,
        entrada,
        hora_inicial,
        hora_final,
        forma_pagamento_id,
        colaborador_id,
      } = req.body;

      const targetProfileId =
        req.user.is_staff && colaborador_id
          ? colaborador_id
          : req.userProfile.id;

      const pendingStatus = await Status.findByName("Pendente");
      if (!pendingStatus) {
        return res
          .status(500)
          .json({ message: 'Status "Pendente" não configurado no sistema.' });
      }

      const movementData = {
        data_movimentacao,
        hora_inicial,
        hora_final,
        hora_total,
        motivo,
        entrada,
        forma_pagamento_id,
        status_id: pendingStatus.id,
        colaborador_id: targetProfileId,
      };

      // 1. Salva as informações críticas no banco de dados
      const newMovement = await Movement.create(movementData);
      await MovementLog.logMovementCreation(newMovement.id, req.userProfile.id);

      // 2. Envia a resposta de sucesso IMEDIATAMENTE para o cliente
      res.status(201).json({
        success: true,
        message: "Movimentação enviada para aprovação!",
        movement: newMovement,
      });

      // 3. Inicia o envio do e-mail em segundo plano, sem esperar pela sua conclusão
      // Usamos uma função assíncrona auto-invocada (IIFE) para isso.
      (async () => {
        try {
          const collaboratorProfile = await Profile.findById(targetProfileId);
          if (req.user.is_staff && colaborador_id) {
            const adminPerformer = req.user;
            await NotificationService.adminMovementCreationToCollaborator(
              newMovement,
              collaboratorProfile,
              adminPerformer
            );
          } else {
            await NotificationService.newMovementToAdmins(
              newMovement,
              req.userProfile
            );
          }
        } catch (emailError) {
          // Se o envio do e-mail falhar, apenas registramos o erro no console.
          // A operação principal já foi bem-sucedida para o usuário.
          console.error("BACKGROUND_EMAIL_ERROR: Falha ao enviar notificação por e-mail na criação da movimentação.", emailError);
        }
      })();
      // Fim da lógica de e-mail em segundo plano

    } catch (error) {
      console.error("Erro ao criar movimentação:", error);
      res
        .status(500)
        .json({ message: "Erro interno do servidor ao criar movimentação." });
    }
  }
);
// Atualizar movimentação
router.put(
  "/:id",
  [
    isAuthenticated,
    // Adicione validações se necessário
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body; // { motivo, data_movimentacao, etc. }

      const existingMovement = await Movement.findById(id);
      if (!existingMovement) {
        return res.status(404).json({ error: "Movimentação não encontrada" });
      }

      // Adicione aqui a sua lógica de permissão para editar

      // Atualiza a movimentação
      const updatedMovement = await Movement.update(id, updateData);

      // Cria o log da alteração
      if (req.userProfile) {
        await MovementLog.logMovementUpdate(id, req.userProfile.id, updateData);
      }

      res.json({
        success: true,
        message: "Movimentação atualizada com sucesso",
        movement: updatedMovement,
      });
    } catch (error) {
      console.error("Erro ao atualizar movimentação:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// ROTA PARA COLABORADOR SOLICITAR FOLGA OU HORAS
router.post("/solicitar-folga", isApiAuthenticated, async (req, res) => {
  try {
    const { tipo_folga, data_folga, horas_parciais, motivo } = req.body;
    const profileId = req.userProfile.id;

    // 1. Buscar o saldo atual e a carga horária do colaborador
    const balance = await Profile.calculateHourBalance(profileId);
    const dailyWorkMinutes = await Profile.getDailyWorkHoursInMinutes(
      profileId
    );

    // 2. Validar se o colaborador tem saldo positivo
    if (balance.total_minutes <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Você não possui saldo de horas positivo para solicitar uma folga.",
      });
    }

    let minutosASeremDebitado = 0;
    let horaTotalFormatada = "00:00";

    if (tipo_folga === "integral") {
      minutosASeremDebitado = dailyWorkMinutes;
      // Valida se tem saldo para um dia inteiro
      if (balance.total_minutes < dailyWorkMinutes) {
        return res.status(400).json({
          success: false,
          message: "Saldo de horas insuficiente para uma folga integral.",
        });
      }
      const hours = Math.floor(dailyWorkMinutes / 60)
        .toString()
        .padStart(2, "0");
      const minutes = (dailyWorkMinutes % 60).toString().padStart(2, "0");
      horaTotalFormatada = `${hours}:${minutes}`;
    } else if (tipo_folga === "parcial") {
      const [h, m] = horas_parciais.split(":").map(Number);
      minutosASeremDebitado = h * 60 + m;
      // Valida se o pedido é válido e se tem saldo
      if (minutosASeremDebitado <= 0) {
        return res.status(400).json({
          success: false,
          message: "A quantidade de horas parciais deve ser maior que zero.",
        });
      }
      if (balance.total_minutes < minutosASeremDebitado) {
        return res.status(400).json({
          success: false,
          message:
            "Saldo de horas insuficiente para a quantidade de horas solicitada.",
        });
      }
      horaTotalFormatada = horas_parciais;
    }

    // 3. Se todas as regras passaram, cria a movimentação de débito
    const pendingStatus = await Status.findByName("Pendente");
    const movementData = {
      data_movimentacao: data_folga,
      hora_total: horaTotalFormatada,
      motivo: `Solicitação de Folga: ${motivo}`,
      entrada: false, // É um débito
      status_id: pendingStatus.id,
      colaborador_id: profileId,
    };

    const newMovement = await Movement.create(movementData);
    await MovementLog.logMovementCreation(newMovement.id, profileId);

    res.status(201).json({
      success: true,
      message: "Solicitação de folga enviada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao solicitar folga:", error);
    res.status(500).json({
      success: false,
      message: "Ocorreu um erro interno no servidor.",
    });
  }
});

module.exports = router;
