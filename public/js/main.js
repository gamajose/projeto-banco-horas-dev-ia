// Main JavaScript file for Banco de Horas
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initializeNavigation();
    initializeGeneralModals();
    initializeModals();
    initializeForms();
    initializeNotifications();
    initializeTimeDisplay();

    // Funções específicas dos novos modais
    initializeQuickActionsModal();
    initializeSuggestionModal();
  });

  // --- Funcionalidade de navegação e menus (Dropdowns, Sidebar) ---
  function initializeNavigation() {
    const dropdowns = {
      "notifications-btn": "notifications-dropdown",
      "quick-actions-btn": "quick-actions-dropdown",
      "user-menu-btn": "user-menu-dropdown",
    };

    Object.keys(dropdowns).forEach((btnId) => {
      const btn = document.getElementById(btnId);
      const dropdown = document.getElementById(dropdowns[btnId]);

      if (btn && dropdown) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();

          const isCurrentlyOpen = !dropdown.classList.contains("hidden");

          Object.values(dropdowns).forEach((dId) => {
            document.getElementById(dId)?.classList.add("hidden");
          });

          // Se o dropdown clicado NÃO estava aberto, então nós o abrimos
          if (!isCurrentlyOpen) {
            dropdown.classList.remove("hidden");

          // Se for o dropdown de notificações, carrega o seu conteúdo
          if (btnId === "notifications-btn") {
              loadNotifications();
            }
          }
        });
      }
    });

    document.addEventListener("click", function () {
      Object.values(dropdowns).forEach((dropdownId) => {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
          dropdown.classList.add("hidden");
        }
      });
    });

    // Impede que o clique dentro de um menu o feche
    Object.values(dropdowns).forEach((dropdownId) => {
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        dropdown.addEventListener("click", function (e) {
          e.stopPropagation();
        });
      }
    });

    // Lógica da barra lateral móvel
    const mobileNavBtn = document.getElementById("mobile-nav-btn");
    const mobileOverlay = document.getElementById("mobile-overlay");
    const sidebar = document.getElementById("sidebar");
    if (mobileNavBtn && mobileOverlay && sidebar) {
      const closeSidebar = () => {
        sidebar.classList.remove("open");
        mobileOverlay.style.display = "none";
        document.body.style.overflow = "auto";
      };
      mobileNavBtn.addEventListener("click", () => {
        sidebar.classList.add("open");
        mobileOverlay.style.display = "block";
        document.body.style.overflow = "hidden";
      });
      mobileOverlay.addEventListener("click", closeSidebar);
      document.addEventListener(
        "keydown",
        (e) => e.key === "Escape" && closeSidebar()
      );
    }
  }

  // --- Funcionalidade genérica para fechar modais ---
  function initializeGeneralModals() {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document
          .querySelectorAll(".fixed.z-50:not(.hidden)")
          .forEach((modal) => {
            modal.classList.add("hidden");
          });
      }
    });
  }

  // --- Funcionalidade de formulários ---
  function initializeForms() {
    // Auto-calculate total time
    const horaInicialInputs = document.querySelectorAll(
      'input[name="hora_inicial"]'
    );
    const horaFinalInputs = document.querySelectorAll(
      'input[name="hora_final"]'
    );

    horaInicialInputs.forEach((input) => {
      input.addEventListener("change", calculateTotalTime);
    });

    horaFinalInputs.forEach((input) => {
      input.addEventListener("change", calculateTotalTime);
    });

    // Form validation
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      form.addEventListener("submit", function () {
        const submitBtn = form.querySelector(
          'button[type="submit"], input[type="submit"]'
        );
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.disabled = true;
          const originalText = submitBtn.textContent;
          submitBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }, 5000);
        }
      });
    });
  }

  // --- Funcionalidade de notificações ---
  function initializeNotifications() {
    setTimeout(function () {
      const alerts = document.querySelectorAll(".alert");
      alerts.forEach(function (alert) {
        alert.style.transition = "opacity 0.5s ease";
        alert.style.opacity = "0";
        setTimeout(function () {
          alert.remove();
        }, 500);
      });
    }, 5000);
  }

  // --- Funcionalidade do relógio ---
  function initializeTimeDisplay() {
    function updateTime() {
      const now = new Date();
      const timeString = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const timeElement = document.getElementById("current-time");
      if (timeElement) {
        timeElement.textContent = timeString;
      }
    }
    updateTime();
    setInterval(updateTime, 1000);
  }

  // --- Funcionalidade do modal de Ações Rápidas ---
  function initializeQuickActionsModal() {
    const modal = document.getElementById("modal-acao-rapida");
    if (!modal) return;

    const btnEntrada = document.getElementById("acao-registrar-entrada");
    const btnSaida = document.getElementById("acao-registrar-saida");
    const btnClose = document.getElementById("modal-acao-rapida-close");
    const form = document.getElementById("form-acao-rapida");

    const openModal = (config) => {
      modal.querySelector("#modal-acao-rapida-title").textContent =
        config.title;
      modal.querySelector("#acao-rapida-entrada").value = config.entrada;
      modal.querySelector("#acao-rapida-feedback").innerHTML = "";
      form.reset();
      modal.querySelector("#acao-rapida-data").value = new Date()
        .toISOString()
        .split("T")[0];
      modal.classList.remove("hidden");
    };

    const closeModal = () => modal.classList.add("hidden");

    if (btnEntrada)
      btnEntrada.addEventListener("click", () =>
        openModal({ title: "Registrar Entrada de Horas", entrada: "true" })
      );
    if (btnSaida)
      btnSaida.addEventListener("click", () =>
        openModal({ title: "Registrar Saída de Horas", entrada: "false" })
      );
    if (btnClose) btnClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => e.target === modal && closeModal());

    if (form) {
      form.addEventListener("submit", handleFormSubmit);
    }
  }

  // --- Funcionalidade do modal de Sugestão ---
  function initializeSuggestionModal() {
    const modal = document.getElementById("modal-sugestao");
    if (!modal) return;

    const btnOpen = document.getElementById("acao-enviar-sugestao");
    const btnClose = document.getElementById("modal-sugestao-close");
    const form = document.getElementById("form-sugestao");
    const categoriaSelect = document.getElementById("sugestao-categoria");
    const categoriaOutroContainer = document.getElementById(
      "sugestao-categoria-outro-container"
    );

    const openModal = () => {
      form.reset();
      modal.querySelector("#sugestao-feedback").innerHTML = "";
      categoriaOutroContainer.classList.add("hidden");
      modal.classList.remove("hidden");
    };

    const closeModal = () => modal.classList.add("hidden");

    if (btnOpen) btnOpen.addEventListener("click", openModal);
    if (btnClose) btnClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => e.target === modal && closeModal());

    categoriaSelect.addEventListener("change", () => {
      categoriaOutroContainer.classList.toggle(
        "hidden",
        categoriaSelect.value !== "Outro"
      );
    });

    form.addEventListener("submit", handleSuggestionSubmit);
  }

  // --- Funções de Submissão de Formulários (AJAX) ---
  async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const feedbackDiv = form.nextElementSibling;
    const submitBtn = form.querySelector('button[type="submit"]');

    feedbackDiv.textContent = "A enviar...";
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>A enviar...';

    try {
      const response = await fetch("/api/v1/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      feedbackDiv.textContent = "Solicitação enviada!";
      if (window.showNotification)
        window.showNotification(result.message, "success");
      setTimeout(() => form.closest(".fixed").classList.add("hidden"), 1500);
    } catch (error) {
      feedbackDiv.textContent = `Erro: ${error.message}`;
      if (window.showNotification)
        window.showNotification(`Erro: ${error.message}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  async function handleSuggestionSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const feedbackDiv = form.nextElementSibling;
    const submitBtn = form.querySelector('button[type="submit"]');

    feedbackDiv.textContent = "A enviar para o GitHub...";
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>A enviar...';

    try {
      const response = await fetch("/api/v1/sugestao", {
        method: "POST",
        body: new FormData(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      feedbackDiv.textContent = result.message;
      if (window.showNotification)
        window.showNotification(result.message, "success");
      setTimeout(() => form.closest(".fixed").classList.add("hidden"), 3000);
    } catch (error) {
      feedbackDiv.textContent = `Erro: ${error.message}`;
      if (window.showNotification)
        window.showNotification(`Erro: ${error.message}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  // --- LÓGICA PARA MODAL DE AÇÕES RÁPIDAS (ADMIN) ---
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Módulo de Ações Rápidas carregado!");
    const modal = document.getElementById("modal-acao-rapida");
    if (!modal) return;

    // Elementos do Modal
    const title = document.getElementById("modal-acao-rapida-title");
    const form = document.getElementById("form-acao-rapida");
    const feedbackDiv = document.getElementById("acao-rapida-feedback");
    const dataInput = document.getElementById("acao-rapida-data");
    const hiddenInputEntrada = document.getElementById("acao-rapida-entrada");
    const containerTipoAjuste = document.getElementById(
      "container-tipo-ajuste"
    );
    const selectTipoAjuste = document.getElementById("acao-rapida-tipo");

    // Botões que abrem o modal
    const btnEntrada = document.getElementById("acao-registrar-entrada");
    const btnSaida = document.getElementById("acao-registrar-saida");
    const btnAjuste = document.getElementById("acao-solicitar-ajuste");
    const btnClose = document.getElementById("modal-acao-rapida-close");

    const openModal = (config) => {
      title.textContent = config.title;
      hiddenInputEntrada.value = config.entrada;
      feedbackDiv.innerHTML = "";
      form.reset();

      // Preenche a data atual
      const today = new Date();
      dataInput.value = today.toISOString().split("T")[0];

      // Lógica para "Solicitar Ajuste"
      if (config.showTypeSelector) {
        containerTipoAjuste.classList.remove("hidden");
        selectTipoAjuste.setAttribute("name", "entrada");
        hiddenInputEntrada.removeAttribute("name");
      } else {
        containerTipoAjuste.classList.add("hidden");
        hiddenInputEntrada.setAttribute("name", "entrada");
        selectTipoAjuste.removeAttribute("name");
      }
      modal.classList.remove("hidden");
    };

    const closeModal = () => {
      modal.classList.add("hidden");
    };

    // Listeners dos botões
    if (btnEntrada)
      btnEntrada.addEventListener("click", () =>
        openModal({
          title: "Registrar Entrada de Horas",
          entrada: "true",
          showTypeSelector: false,
        })
      );
    if (btnSaida)
      btnSaida.addEventListener("click", () =>
        openModal({
          title: "Registrar Saída de Horas",
          entrada: "false",
          showTypeSelector: false,
        })
      );
    if (btnAjuste)
      btnAjuste.addEventListener("click", () =>
        openModal({
          title: "Solicitar Ajuste de Ponto",
          entrada: "true",
          showTypeSelector: true,
        })
      );

    if (btnClose) btnClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => e.target === modal && closeModal());

    // Listener do formulário
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        feedbackDiv.textContent = "A enviar...";
        feedbackDiv.className = "mt-4 text-sm font-medium text-gray-500";

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
          const response = await fetch("/api/v1/movements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.message || "Ocorreu um erro.");

          feedbackDiv.textContent = "Solicitação enviada com sucesso!";
          feedbackDiv.className = "mt-4 text-sm font-medium text-green-600";

          setTimeout(() => {
            closeModal();
          }, 1500);
        } catch (error) {
          feedbackDiv.textContent = `Erro: ${error.message}`;
          feedbackDiv.className = "mt-4 text-sm font-medium text-red-600";
        }
      });
    }
  });

  // --- Funcionalidade de modais ---
  function initializeModals() {
    // Close modal when clicking on overlay
    document.addEventListener("click", function (e) {
      if (e.target.classList.contains("modal-overlay")) {
        closeModal(e.target.closest(".modal"));
      }
    });

    // Close modal when pressing ESC
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const openModal = document.querySelector(".modal:not(.hidden)");
        if (openModal) {
          closeModal(openModal);
        }
      }
    });
  }

  // --- Funções de utilidade globais ---
  window.showNotification = function (message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl shadow-lg transform translate-x-full transition-transform duration-300`;
    switch (type) {
      case "success":
        notification.classList.add("bg-emerald-500", "text-white");
        break;
      case "error":
        notification.classList.add("bg-red-500", "text-white");
        break;
      case "warning":
        notification.classList.add("bg-amber-500", "text-white");
        break;
      default:
        notification.classList.add("bg-blue-500", "text-white");
    }

    notification.innerHTML = `
            <div class="flex items-center">
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white/80 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.remove("translate-x-full");
    }, 100);
    setTimeout(() => {
      notification.classList.add("translate-x-full");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  };

  window.showLoading = function () {
    document.getElementById("loading-overlay").style.display = "flex";
  };

  window.hideLoading = function () {
    document.getElementById("loading-overlay").style.display = "none";
  };

  function calculateTotalTime() {
    const horaInicial = document.querySelector('input[name="hora_inicial"]');
    const horaFinal = document.querySelector('input[name="hora_final"]');
    const horaTotal = document.querySelector('input[name="hora_total"]');

    if (
      horaInicial &&
      horaFinal &&
      horaTotal &&
      horaInicial.value &&
      horaFinal.value
    ) {
      const inicio = timeToMinutes(horaInicial.value);
      const fim = timeToMinutes(horaFinal.value);
      let diferenca = fim - inicio;
      if (diferenca < 0) {
        diferenca += 24 * 60;
      }
      horaTotal.value = minutesToTime(diferenca);
    }
  }

  function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll("[required]");

    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        showFieldError(field, "Este campo é obrigatório");
        isValid = false;
      } else {
        hideFieldError(field);
      }
    });

    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach((field) => {
      if (field.value && !isValidEmail(field.value)) {
        showFieldError(field, "Email inválido");
        isValid = false;
      }
    });

    const password = form.querySelector('input[name="password"]');
    const passwordConfirm = form.querySelector(
      'input[name="password_confirm"]'
    );

    if (
      password &&
      passwordConfirm &&
      password.value !== passwordConfirm.value
    ) {
      showFieldError(passwordConfirm, "As senhas não coincidem");
      isValid = false;
    }

    return isValid;
  }

  function showFieldError(field, message) {
    hideFieldError(field);

    const errorDiv = document.createElement("div");
    errorDiv.className = "field-error text-red-600 text-sm mt-1";
    errorDiv.textContent = message;

    field.classList.add("border-red-500");
    field.parentNode.appendChild(errorDiv);
  }

  function hideFieldError(field) {
    const existingError = field.parentNode.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }
    field.classList.remove("border-red-500");
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }

  window.BancoDeHoras = {
    showModal,
    closeModal,
    showNotification,
    hideNotification,
    calculateTotalTime,
    validateForm,
  };

  document.addEventListener("DOMContentLoaded", () => {
    const modalSugestao = document.getElementById("modal-sugestao");
    if (!modalSugestao) return;

    const btnAbrirSugestao = document.getElementById("acao-enviar-sugestao");
    const btnFecharSugestao = document.getElementById("modal-sugestao-close");
    const formSugestao = document.getElementById("form-sugestao");
    const categoriaSelect = document.getElementById("sugestao-categoria");
    const categoriaOutroContainer = document.getElementById(
      "sugestao-categoria-outro-container"
    );
    const feedbackDiv = document.getElementById("sugestao-feedback");

    const openModal = () => {
      formSugestao.reset();
      feedbackDiv.innerHTML = "";
      categoriaOutroContainer.classList.add("hidden");
      modalSugestao.classList.remove("hidden");
    };

    const closeModal = () => modalSugestao.classList.add("hidden");

    if (btnAbrirSugestao) btnAbrirSugestao.addEventListener("click", openModal);
    if (btnFecharSugestao)
      btnFecharSugestao.addEventListener("click", closeModal);
    modalSugestao.addEventListener(
      "click",
      (e) => e.target === modalSugestao && closeModal()
    );

    categoriaSelect.addEventListener("change", () => {
      if (categoriaSelect.value === "Outro") {
        categoriaOutroContainer.classList.remove("hidden");
      } else {
        categoriaOutroContainer.classList.add("hidden");
      }
    });

    formSugestao.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = formSugestao.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i>A enviar...';
      feedbackDiv.className = "mt-4 text-sm font-medium text-gray-500";
      feedbackDiv.textContent = "A enviar para o GitHub...";

      const formData = new FormData(formSugestao);

      try {
        const response = await fetch("/api/v1/sugestao", {
          method: "POST",
          body: formData, // FormData lida com 'multipart/form-data' automaticamente
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        feedbackDiv.className = "mt-4 text-sm font-medium text-green-600";
        feedbackDiv.textContent = result.message;

        setTimeout(closeModal, 3000);
      } catch (error) {
        feedbackDiv.className = "mt-4 text-sm font-medium text-red-600";
        feedbackDiv.textContent = `Erro: ${error.message}`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Enviar para o GitHub";
      }
    });
  });
  async function loadNotifications() {
    const container = document.querySelector(
      "#notifications-dropdown .max-h-96"
    );
    if (!container) return;

    // Mostra o estado de "carregando"
    container.innerHTML = `<div class="p-4 text-center text-gray-500 text-sm">Carregando notificações...</div>`;

    try {
      // Reutiliza a API do dashboard que já busca as pendências
      const response = await fetch("/admin/api/dashboard-stats");
      const data = await response.json();

      if (!data.success || !data.pendingMovements) {
        throw new Error("Não foi possível carregar as notificações.");
      }

      // Limpa o container
      container.innerHTML = "";

      if (data.pendingMovements.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 text-sm">Nenhuma notificação nova.</div>`;
      } else {
        data.pendingMovements.forEach((mov) => {
          const notificationHTML = `
                    <a href="/admin/aprovacoes" class="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                        <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                            <i class="fas fa-hourglass-half text-amber-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-800 truncate">${
                              mov.colaborador_nome
                            }</p>
                            <p class="text-xs text-gray-500">
                                solicitou ${mov.hora_total.substring(
                                  0,
                                  5
                                )} horas (${mov.entrada ? "Crédito" : "Débito"})
                            </p>
                        </div>
                    </a>
                `;
          container.innerHTML += notificationHTML;
        });
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      container.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">Erro ao carregar.</div>`;
    }
  }
})();
